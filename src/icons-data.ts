import type { DynamicAppIconRegistry } from "./types";
import { ICON_DATA } from "./icons-data.generated";

type IconName = DynamicAppIconRegistry["IconName"];

/**
 * One configured icon and the metadata declared for it in the plugin config.
 */
export type AppIconEntry<M = Record<string, unknown>> = {
  /** The configured icon key. */
  name: IconName;
  /** Arbitrary metadata attached in app.json (label, description, isPremium, …). */
  metadata: M;
};

/**
 * The icons configured in app.json, with their metadata. Generic over the
 * consumer's metadata shape, e.g.
 * `getAvailableIcons<{ label: string; isPremium?: boolean }>()`.
 */
export function getAvailableIcons<
  M = Record<string, unknown>
>(): AppIconEntry<M>[] {
  return ICON_DATA as unknown as AppIconEntry<M>[];
}
