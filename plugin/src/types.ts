/**
 * A single icon entry as declared in the plugin config.
 */
export type IconConfig = {
  /**
   * Path to the iOS source image.
   */
  ios?: string;
  /**
   * Path to the Android source image.
   */
  android?: string;
  /**
   * Whether iOS should treat the icon as already rendered (no gloss).
   */
  prerendered?: boolean;
};

/**
 * Map of icon key → icon config, as used everywhere internally (always the
 * fully-resolved object form).
 */
export type IconSet = Record<string, IconConfig>;

/**
 * An icon as declared by the user: either a single image path used for both
 * platforms (`"red": "./assets/red.png"`) or the explicit per-platform object.
 */
export type IconInput = string | IconConfig;

/**
 * What the plugin accepts from the app config: a keyed map (string shorthand or
 * object per icon), a bare list of image paths, or nothing.
 */
export type IconPluginInput = Record<string, IconInput> | string[] | void;

/**
 * Device family an Apple icon variant targets.
 */
export type AppleIconTarget = null | "ipad";

/**
 * One concrete Apple icon row written into the asset catalog / Info.plist.
 */
export type AppleIconVariant = {
  /**
   * Logical point size; drives the asset base name.
   */
  size: number;
  /**
   * @Nx scale; drives the asset file suffix.
   */
  scale: number;
  /**
   * Pixel width (defaults to `size * scale`).
   */
  width: number;
  /**
   * Pixel height (defaults to `size * scale`).
   */
  height: number;
  /**
   * Device family this row applies to, if any.
   */
  target: AppleIconTarget;
};

/**
 * Props threaded between the per-platform sub-plugins.
 */
export type ResolvedIconProps = {
  icons: IconSet;
  variants: AppleIconVariant[];
};
