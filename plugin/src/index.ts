import type { ConfigPlugin, ExportedConfig } from "expo/config-plugins";
import fs from "fs";
import path from "path";

import { withAndroidIconAliases, withAndroidIconResources } from "./android";
import {
  withAppleAlternateIcons,
  withAppleGlassIconAssets,
  withAppleGlassIconBuildSettings,
  withAppleIconAssets,
  withAppleIconImages,
} from "./apple";
import { normalizeIconSet, resolveAppleVariants } from "./icons";
import type { IconPluginInput, IconSet } from "./types";

const PACKAGE_ROOT = path.join(__dirname, "..", "..");

/**
 * Config plugin entry point. Wires up the per-platform sub-plugins from a
 * single icon declaration and keeps the shipped `IconName` type in sync.
 */
const withDynamicIcon: ConfigPlugin<IconPluginInput> = (config, input) => {
  const icons = normalizeIconSet(input);
  const variants = resolveAppleVariants(Boolean(config.ios?.supportsTablet));
  const props = { icons, variants };

  config = withTypedIconNames(config, icons);

  config = withAppleIconAssets(config, props);
  config = withAppleAlternateIcons(config, props);
  config = withAppleIconImages(config, props);
  config = withAppleGlassIconAssets(config, props);
  config = withAppleGlassIconBuildSettings(config, props);

  config = withAndroidIconAliases(config, icons);
  config = withAndroidIconResources(config, icons);

  return config;
};

/**
 * Rewrite the `IconName` union in the shipped `build/types.d.ts` so
 * `getAppIcon()` / `setAppIcon()` / `useAppIcon()` are typed to the configured
 * keys. The types file only exists in a built package, so the write is
 * best-effort.
 */
function withTypedIconNames(
  config: ExportedConfig,
  icons: IconSet
): ExportedConfig {
  const names = Object.keys(icons);
  const union = names.map((name) => `"${name}"`).join(" | ") || "string";

  const typesFile = path.join(PACKAGE_ROOT, "build", "types.d.ts");
  try {
    const current = fs.readFileSync(typesFile, "utf8");
    fs.writeFileSync(
      typesFile,
      current.replace(/IconName:\s.*/, `IconName: ${union}`)
    );
  } catch {
    // The types file only exists in a built package; ignore when absent.
  }

  return config;
}

export default withDynamicIcon;
