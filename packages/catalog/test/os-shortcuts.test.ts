import { describe, expect, test } from "bun:test";
import {
  COMPARE_SHORTCUT,
  QUICK_LOOK_SHORTCUT,
  altClickText,
  detectOperatingSystem,
  shortcutKeyLabels,
  shortcutText,
} from "../src/present/os-shortcuts.ts";

const MAC_CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const WINDOWS_CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

describe("detectOperatingSystem", () => {
  test("prefers the modern platform hint", () => {
    expect(detectOperatingSystem({ userAgentData: { platform: "macOS" }, userAgent: WINDOWS_CHROME_UA })).toBe("mac");
    expect(detectOperatingSystem({ userAgentData: { platform: "Windows" } })).toBe("windows");
    expect(detectOperatingSystem({ userAgentData: { platform: "Chrome OS" } })).toBe("chromeos");
    expect(detectOperatingSystem({ userAgentData: { platform: "Linux" } })).toBe("linux");
  });

  test("falls back to the legacy platform and user agent", () => {
    expect(detectOperatingSystem({ platform: "MacIntel" })).toBe("mac");
    expect(detectOperatingSystem({ userAgent: MAC_CHROME_UA })).toBe("mac");
    expect(detectOperatingSystem({ platform: "Win32", userAgent: WINDOWS_CHROME_UA })).toBe("windows");
    expect(detectOperatingSystem({ platform: "Linux x86_64" })).toBe("linux");
    expect(detectOperatingSystem({ userAgent: "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0)" })).toBe("chromeos");
  });

  test("phones and unknown environments are other", () => {
    expect(detectOperatingSystem({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" })).toBe(
      "other",
    );
    expect(detectOperatingSystem({ platform: "Linux armv8l", userAgent: "Mozilla/5.0 (Linux; Android 14)" })).toBe(
      "other",
    );
    expect(detectOperatingSystem(undefined)).toBe("other");
    expect(detectOperatingSystem({})).toBe("other");
  });
});

describe("shortcut labels", () => {
  test("a Mac shows modifier symbols, written together", () => {
    expect(shortcutKeyLabels(QUICK_LOOK_SHORTCUT, "mac")).toEqual(["⌥", "⇧", "S"]);
    expect(shortcutText(COMPARE_SHORTCUT, "mac")).toBe("⌥⇧V");
    expect(shortcutKeyLabels(["Enter"], "mac")).toEqual(["Return"]);
    expect(altClickText("mac")).toBe("Option-click");
  });

  test("Windows, Linux and ChromeOS spell the keys out", () => {
    for (const os of ["windows", "linux", "chromeos", "other"] as const) {
      expect(shortcutKeyLabels(QUICK_LOOK_SHORTCUT, os)).toEqual(["Alt", "Shift", "S"]);
      expect(shortcutText(COMPARE_SHORTCUT, os)).toBe("Alt + Shift + V");
      expect(shortcutKeyLabels(["Enter"], os)).toEqual(["Enter"]);
      expect(altClickText(os)).toBe("Alt+click");
    }
  });
});
