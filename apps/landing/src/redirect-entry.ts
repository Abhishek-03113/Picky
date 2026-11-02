import { homeUrl } from "./home-url.ts";

// The homepage moved into the web app, so a shared Picky link and the app are one site. This page only forwards.
const target = homeUrl(import.meta.env.VITE_PICKY_WEB_URL, window.location.hash);
document.querySelector<HTMLAnchorElement>("#home-link")?.setAttribute("href", target);
window.location.replace(target);
