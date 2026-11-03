import type { ProductSource } from "../../product-snapshot.ts";

/**
 * One Amazon storefront. Every storefront serves the same page widgets, so the extractor is shared and
 * only the host, currency and example product differ.
 */
export interface AmazonMarketplace {
  readonly source: Extract<ProductSource, `amazon.${string}`>;
  /** Canonical host, e.g. "www.amazon.in"; the bare domain is accepted too. */
  readonly host: string;
  /** ISO 4217 code assumed when a displayed price has no currency symbol. */
  readonly currency: string;
  readonly exampleAsin: string;
}

export const AMAZON_IN: AmazonMarketplace = {
  source: "amazon.in",
  host: "www.amazon.in",
  currency: "INR",
  exampleAsin: "B0FQG1YHYR",
};

export const AMAZON_COM: AmazonMarketplace = {
  source: "amazon.com",
  host: "www.amazon.com",
  currency: "USD",
  exampleAsin: "B08N5WRWNW",
};
