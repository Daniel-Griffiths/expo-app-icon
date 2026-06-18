import { describe, expect, it } from "vitest";

import {
  ANDROID_DENSITY_DIRS,
  ANDROID_DENSITY_SIZES,
  DEFAULT_ICON_NAME,
  activityAliasName,
  adaptiveIconXml,
  adaptiveXmlNames,
  foregroundBitmapName,
  foregroundLayout,
  isOwnedAdaptiveXml,
  isOwnedMipmapFile,
  legacyBitmapNames,
  needsLegacyBitmaps,
  resolveMinSdkVersion,
  toResourceName,
} from "./android-resources";

describe("activity alias naming", () => {
  it("builds <package>.MainActivity<iconName>", () => {
    expect(activityAliasName("com.acme.app", "orange")).toBe(
      "com.acme.app.MainActivityorange"
    );
  });

  it("builds the default alias from the reserved name", () => {
    expect(activityAliasName("com.acme.app", DEFAULT_ICON_NAME)).toBe(
      "com.acme.app.MainActivityDEFAULT"
    );
  });
});

describe("toResourceName", () => {
  it("lowercases and replaces non-resource characters", () => {
    expect(toResourceName("Red Icon")).toBe("red_icon");
    expect(toResourceName("dark-mode!")).toBe("dark_mode_");
    expect(toResourceName("Blue")).toBe("blue");
  });
});

describe("density table", () => {
  it("covers all five buckets at 108dp scales", () => {
    expect(ANDROID_DENSITY_DIRS).toHaveLength(5);
    expect(ANDROID_DENSITY_SIZES["mipmap-mdpi"]).toBe(108);
    expect(ANDROID_DENSITY_SIZES["mipmap-xxxhdpi"]).toBe(432);
  });
});

describe("adaptiveIconXml", () => {
  it("references the iconBackground color and given foreground", () => {
    const xml = adaptiveIconXml("red_foreground");
    expect(xml).toContain('<background android:drawable="@color/iconBackground"/>');
    expect(xml).toContain('<foreground android:drawable="@mipmap/red_foreground"/>');
    expect(xml.endsWith("\n")).toBe(true);
  });
});

describe("foregroundLayout", () => {
  it("scales content into the safe zone and centers it", () => {
    expect(foregroundLayout(108)).toEqual({ contentSize: 78, inset: 15 });
    expect(foregroundLayout(432)).toEqual({ contentSize: 311, inset: 61 });
  });

  it("honors a custom scale", () => {
    expect(foregroundLayout(100, 0.5)).toEqual({ contentSize: 50, inset: 25 });
  });
});

describe("needsLegacyBitmaps", () => {
  it("requires legacy bitmaps below API 26 or when unknown", () => {
    expect(needsLegacyBitmaps(24)).toBe(true);
    expect(needsLegacyBitmaps(null)).toBe(true);
  });

  it("skips legacy bitmaps at API 26+", () => {
    expect(needsLegacyBitmaps(26)).toBe(false);
    expect(needsLegacyBitmaps(34)).toBe(false);
  });
});

describe("resolveMinSdkVersion", () => {
  it("reads from declared expo-build-properties config", () => {
    const plugins = [
      "expo-router",
      ["expo-build-properties", { android: { minSdkVersion: 26 } }],
    ];
    expect(resolveMinSdkVersion(plugins, null)).toBe(26);
  });

  it("falls back to gradle.properties content", () => {
    const gradle = "android.minSdkVersion=24\nandroid.compileSdkVersion=34";
    expect(resolveMinSdkVersion([], gradle)).toBe(24);
  });

  it("prefers config over gradle.properties", () => {
    const plugins = [["expo-build-properties", { android: { minSdkVersion: 30 } }]];
    expect(resolveMinSdkVersion(plugins, "android.minSdkVersion=24")).toBe(30);
  });

  it("returns null when undeterminable", () => {
    expect(resolveMinSdkVersion(undefined, null)).toBeNull();
    expect(resolveMinSdkVersion([], "")).toBeNull();
  });
});

describe("owned resource naming", () => {
  it("derives legacy, foreground and xml names from a key", () => {
    expect(legacyBitmapNames("Red Icon")).toEqual(["red_icon.png", "red_icon_round.png"]);
    expect(foregroundBitmapName("Red Icon")).toBe("red_icon_foreground.png");
    expect(adaptiveXmlNames("Red Icon")).toEqual(["red_icon.xml", "red_icon_round.xml"]);
  });

  it("matches only files it generated", () => {
    expect(isOwnedMipmapFile("blue.png", "blue")).toBe(true);
    expect(isOwnedMipmapFile("blue_foreground.png", "blue")).toBe(true);
    expect(isOwnedMipmapFile("ic_launcher.png", "blue")).toBe(false);
    expect(isOwnedAdaptiveXml("blue_round.xml", "blue")).toBe(true);
    expect(isOwnedAdaptiveXml("green.xml", "blue")).toBe(false);
  });
});
