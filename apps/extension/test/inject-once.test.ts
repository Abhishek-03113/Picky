import { afterEach, describe, expect, test } from "bun:test";
import { ChromeBrowserPort } from "../src/chrome-browser-port.ts";
import { ChromeQuickLookTabPort } from "../src/quicklook/chrome-quicklook-tab-port.ts";
import { FakeScriptingTab } from "./fakes/fake-scripting-tab.ts";
import { buildSnapshot } from "./support/build-snapshot.ts";

let uninstall = () => {};
afterEach(() => uninstall());

function tab(...args: ConstructorParameters<typeof FakeScriptingTab>): FakeScriptingTab {
  const fake = new FakeScriptingTab(...args);
  uninstall = fake.install();
  return fake;
}

describe("Quick Look injects its bundle once per page", () => {
  test("the first toggle injects, later toggles only call the overlay", async () => {
    const page = tab();
    const port = new ChromeQuickLookTabPort("quicklook.js", "popup.html");
    await port.injectAndToggle(7, "specs");
    await port.injectAndToggle(7, "compare");
    expect(page.calls).toEqual(["call", "inject quicklook.js", "call", "call"]);
    expect(page.toggles).toEqual(["specs", "compare"]);
  });

  test("showing a linked product reuses the overlay already on the page", async () => {
    const page = tab();
    const port = new ChromeQuickLookTabPort("quicklook.js", "popup.html");
    await port.injectAndToggle(7, "specs");
    await port.injectAndShowProduct(7, { ...buildSnapshot(), title: "Bose QC" });
    expect(page.calls.filter((call) => call.startsWith("inject"))).toEqual(["inject quicklook.js"]);
    expect(page.toggles).toEqual(["specs", "product Bose QC"]);
  });
});

describe("page capture injects its bundle once per page", () => {
  test("a second capture of the same page skips the injection", async () => {
    const snapshot = buildSnapshot();
    const page = tab({ ok: true, snapshot });
    const port = new ChromeBrowserPort("page-capture.js");
    expect(await port.capturePageInTab(3)).toEqual({ ok: true, snapshot });
    expect(await port.capturePageInTab(3)).toEqual({ ok: true, snapshot });
    expect(page.calls).toEqual(["call", "inject page-capture.js", "call", "call"]);
  });
});
