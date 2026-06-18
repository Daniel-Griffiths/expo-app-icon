import type { DynamicAppIconRegistry } from "./types";
import NativeAppIcon from "./ExpoAppIconChangerModule";

/**
 * Union of the icon keys declared in the plugin config (widened to string when none).
 */
export type IconName = DynamicAppIconRegistry["IconName"];

/**
 * Value reported / accepted for the project's default launcher icon.
 */
export const DEFAULT_ICON = "DEFAULT" as const;

/**
 * Switch the launcher icon at runtime.
 *
 * @param name A configured icon key, or `null` to reset to the default icon.
 * @returns The applied icon name, `"DEFAULT"`, or `false` if unsupported.
 */
export function setAppIcon(
  name: IconName | null
): IconName | typeof DEFAULT_ICON | false {
  return NativeAppIcon.setAppIcon(name);
}

/**
 * Get the currently active icon name, or `"DEFAULT"` when none is set.
 */
export function getAppIcon(): IconName | typeof DEFAULT_ICON {
  return NativeAppIcon.getAppIcon();
}
