/**
 * A normalized icon entry as used everywhere internally.
 *
 * `ios` may point at either a flat `.png` or an Icon Composer `.icon` bundle
 * (Liquid Glass). `android` is always a flat `.png`. `iosFallback` is the flat
 * `.png` used to back an `.icon` iOS entry — it provides the bitmap the
 * alternate-icon name is registered against and the icon shown on iOS versions
 * that predate Liquid Glass. It equals `ios` when `ios` is itself a `.png`.
 */
export type IconConfig = {
  /**
   * Path to the iOS source image — a `.png` or an Icon Composer `.icon` bundle.
   */
  ios?: string;
  /**
   * Path to the Android source image (always a `.png`).
   */
  android?: string;
  /**
   * Flat `.png` backing the iOS entry. Same as `ios` for `.png` icons; the
   * sibling/Android `.png` when `ios` is an `.icon` bundle.
   */
  iosFallback?: string;
};

/**
 * Map of icon key → icon config, as used everywhere internally (always the
 * fully-resolved object form).
 */
export type IconSet = Record<string, IconConfig>;

/**
 * The explicit object form a consumer may declare: a `.png` or `.icon` for
 * iOS, and a `.png` for Android.
 */
export type IconInputObject = {
  /** iOS image — a `.png` or an Icon Composer `.icon` bundle. */
  ios?: string;
  /** Android image — a `.png`. */
  android?: string;
};

/**
 * An icon as declared by the user: either a single image path used for both
 * platforms (`"red": "./assets/red.png"`) or the explicit per-platform object
 * form. When the single path is an `.icon`, the sibling `.png` (same basename)
 * is used for Android and as the iOS fallback bitmap.
 */
export type IconInput = string | IconInputObject;

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
