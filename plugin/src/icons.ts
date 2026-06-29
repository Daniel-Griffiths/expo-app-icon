import fs from "fs";
import path from "path";

import type {
  AppleIconTarget,
  AppleIconVariant,
  IconConfig,
  IconInput,
  IconPluginInput,
  IconSet,
  ResolvedIconProps,
} from "./types";

/** Extension of an Icon Composer (Liquid Glass) bundle. */
const APPLE_ICON_EXT = ".icon";

/** Whether a source path is an Icon Composer `.icon` bundle (vs a flat image). */
export function isAppleIconBundle(source: string): boolean {
  return source.toLowerCase().endsWith(APPLE_ICON_EXT);
}

/** The sibling `.png` for an `.icon` path (same directory + basename). */
function siblingPng(iconPath: string): string {
  return iconPath.slice(0, -APPLE_ICON_EXT.length) + ".png";
}

/**
 * Resolve one user-declared icon entry into the normalized internal form,
 * throwing on invalid combinations (an `.icon` on Android, or an iOS `.icon`
 * with no `.png` to fall back to).
 */
function normalizeEntry(key: string, value: IconInput): IconConfig {
  // String shorthand: one path used for both platforms. An `.icon` opts iOS
  // into Liquid Glass and pairs with the sibling `.png` for Android + fallback.
  if (typeof value === "string") {
    if (isAppleIconBundle(value)) {
      const png = siblingPng(value);
      return { ios: value, android: png, iosFallback: png };
    }
    return { ios: value, android: value, iosFallback: value };
  }

  const { ios, android } = value;
  if (android && isAppleIconBundle(android)) {
    throw new Error(
      `[expo-app-icon] Android icon for "${key}" must be a .png — got "${android}".`
    );
  }
  if (ios && isAppleIconBundle(ios)) {
    if (!android) {
      throw new Error(
        `[expo-app-icon] iOS icon for "${key}" is an .icon (Liquid Glass), which ` +
          `needs a .png fallback — also declare an "android" .png for this key.`
      );
    }
    return { ios, android, iosFallback: android };
  }
  return { ios, android, iosFallback: ios };
}

/**
 * The Apple point-size / scale matrix this plugin emits. iPad rows are only
 * kept when the app supports tablet (see {@link resolveAppleVariants}).
 */
type AppleIconBlueprint = {
  size: number;
  scale: number;
  width?: number;
  height?: number;
  target?: AppleIconTarget;
};

const APPLE_ICON_BLUEPRINTS: readonly AppleIconBlueprint[] = [
  { size: 60, scale: 2 },
  { size: 60, scale: 3 },
  { size: 60, scale: 2, width: 152, height: 152, target: "ipad" },
  { size: 60, scale: 3, width: 167, height: 167, target: "ipad" },
];

/**
 * Coerce whatever the user placed in app config into a normalized icon map.
 *
 * - A bare array of image paths becomes keyed entries (index → path).
 * - A string entry uses one path for both platforms; an `.icon` string opts iOS
 *   into Liquid Glass and uses the sibling `.png` for Android + the iOS fallback.
 * - An object entry declares `ios` (`.png` or `.icon`) and `android` (`.png`).
 *
 * Throws on invalid combinations (see {@link normalizeEntry}).
 */
export function normalizeIconSet(input: IconPluginInput): IconSet {
  const entries: [string, IconInput][] = Array.isArray(input)
    ? input.map((image, index) => [String(index), image])
    : Object.entries(input ?? {});

  return Object.fromEntries(
    entries.map(([key, value]) => [key, normalizeEntry(key, value)])
  );
}

/**
 * Assert a declared source exists on disk, throwing a clear error otherwise so
 * the prebuild fails fast (e.g. a missing sibling `.png` for an `.icon`).
 */
export function assertSourceExists(
  projectRoot: string,
  source: string,
  context: string
): void {
  if (!fs.existsSync(path.resolve(projectRoot, source))) {
    throw new Error(
      `[expo-app-icon] ${context}: "${source}" was not found relative to the project root.`
    );
  }
}

/**
 * Build the list of Apple icon variants to emit for the given tablet support.
 */
export function resolveAppleVariants(supportsTablet: boolean): AppleIconVariant[] {
  return APPLE_ICON_BLUEPRINTS.filter(
    (blueprint) => blueprint.target == null || supportsTablet
  ).map((blueprint) => ({
    size: blueprint.size,
    scale: blueprint.scale,
    width: blueprint.width ?? blueprint.size * blueprint.scale,
    height: blueprint.height ?? blueprint.size * blueprint.scale,
    target: blueprint.target ?? null,
  }));
}

/**
 * Base name used to reference an icon from the Info.plist (no scale/extension).
 */
export function appleIconBaseName(
  iconKey: string,
  variant: AppleIconVariant
): string {
  return `${iconKey}-Icon-${variant.size}x${variant.size}`;
}

/**
 * Concrete asset filename for a variant, including @Nx scale and ~target.
 */
export function appleIconFileName(
  iconKey: string,
  variant: AppleIconVariant
): string {
  const targetSuffix = variant.target ? `~${variant.target}` : "";
  return `${appleIconBaseName(iconKey, variant)}@${variant.scale}x${targetSuffix}.png`;
}

/**
 * Visit every (icon, variant) pair in declaration order.
 */
export async function forEachAppleIcon(
  { icons, variants }: ResolvedIconProps,
  visit: (
    iconKey: string,
    icon: IconConfig,
    variant: AppleIconVariant
  ) => Promise<void>
): Promise<void> {
  for (const [iconKey, icon] of Object.entries(icons)) {
    for (const variant of variants) {
      await visit(iconKey, icon, variant);
    }
  }
}
