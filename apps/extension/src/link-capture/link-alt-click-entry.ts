import type { LinkAddRequest } from "../messaging/messages.ts";
import { looksLikeProductLink, productLinkFromClick } from "./product-link.ts";

declare global {
  var pickyLinkAltClick: true | undefined;
}

// The always-on content script on the registry's stores: declared for the required ones (site-manifest.ts),
// registered at runtime for allowed beta stores (permissions/store-scripts.ts), which also inject it once
// into the open tab right after a grant, hence the guard. Alt+click on a product link must be
// intercepted in the page before the browser follows or downloads it, and only a content script can see
// clicks there; activeTab cannot, because it is granted on toolbar/menu actions, not on page clicks.
// It reads nothing from the page except the clicked anchor, and sends no network requests itself.
if (globalThis.pickyLinkAltClick === undefined) {
  globalThis.pickyLinkAltClick = true;
  window.addEventListener(
    "click",
    (event: MouseEvent) => {
      if (!event.altKey) return;
      const link = productLinkFromClick(event.target, looksLikeProductLink);
      if (link === null) return;
      event.preventDefault();
      event.stopPropagation();
      const request: LinkAddRequest = { type: "link:add", url: link.url, label: link.label };
      void chrome.runtime.sendMessage(request);
    },
    true,
  );
}
