const LOCAL_WEB_URL = "http://localhost:5173";

/**
 * Where an old landing-page link now lives: the web app's homepage, keeping the section anchor
 * (#how, #compare, #sample exist there too).
 *
 * @example homeUrl("https://picky.example/", "#how") // "https://picky.example/#how"
 */
export function homeUrl(webUrl: string | undefined, hash: string): string {
  const base = webUrl?.trim() ? webUrl.trim().replace(/\/+$/, "") : LOCAL_WEB_URL;
  return `${base}/${hash}`;
}
