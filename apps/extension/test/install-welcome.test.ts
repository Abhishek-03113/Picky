import { describe, expect, test } from "bun:test";
import { welcomePageUrl } from "../src/install-welcome.ts";

describe("welcomePageUrl", () => {
  test("a fresh install opens the web app's install guide", () => {
    expect(welcomePageUrl("install", "https://picky.example")).toBe("https://picky.example/extension");
  });

  test("updates and browser updates open nothing", () => {
    expect(welcomePageUrl("update", "https://picky.example")).toBeNull();
    expect(welcomePageUrl("chrome_update", "https://picky.example")).toBeNull();
  });
});
