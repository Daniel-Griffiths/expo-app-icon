import type {
  AppleIconTarget,
  AppleIconVariant,
  IconConfig,
  IconPluginInput,
  IconSet,
  ResolvedIconProps,
} from "./types";

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
 * A bare array of image paths is expanded to keyed entries that share the same
 * image for both platforms. For the object form, the `image` convenience is
 * expanded to `ios`/`android` (which override it) and `metadata` is carried
 * through untouched.
 */
export function normalizeIconSet(input: IconPluginInput): IconSet {
  if (Array.isArray(input)) {
    return input.reduce<IconSet>((acc, image, index) => {
      acc[String(index)] = { ios: image, android: image };
      return acc;
    }, {});
  }
  if (!input) return {};
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      // String shorthand: one image path used for both platforms.
      if (typeof value === "string") {
        return [key, { ios: value, android: value }];
      }
      const { image, ios, android, metadata } = value;
      const config: IconConfig = {
        ios: ios ?? image,
        android: android ?? image,
        ...(metadata ? { metadata } : {}),
      };
      return [key, config];
    })
  );
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
