import { describe, expect, test } from "bun:test";
import { failureHint, RETRY_HINT } from "../src/failure-hint.ts";
import { SIGN_IN_REQUIRED_MESSAGE } from "../src/sign-in-required.ts";

describe("failureHint", () => {
  test("turns a reason written for the logs into the retry hint", () => {
    expect(failureHint("Picky API POST /api/products failed: HTTP 500")).toBe(RETRY_HINT);
    expect(failureHint("Offscreen parser gave no answer for https://www.flipkart.com/x/p/itm1")).toBe(RETRY_HINT);
  });

  test("passes the sign-in prompt through, since it is already written for shoppers", () => {
    expect(failureHint(SIGN_IN_REQUIRED_MESSAGE)).toBe(SIGN_IN_REQUIRED_MESSAGE);
  });
});
