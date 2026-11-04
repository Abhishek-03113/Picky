import { describe, expect, test } from "bun:test";
import { formatCaptureTime } from "../src/present/capture-time.ts";

describe("formatCaptureTime", () => {
  test("formats in the given time zone, on the 12-hour clock", () => {
    expect(formatCaptureTime("2026-10-05T05:59:30Z", "Asia/Kolkata")).toBe("5 Oct 2026, 11:29 am");
    expect(formatCaptureTime("2026-10-05T15:59:30Z", "Asia/Kolkata")).toBe("5 Oct 2026, 9:29 pm");
  });
});
