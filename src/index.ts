import type { IconName } from "./types";
import NativeAppIcon from "./ExpoAppIconChangerModule";

export { useAppIcon } from "./useAppIcon";
export type { UseAppIcon } from "./useAppIcon";

export type { IconName } from "./types";

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
