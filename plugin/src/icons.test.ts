import { describe, expect, it } from "vitest";

import {
  appleIconBaseName,
  appleIconFileName,
  forEachAppleIcon,
  normalizeIconSet,
  resolveAppleVariants,
} from "./icons";
import type { AppleIconVariant } from "./types";

describe("normalizeIconSet", () => {
  it("returns an empty map for void input", () => {
    expect(normalizeIconSet(undefined)).toEqual({});
  });

  it("keeps the explicit per-platform object form", () => {
    expect(normalizeIconSet({ red: { ios: "a.png", android: "b.png", prerendered: true } })).toEqual({
      red: { ios: "a.png", android: "b.png", prerendered: true },
    });
  });

  it("expands a string shorthand to both platforms", () => {
    expect(normalizeIconSet({ red: "./assets/red.png" })).toEqual({
      red: { ios: "./assets/red.png", android: "./assets/red.png" },
    });
  });

  it("mixes shorthand and object entries", () => {
    expect(
      normalizeIconSet({ red: "./red.png", blue: { ios: "./blue-ios.png" } })
    ).toEqual({
      red: { ios: "./red.png", android: "./red.png" },
      blue: { ios: "./blue-ios.png" },
    });
  });

  it("expands a bare list into keyed entries shared across platforms", () => {
    expect(normalizeIconSet(["a.png", "b.png"])).toEqual({
      "0": { ios: "a.png", android: "a.png" },
      "1": { ios: "b.png", android: "b.png" },
    });
  });
});

describe("resolveAppleVariants", () => {
  it("omits iPad variants when tablet is unsupported", () => {
    const variants = resolveAppleVariants(false);
    expect(variants).toHaveLength(2);
    expect(variants.every((v) => v.target === null)).toBe(true);
  });

  it("includes iPad variants when tablet is supported", () => {
    const variants = resolveAppleVariants(true);
    expect(variants).toHaveLength(4);
    expect(variants.some((v) => v.target === "ipad")).toBe(true);
  });

  it("derives pixel dimensions from size * scale when not explicit", () => {
    const phone = resolveAppleVariants(false);
    expect(phone[0]).toMatchObject({ size: 60, scale: 2, width: 120, height: 120 });
    expect(phone[1]).toMatchObject({ scale: 3, width: 180, height: 180 });
  });

  it("keeps explicit iPad dimensions", () => {
    const ipad = resolveAppleVariants(true).filter((v) => v.target === "ipad");
    expect(ipad.map((v) => v.width)).toEqual([152, 167]);
  });
});

describe("apple icon naming", () => {
  const phone: AppleIconVariant = {
    size: 60,
    scale: 3,
    width: 180,
    height: 180,
    target: null,
  };
  const ipad: AppleIconVariant = {
    size: 60,
    scale: 2,
    width: 152,
    height: 152,
    target: "ipad",
  };

  it("builds the plist base name", () => {
    expect(appleIconBaseName("red", phone)).toBe("red-Icon-60x60");
  });

  it("appends scale and target to the file name", () => {
    expect(appleIconFileName("red", phone)).toBe("red-Icon-60x60@3x.png");
    expect(appleIconFileName("red", ipad)).toBe("red-Icon-60x60@2x~ipad.png");
  });
});

describe("forEachAppleIcon", () => {
  it("visits every icon/variant pair in declaration order", async () => {
    const icons = { red: { ios: "r.png" }, blue: { ios: "b.png" } };
    const variants = resolveAppleVariants(false);
    const seen: string[] = [];
    await forEachAppleIcon({ icons, variants }, async (key, _icon, variant) => {
      seen.push(`${key}@${variant.scale}x`);
    });
    expect(seen).toEqual(["red@2x", "red@3x", "blue@2x", "blue@3x"]);
  });
});
