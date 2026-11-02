import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BeforeAfter } from "../src/components/home/before-after.tsx";
import { ComparePreview } from "../src/components/home/compare-preview.tsx";
import { Features } from "../src/components/home/features.tsx";
import { HowItWorks } from "../src/components/home/how-it-works.tsx";
import { SupportedSites } from "../src/components/home/supported-sites.tsx";
import { FakeAuthClient } from "./fakes/fake-auth-client.ts";
import { FakeComparisonsClient } from "./fakes/fake-comparisons-client.ts";
import { FakeExtensionBridge } from "./fakes/fake-extension-bridge.ts";
import { FakeProductsClient } from "./fakes/fake-products-client.ts";
import { renderAppWithRouter } from "./fakes/render-app.tsx";

const render = renderToStaticMarkup;
const signedOut = () => new FakeAuthClient(null);

async function renderSignedOut(path: string, extensionInstalled = false) {
  const bridge = new FakeExtensionBridge(extensionInstalled);
  return renderAppWithRouter(path, new FakeProductsClient(), new FakeComparisonsClient(), signedOut(), bridge);
}

describe("homepage at / for a signed-out visitor", () => {
  test("explains the product before asking for an account", async () => {
    const { html, router } = await renderSignedOut("/");
    expect(router.state.location.pathname).toBe("/");
    expect(html).toContain("Stop shopping by opening more tabs.");
    expect(html).toContain("Sign in");
    expect(html).not.toContain("Welcome to Picky");
    expect(html).not.toContain("Sign out");
  });

  test("every way in leads to sign-up or the extension guide", async () => {
    const { html } = await renderSignedOut("/");
    expect(html).toContain('href="/login?mode=signup"');
    expect(html).toContain('href="/extension"');
    expect(html).toContain('href="/privacy"');
    expect(html).toContain("Get started free");
  });
});

describe("/extension install guide", () => {
  test("without the extension: the store link and a way to re-check", async () => {
    const { html } = await renderSignedOut("/extension");
    expect(html).toContain("Get the Picky extension");
    expect(html).toContain('href="https://store.example/picky"');
    expect(html).toContain("reload this page");
    expect(html).toContain("Alt + Shift + S");
  });

  test("with the extension, a visitor is pointed at creating an account", async () => {
    const { html } = await renderSignedOut("/extension", true);
    expect(html).toContain("Picky is installed in this browser.");
    expect(html).toContain("Create your free account");
    expect(html).not.toContain("reload this page");
  });

  test("signed in with the extension, the next step is the library", async () => {
    const { html } = await renderAppWithRouter("/extension", new FakeProductsClient());
    expect(html).toContain("Go to your library");
    expect(html).toContain("Sign out");
  });
});

describe("/privacy", () => {
  test("is public and says what is collected and what is not done with it", async () => {
    const { html, router } = await renderSignedOut("/privacy");
    expect(router.state.location.pathname).toBe("/privacy");
    expect(html).toContain("Privacy policy");
    expect(html).toContain("Information we collect");
    expect(html).toContain("How the browser extension works");
    expect(html).toContain("We do not sell, rent or trade your information.");
    expect(html).toContain('id="product-information"');
    expect(html).toContain("not liable for any loss or damage");
  });
});

describe("homepage sections", () => {
  test("the sample sheet shows Sony data", () => {
    const html = render(<BeforeAfter />);
    expect(html).toContain('id="sample"');
    expect(html).toContain("Sony WH-1000XM5");
    expect(html).toContain("₹28,926");
  });

  test("how it works lists the four steps with the extension's real shortcut", () => {
    const html = render(<HowItWorks />);
    for (const step of ["Save", "Understand", "Compare", "Decide"]) expect(html).toContain(`<h3>${step}</h3>`);
    expect(html).toContain("<kbd>S</kbd>");
  });

  test("the comparison marks clear winners and leaves preference rows unmarked", () => {
    const html = render(<ComparePreview />);
    expect(html.match(/Better/g)).toHaveLength(3);
    expect(html).toContain("Same on both");
  });

  test("principles and supported sites", () => {
    expect(render(<Features />).match(/<dt>/g)).toHaveLength(4);
    const sites = render(<SupportedSites />);
    expect(sites).toContain("Amazon.in");
    expect(sites).toContain("Flipkart");
  });
});
