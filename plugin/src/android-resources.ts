/**
 * Pure helpers describing how Android launcher icons are laid out on disk.
 * Kept free of `expo`/`fs` imports so the logic can be unit-tested directly.
 */

/**
 * Density bucket directory → foreground pixel size (108dp at each scale).
 */
export const ANDROID_DENSITY_SIZES = {
  "mipmap-mdpi": 108,
  "mipmap-hdpi": 162,
  "mipmap-xhdpi": 216,
  "mipmap-xxhdpi": 324,
  "mipmap-xxxhdpi": 432,
} as const;

export type AndroidDensityDir = keyof typeof ANDROID_DENSITY_SIZES;

export const ANDROID_DENSITY_DIRS = Object.keys(
  ANDROID_DENSITY_SIZES
) as AndroidDensityDir[];

/**
 * Directory holding version-26+ adaptive-icon XML.
 */
export const ADAPTIVE_ICON_DIR = "mipmap-anydpi-v26";

/**
 * Adaptive icons require this API level; below it legacy bitmaps are needed.
 */
export const ADAPTIVE_ICON_MIN_SDK = 26;

/**
 * Fraction of the 108dp adaptive canvas the artwork occupies. Android reserves
 * the outer 18dp on every side (visible viewport ≈ inner 72dp, guaranteed-safe
 * inner 66dp), so full-bleed art (1.0) is cropped by the launcher mask and
 * looks zoomed in. Scaling to this fraction and centering keeps the logo safe.
 */
export const FOREGROUND_SAFE_ZONE_SCALE = 0.72;

/**
 * Reserved icon name for the project's primary (`ic_launcher`) icon. A dedicated
 * alias under this name owns the launcher role so the real `MainActivity` can
 * stay enabled — otherwise disabling it to swap icons breaks tools (e.g. the
 * Expo dev client) that launch `MainActivity` by explicit component.
 */
export const DEFAULT_ICON_NAME = "DEFAULT";

/**
 * Fully-qualified activity-alias name for an icon. Must match the name the
 * native module toggles at runtime (`<package>.MainActivity<iconName>`).
 */
export function activityAliasName(packageName: string, iconName: string): string {
  return `${packageName}.MainActivity${iconName}`;
}

const NON_RESOURCE_CHARS = /[^a-zA-Z0-9_]/g;

/**
 * Turn an arbitrary icon key into a valid Android resource name.
 */
export function toResourceName(iconKey: string): string {
  return iconKey.replace(NON_RESOURCE_CHARS, "_").toLowerCase();
}

/**
 * XML body for an adaptive icon whose foreground points at `<foregroundResource>`.
 */
export function adaptiveIconXml(foregroundResource: string): string {
  return [
    `<?xml version="1.0" encoding="utf-8"?>`,
    `<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">`,
    `    <background android:drawable="@color/iconBackground"/>`,
    `    <foreground android:drawable="@mipmap/${foregroundResource}"/>`,
    `</adaptive-icon>`,
    ``,
  ].join("\n");
}

/**
 * Centered content size + inset for placing artwork inside the safe zone.
 */
export function foregroundLayout(
  canvasSize: number,
  scale: number = FOREGROUND_SAFE_ZONE_SCALE
): { contentSize: number; inset: number } {
  const contentSize = Math.round(canvasSize * scale);
  const inset = Math.round((canvasSize - contentSize) / 2);
  return { contentSize, inset };
}

/**
 * Whether the project still needs pre-26 legacy square/round bitmaps.
 */
export function needsLegacyBitmaps(minSdkVersion: number | null): boolean {
  return minSdkVersion == null || minSdkVersion < ADAPTIVE_ICON_MIN_SDK;
}

/**
 * Resolve the Android `minSdkVersion`. Prefers the declared
 * `expo-build-properties` plugin config (order-independent — `gradle.properties`
 * may not be written yet when our dangerous mod runs), then falls back to a
 * `gradle.properties` snapshot. Returns null when undeterminable.
 */
export function resolveMinSdkVersion(
  plugins: unknown,
  gradlePropertiesContent?: string | null
): number | null {
  if (Array.isArray(plugins)) {
    for (const entry of plugins) {
      if (Array.isArray(entry) && entry[0] === "expo-build-properties") {
        const declared = entry[1]?.android?.minSdkVersion;
        if (typeof declared === "number") return declared;
      }
    }
  }
  if (gradlePropertiesContent) {
    const captured = gradlePropertiesContent.match(
      /android\.minSdkVersion\s*=\s*(\d+)/
    )?.[1];
    if (captured) return Number.parseInt(captured, 10);
  }
  return null;
}

/**
 * Legacy bitmap basenames this plugin owns for an icon key (square + round).
 */
export function legacyBitmapNames(iconKey: string): [string, string] {
  const safe = toResourceName(iconKey);
  return [`${safe}.png`, `${safe}_round.png`];
}

/**
 * Adaptive foreground bitmap basename for an icon key.
 */
export function foregroundBitmapName(iconKey: string): string {
  return `${toResourceName(iconKey)}_foreground.png`;
}

/**
 * Adaptive-icon XML basenames this plugin owns for an icon key.
 */
export function adaptiveXmlNames(iconKey: string): [string, string] {
  const safe = toResourceName(iconKey);
  return [`${safe}.xml`, `${safe}_round.xml`];
}

/**
 * True when `fileName` is a mipmap resource this plugin generated for `iconKey`.
 */
export function isOwnedMipmapFile(fileName: string, iconKey: string): boolean {
  const [square, round] = legacyBitmapNames(iconKey);
  return (
    fileName === square ||
    fileName === round ||
    fileName === foregroundBitmapName(iconKey)
  );
}

/**
 * True when `fileName` is an adaptive XML this plugin generated for `iconKey`.
 */
export function isOwnedAdaptiveXml(fileName: string, iconKey: string): boolean {
  const [square, round] = adaptiveXmlNames(iconKey);
  return fileName === square || fileName === round;
}
