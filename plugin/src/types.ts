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
 * Map of icon key → icon config, as used everywhere internally.
 */
export type IconSet = Record<string, IconConfig>;

/**
 * What the plugin accepts from the app config: a keyed map, a bare list of
 * image paths, or nothing.
 */
export type IconPluginInput = IconSet | string[] | void;

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
