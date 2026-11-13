import { describe, expect, test } from "bun:test";
import type { LinkAddJob } from "../src/link-capture/link-capture-service.ts";
import { routeRequest, type RouterDependencies } from "../src/message-router.ts";
import { FakeCartApi } from "./fakes/fake-cart-api.ts";
import { stateWith } from "./support/quicklook-state.ts";
import { buildSnapshot } from "./support/build-snapshot.ts";

function setup(failInit = false) {
  const calls: string[] = [];
  const jobs: LinkAddJob[] = [];
  const state = stateWith("c1", []);
  const cartApi = new FakeCartApi();
  const deps: RouterDependencies = {
    quickLook: {
      init: async () => {
        if (failInit) throw new Error("API down");
        calls.push("init");
        return state;
      },
      select: async (id) => (calls.push(`select ${id}`), state),
      add: async (id, snapshot) => (calls.push(`add ${id} ${snapshot.externalId}`), state),
      remove: async (id, productId) => (calls.push(`remove ${id} ${productId}`), state),
    },
    cart: {
      init: () => cartApi.init(),
      select: (cartId) => cartApi.select(cartId),
      addSnapshot: (cartId, snapshot) => cartApi.add(cartId, snapshot),
      setQuantity: (cartId, productId, quantity) => cartApi.setQuantity(cartId, productId, quantity),
      remove: (cartId, productId) => cartApi.remove(cartId, productId),
      undoAdd: async (cartId, productId, previous) => void calls.push(`undo-cart ${cartId} ${productId} ${previous}`),
    },
    linkCapture: {
      add: async (job) => (jobs.push(job), "p1"),
      importLink: async (url) => {
        calls.push(`import ${url}`);
        return "p1";
      },
      undo: async (id, productId) => void calls.push(`undo ${id} ${productId}`),
    },
    openQuickLook: async (tabId) => void calls.push(`open ${tabId}`),
    openCart: async (tabId) => void calls.push(`open-cart ${tabId}`),
  };
  return { deps, calls, jobs, state, cartApi };
}

const sender = { tabId: 7 };

describe("routeRequest", () => {
  test("quick look requests reach the service and wrap the state", async () => {
    const { deps, calls, state } = setup();
    expect(await routeRequest({ type: "quicklook:init" }, sender, deps)).toEqual({ ok: true, body: state });
    await routeRequest({ type: "quicklook:select", comparisonId: "c2" }, sender, deps);
    await routeRequest({ type: "quicklook:add", comparisonId: null, snapshot: buildSnapshot() }, sender, deps);
    await routeRequest({ type: "quicklook:remove", comparisonId: "c1", productId: "p1" }, sender, deps);
    expect(calls).toEqual(["init", "select c2", "add null B0FQG1YHYR", "remove c1 p1"]);
  });

  test("cart requests reach the cart service", async () => {
    const { deps, cartApi } = setup();
    await routeRequest({ type: "cart:init" }, sender, deps);
    await routeRequest({ type: "cart:select", cartId: "k1" }, sender, deps);
    await routeRequest({ type: "cart:add", cartId: null, snapshot: buildSnapshot() }, sender, deps);
    await routeRequest({ type: "cart:set-quantity", cartId: "k1", productId: "p1", quantity: 2 }, sender, deps);
    await routeRequest({ type: "cart:remove", cartId: "k1", productId: "p1" }, sender, deps);
    expect(cartApi.calls).toEqual(["init", "select k1", "add last B0FQG1YHYR", "quantity k1 p1 2", "remove k1 p1"]);
  });

  test("cart toast buttons undo an add or open the Cart view in the sender's tab", async () => {
    const { deps, calls } = setup();
    await routeRequest({ type: "toast:undo-cart", cartId: "k1", productId: "p1", previousQuantity: 1 }, sender, deps);
    await routeRequest({ type: "toast:open-cart" }, sender, deps);
    await routeRequest({ type: "pill:open-cart" }, sender, deps);
    await routeRequest({ type: "toast:open-cart" }, { tabId: null }, deps);
    expect(calls).toEqual(["undo-cart k1 p1 1", "open-cart 7", "open-cart 7"]);
  });

  test("permission and pill requests are refused when this worker has no handler for them", async () => {
    const { deps } = setup();
    expect(await routeRequest({ type: "permission:decline", source: "walmart.com" }, sender, deps)).toEqual({
      ok: false,
      message: 'No handler for "permission:decline" in this worker',
    });
    expect(await routeRequest({ type: "pill:add-to-cart", url: "https://x", productId: "p1" }, sender, deps)).toEqual({
      ok: false,
      message: 'No handler for "pill:add-to-cart" in this worker',
    });
  });

  test("errors become ok:false with the message", async () => {
    expect(await routeRequest({ type: "quicklook:init" }, sender, setup(true).deps)).toEqual({
      ok: false,
      message: "API down",
    });
  });

  test("link:add starts a last-used capture in the sender's tab", async () => {
    const { deps, jobs } = setup();
    await routeRequest({ type: "link:add", url: "https://www.amazon.in/dp/B0FQG1YHYR", label: "LG" }, sender, deps);
    expect(jobs).toEqual([
      { url: "https://www.amazon.in/dp/B0FQG1YHYR", label: "LG", target: { kind: "last" }, tabId: 7, source: "link" },
    ]);
  });

  test("web:import-link saves the link and answers with the stored product id", async () => {
    const { deps, calls } = setup();
    const reply = await routeRequest({ type: "web:import-link", url: "https://www.amazon.in/dp/X" }, sender, deps);
    expect(calls).toEqual(["import https://www.amazon.in/dp/X"]);
    expect(reply).toEqual({ ok: true, body: "p1" });
  });

  test("toast buttons undo or open Quick Look in the sender's tab", async () => {
    const { deps, calls } = setup();
    await routeRequest({ type: "toast:undo", comparisonId: "c1", productId: "p1" }, sender, deps);
    await routeRequest({ type: "toast:quicklook" }, sender, deps);
    await routeRequest({ type: "toast:quicklook" }, { tabId: null }, deps);
    expect(calls).toEqual(["undo c1 p1", "open 7"]);
  });
});
