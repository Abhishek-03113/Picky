import { describe, expect, test } from "bun:test";
import { buildMenuEntries, menuClickFromItem, type MenuEntry } from "../../src/link-capture/context-menu-model.ts";
import { MenuRefresher } from "../../src/link-capture/menu-refresher.ts";
import { FakeComparisonsClient } from "../fakes/fake-comparisons-client.ts";
import { FakeContextMenu } from "../fakes/fake-link-capture-ports.ts";

const COMPARISONS = [
  { id: "c1", name: "Home & office", productIds: [], updatedAt: "t" },
  { id: "c2", name: "Monitors", productIds: [], updatedAt: "t" },
];

const titles = (entries: readonly MenuEntry[], context: MenuEntry["context"]) =>
  entries.filter((entry) => entry.context === context).map((entry) => entry.title);

describe("buildMenuEntries", () => {
  test("links get a flat list: See details, Add to cart, then the last-used comparison first, others, Just save it and New", () => {
    const entries = buildMenuEntries(COMPARISONS, "c2");
    expect(titles(entries, "link")).toEqual([
      "See details",
      "Add to cart",
      "",
      "Add to Monitors (last used)",
      "Add to Home && office",
      "",
      "Just save it",
      "New comparison…",
    ]);
    // Top-level only: Chrome itself groups several items under the extension's name ("Picky ▸").
    expect(entries.filter((entry) => entry.context === "link").every((entry) => entry.parentId === undefined)).toBe(
      true,
    );
  });
  test("keeps order and omits the targets separator when nothing is remembered or nothing exists", () => {
    expect(titles(buildMenuEntries(COMPARISONS, null), "link")[3]).toBe("Add to Home && office");
    expect(titles(buildMenuEntries([], null), "link")).toEqual([
      "See details",
      "Add to cart",
      "",
      "Just save it",
      "New comparison…",
    ]);
  });
  test("the open page gets one Add to Picky root with the same targets, under unique ids", () => {
    const entries = buildMenuEntries(COMPARISONS, "c2");
    const page = entries.filter((entry) => entry.context === "page");
    expect(page.map((entry) => entry.title)).toEqual([
      "Save to Picky",
      "Monitors (last used)",
      "Home && office",
      "",
      "Just save it",
      "New comparison…",
      "Add to cart",
    ]);
    // Add to cart sits beside the root as a second top-level item; everything else hangs off the root.
    expect(page.slice(1, -1).every((entry) => entry.parentId === "picky:page:add")).toBe(true);
    expect(page.at(-1)?.parentId).toBeUndefined();
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length);
  });
});

describe("menuClickFromItem", () => {
  test("maps link item ids to targets read from the link", () => {
    expect(menuClickFromItem("picky:cmp:c9")).toEqual({
      action: "add",
      target: { kind: "comparison", comparisonId: "c9" },
      source: "link",
    });
    expect(menuClickFromItem("picky:library")).toEqual({ action: "add", target: { kind: "library" }, source: "link" });
    expect(menuClickFromItem("picky:new")).toEqual({ action: "add", target: { kind: "new" }, source: "link" });
  });
  test("maps page item ids to targets read from the open page", () => {
    expect(menuClickFromItem("picky:page:cmp:c9")).toEqual({
      action: "add",
      target: { kind: "comparison", comparisonId: "c9" },
      source: "page",
    });
    expect(menuClickFromItem("picky:page:library")).toEqual({
      action: "add",
      target: { kind: "library" },
      source: "page",
    });
  });
  test("maps Add to cart on a link and on the open page", () => {
    expect(menuClickFromItem("picky:cart")).toEqual({ action: "cart", source: "link" });
    expect(menuClickFromItem("picky:page:cart")).toEqual({ action: "cart", source: "page" });
  });
  test("maps the Quick Look root to a look without saving", () => {
    expect(menuClickFromItem("picky:quicklook")).toEqual({ action: "quicklook" });
  });
  test("ignores the page root, separators and foreign items", () => {
    expect(menuClickFromItem("picky:separator:quicklook")).toBeNull();
    expect(menuClickFromItem("picky:page:add")).toBeNull();
    expect(menuClickFromItem(42)).toBeNull();
  });
});

describe("MenuRefresher", () => {
  test("rebuilds the menu from the API with the last-used comparison", async () => {
    const menu = new FakeContextMenu();
    const client = new FakeComparisonsClient([{ id: "c1", name: "Monitors", productIds: [] }]);
    await new MenuRefresher(
      client,
      menu,
      async () => "c1",
      () => {},
    ).refresh();
    expect(menu.menus[0]?.map((entry) => entry.title)).toContain("Add to Monitors (last used)");
  });
  test("still offers Just save it when the API is down", async () => {
    const menu = new FakeContextMenu();
    const client = new FakeComparisonsClient();
    client.failWith = new Error("offline");
    const logged: string[] = [];
    await new MenuRefresher(
      client,
      menu,
      async () => null,
      (event) => void logged.push(event),
    ).refresh();
    expect(titles(menu.menus[0] ?? [], "link")).toEqual([
      "See details",
      "Add to cart",
      "",
      "Just save it",
      "New comparison…",
    ]);
    expect(logged).toEqual(["menu.comparisons_unavailable"]);
  });
});
