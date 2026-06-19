/**
 * Arbitrary, JSON-serialisable metadata a consumer attaches to an icon (e.g.
 * label, description, isPremium). Surfaced at runtime via getAvailableIcons().
 */
export type IconMetadata = Record<string, unknown>;

/**
 * A normalized icon entry as used everywhere internally (the `image`
 * convenience has been expanded to `ios`/`android`).
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
   * Display/behaviour metadata, passed through to runtime untouched.
   */
  metadata?: IconMetadata;
};

/**
 * Map of icon key → icon config, as used everywhere internally (always the
 * fully-resolved object form).
 */
export type IconSet = Record<string, IconConfig>;

/**
 * The object form a consumer may declare. Adds `image` as a convenience that
 * sets both platforms (`ios`/`android` override it when present).
 */
export type IconInputObject = IconConfig & {
  /** Single image used for both platforms (shorthand for ios + android). */
  image?: string;
};

/**
 * An icon as declared by the user: either a single image path used for both
 * platforms (`"red": "./assets/red.png"`) or the explicit object form.
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
