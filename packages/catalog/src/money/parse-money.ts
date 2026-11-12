import type { Money } from "../product-snapshot.ts";

// ISO 4217 codes shoppers see written out ("EUR 12,99", "12.99 USD"). A fixed list, so words such as
// "MRP" or "for" are never mistaken for a currency.
const CURRENCY_CODES = new Set([
  "AED", "AUD", "BRL", "CAD", "CHF", "CNY", "CZK", "DKK", "EUR", "GBP", "HKD", "HUF", "IDR", "ILS", "INR",
  "JPY", "KRW", "MXN", "MYR", "NOK", "NZD", "PHP", "PLN", "RUB", "SAR", "SEK", "SGD", "THB", "TRY", "USD",
  "VND", "ZAR",
]); // prettier-ignore
const CURRENCY_CODE = /(?<![A-Za-z])[A-Z]{3}(?![A-Za-z])/g;

interface CurrencySymbol {
  readonly pattern: RegExp;
  /** Currencies written with this symbol; the first is the default when the fallback is not among them. */
  readonly codes: readonly string[];
}

// Most specific first: "US $" and "C$" must win over the bare "$".
const CURRENCY_SYMBOLS: readonly CurrencySymbol[] = [
  { pattern: /US\s?\$/, codes: ["USD"] },
  { pattern: /(?:CA|C)\$/, codes: ["CAD"] },
  { pattern: /(?:AU|A)\$/, codes: ["AUD"] },
  { pattern: /NZ\$/, codes: ["NZD"] },
  { pattern: /HK\$/, codes: ["HKD"] },
  { pattern: /S\$/, codes: ["SGD"] },
  { pattern: /R\$/, codes: ["BRL"] },
  { pattern: /MX\$/, codes: ["MXN"] },
  { pattern: /CN¥|元/, codes: ["CNY"] },
  { pattern: /₹|(?<![A-Za-z])Rs\.?(?![A-Za-z])/, codes: ["INR"] },
  { pattern: /€/, codes: ["EUR"] },
  { pattern: /£/, codes: ["GBP"] },
  { pattern: /¥|円/, codes: ["JPY", "CNY"] },
  { pattern: /₽|(?<![A-Za-z])руб/, codes: ["RUB"] },
  { pattern: /zł/i, codes: ["PLN"] },
  { pattern: /Kč/, codes: ["CZK"] },
  { pattern: /(?<![A-Za-z])kr\.?(?![A-Za-z])/i, codes: ["SEK", "NOK", "DKK"] },
  { pattern: /₩/, codes: ["KRW"] },
  { pattern: /₺/, codes: ["TRY"] },
  { pattern: /₪/, codes: ["ILS"] },
  { pattern: /฿/, codes: ["THB"] },
  { pattern: /\$/, codes: ["USD", "CAD", "AUD", "NZD", "SGD", "HKD", "MXN"] },
];

// Non-breaking, narrow and thin spaces all separate thousands somewhere ("1 299,00 zł").
const SPACE_LIKE = /[    ]/g;
// "2 for $5", "3 for 2", "Buy 2 for ₹999": a deal, not one item's price.
const MULTI_BUY = /^\D{0,12}\d+\s*for\s*\D{0,4}\d/i;
// The low end of "$10.00 – $15.00" or "₹499 to ₹999".
const RANGE_SEPARATOR = /\s*[–—]\s*|\s+-\s+|\s+to\s+/i;
// Digits with thousands or decimal separators; a space only counts when a group of three follows.
const AMOUNT_TOKEN = /\d+(?:(?:[.,'’]|\s(?=\d{3}(?!\d)))\d+)*/;
const GROUPING_MARKS = /[\s'’]/g;

/**
 * Parses a displayed price such as "₹1,24,900.00" into a Money value. Understands Indian and Western
 * grouping, decimal commas ("1.299,00 €"), space and apostrophe thousands, currency codes and prefixed
 * symbols ("US $12.99", "R$ 59,90"), and takes the low end of a range. Returns null when the text has no
 * amount, is a multi-buy deal ("2 for $5"), or has no currency and no fallback.
 *
 * @example parseMoney("₹1,24,900") // { amount: 124900, currency: "INR" }
 * @example parseMoney("1.299,00 €") // { amount: 1299, currency: "EUR" }
 */
export function parseMoney(display: string, fallbackCurrency?: string): Money | null {
  const clean = display.replace(SPACE_LIKE, " ");
  if (MULTI_BUY.test(clean)) return null;
  const currency = detectCurrency(clean, fallbackCurrency) ?? fallbackCurrency;
  const amount = parseAmount(clean.split(RANGE_SEPARATOR)[0] ?? "");
  if (currency === undefined || amount === null) return null;
  return { amount, currency };
}

/**
 * The first amount in a text, reading its separators the way the text writes them; null when none.
 * A lone separator followed by exactly three digits is a thousands mark ("1,299", "1.299").
 *
 * @example parseAmount("1,299.00") // 1299
 * @example parseAmount("12,99") // 12.99
 */
export function parseAmount(text: string): number | null {
  const token = AMOUNT_TOKEN.exec(text)?.[0];
  if (token === undefined) return null;
  const amount = Number(normalizeSeparators(token.replace(GROUPING_MARKS, "")));
  return Number.isFinite(amount) ? amount : null;
}

function normalizeSeparators(token: string): string {
  const decimal = decimalSeparator(token);
  const thousands = decimal === "," ? "." : ",";
  const withoutThousands = token.split(thousands).join("");
  return decimal === null ? withoutThousands.split(",").join("").split(".").join("") : withoutThousands.replace(",", ".");
}

/** "." or "," when the token has a decimal part, else null (only thousands marks, or none). */
function decimalSeparator(token: string): "." | "," | null {
  const lastDot = token.lastIndexOf(".");
  const lastComma = token.lastIndexOf(",");
  if (lastDot !== -1 && lastComma !== -1) return lastDot > lastComma ? "." : ",";
  const separator = lastDot !== -1 ? "." : lastComma !== -1 ? "," : null;
  if (separator === null || token.indexOf(separator) !== token.lastIndexOf(separator)) return null;
  const [whole = "", fraction = ""] = token.split(separator);
  return fraction.length === 3 && whole !== "0" ? null : separator;
}

function detectCurrency(display: string, fallbackCurrency: string | undefined): string | undefined {
  const code = [...display.matchAll(CURRENCY_CODE)].map((match) => match[0]).find((word) => CURRENCY_CODES.has(word));
  if (code !== undefined) return code;
  const symbol = CURRENCY_SYMBOLS.find(({ pattern }) => pattern.test(display));
  if (symbol === undefined) return undefined;
  return fallbackCurrency !== undefined && symbol.codes.includes(fallbackCurrency) ? fallbackCurrency : symbol.codes[0];
}
