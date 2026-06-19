import { useCallback, useState } from "react";

import NativeAppIcon from "./ExpoAppIconChangerModule";
import type { DynamicAppIconRegistry } from "./types";

type IconName = DynamicAppIconRegistry["IconName"];

/**
 * Read the current icon from the native module, normalising the default
 * (`"DEFAULT"`) to `null`.
 */
function readCurrentIcon(): IconName | null {
  const current = NativeAppIcon.getAppIcon();
  return current === "DEFAULT" ? null : (current as IconName);
}

export type UseAppIcon = {
  /** Current icon; `null` means the default icon. */
  icon: IconName | null;
  /** Set the icon, or pass `null` to reset to the default. */
  setIcon: (name: IconName | null) => void;
  /** Whether the current icon is the default. */
  isDefault: boolean;
  /** Whether changing the icon is supported on this platform. */
  isSupported: boolean;
};

/**
 * React hook for the app's launcher icon. The native module is the source of
 * truth (the value survives the app restart an Android change triggers), so no
 * extra persistence is needed.
 */
export function useAppIcon(): UseAppIcon {
  const [icon, setIconState] = useState<IconName | null>(() => {
    try {
      return readCurrentIcon();
    } catch {
      return null;
    }
  });

  const setIcon = useCallback((name: IconName | null) => {
    // Defer so any parent re-render (e.g. a menu closing) settles before the
    // native call, which can present a system alert / restart the app.
    setTimeout(() => {
      try {
        NativeAppIcon.setAppIcon(name);
        setIconState(name);
      } catch (error) {
        console.error("Failed to set app icon:", error);
      }
    }, 0);
  }, []);

  return { icon, setIcon, isDefault: icon === null, isSupported: true };
}
