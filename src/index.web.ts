import type { IconName } from "./types";
import type { UseAppIcon } from "./useAppIcon";

export type { UseAppIcon } from "./useAppIcon";

export type { IconName } from "./types";

export const DEFAULT_ICON = "DEFAULT" as const;

/**
 * Web has no launcher icon; the hook reports an unsupported, default state.
 */
export function useAppIcon(): UseAppIcon {
  return { icon: null, setIcon: () => {}, isDefault: true, isSupported: false };
}

/**
 * Web has no launcher icon; this is a no-op that reports failure.
 */
export function setAppIcon(
  _name: IconName | null
): IconName | typeof DEFAULT_ICON | false {
  console.error("setAppIcon is not supported on web");
  return false;
}

/**
 * Web has no launcher icon; always reports the default.
 */
export function getAppIcon(): IconName | typeof DEFAULT_ICON {
  console.error("getAppIcon is not supported on web");
  return DEFAULT_ICON;
}
