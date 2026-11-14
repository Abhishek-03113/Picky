import { supportedStoresText } from "@picky/catalog/sites";
import { describe, expect, test } from "bun:test";
import { ApiRequestError } from "../src/api/json-requester.ts";
import { importErrorMessage, routeErrorMessage } from "../src/format/shopper-error.ts";

describe("routeErrorMessage", () => {
  test("a 404 says the item is gone, without the id or status", () => {
    const message = routeErrorMessage(new ApiRequestError('No product with id "p9"', 404));
    expect(message).toBe("This product or comparison isn't in your Picky account any more.");
  });

  test("anything else asks for a retry, without the request path or status", () => {
    const message = routeErrorMessage(new ApiRequestError("Request to /api/products failed with HTTP 500", 500));
    expect(message).toBe("Picky couldn't load this page. Check your connection, then try again.");
    expect(routeErrorMessage(new Error("network down"))).toBe(message);
  });
});

describe("importErrorMessage", () => {
  test("a link that is not a product page names the stores to paste from", () => {
    expect(importErrorMessage("https://example.com/")).toBe(
      `That link isn't a product. Paste a link to one product on ${supportedStoresText("or")}.`,
    );
  });

  test("a real product link that failed asks for a retry", () => {
    expect(importErrorMessage(" https://www.amazon.in/dp/B09XS7JWHH ")).toBe(
      "Picky couldn't save that product. Reload this page, then try again.",
    );
  });
});
