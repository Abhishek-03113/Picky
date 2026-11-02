/**
 * The page to open right after the extension is installed: the web app's install guide, which sees the
 * extension and points the new user at creating an account. Updates and Chrome restarts open nothing.
 *
 * @example welcomePageUrl("install", "https://picky.example") // "https://picky.example/extension"
 */
export function welcomePageUrl(reason: string, webBaseUrl: string): string | null {
  return reason === "install" ? `${webBaseUrl}/extension` : null;
}
