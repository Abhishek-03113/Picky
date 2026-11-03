import { detectOperatingSystem } from "@picky/catalog";
import type { CaptureConfig } from "../capture-config.ts";
import { CAPTURE_PORT_NAME } from "../capture-protocol.ts";
import { adaptChromePort } from "../chrome-duplex-port.ts";
import { ChromeKeyValueStorage } from "../chrome-key-value-storage.ts";
import { SettingsStore } from "../settings.ts";
import { ChromeActiveTabSource } from "./active-tab-source.ts";
import { PortCaptureService } from "./capture-service.ts";
import { PopupController } from "./popup-controller.ts";

// Popup composition root. Replaced at build time by build.ts (Bun.build `define`).
declare const __PICKY_CAPTURE_CONFIG__: CaptureConfig;

const root = document.getElementById("root");
if (root === null) throw new Error('popup.html has no #root element; expected <div id="root"></div>');

// The worker routes one toolbar click on a page Quick Look cannot open to this popup (openPopupFor). Clearing
// the override now sends the next click back to Quick Look, wherever the tab goes next.
void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
  if (tab?.id !== undefined) return chrome.action.setPopup({ tabId: tab.id, popup: "" });
});

void new PopupController({
  root,
  settings: new SettingsStore(new ChromeKeyValueStorage()),
  tabs: new ChromeActiveTabSource(),
  captureService: new PortCaptureService(() => adaptChromePort(chrome.runtime.connect({ name: CAPTURE_PORT_NAME }))),
  webBaseUrl: __PICKY_CAPTURE_CONFIG__.webBaseUrl,
  os: detectOperatingSystem(navigator),
}).start();
