import type { ConfigPlugin, ExportedConfig } from "expo/config-plugins";
import fs from "fs";
import path from "path";

import { withAndroidIconAliases, withAndroidIconResources } from "./android";
import {
  withAppleAlternateIcons,
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

  config = withGeneratedIconData(config, icons);

  config = withAppleIconAssets(config, props);
  config = withAppleAlternateIcons(config, props);
  config = withAppleIconImages(config, props);

  config = withAndroidIconAliases(config, icons);
  config = withAndroidIconResources(config, icons);

  return config;
};

/**
 * Sync the shipped package to this project's icons:
 *  - rewrite the `IconName` union in `build/types.d.ts` so `getAppIcon()` /
 *    `setAppIcon()` / `getAvailableIcons()` are typed to the configured keys, and
 *  - emit the `{ name, metadata }` list into `build/icons-data.generated.js` so
 *    `getAvailableIcons()` returns it at runtime.
 *
 * Both files only exist in a built package, so writes are best-effort.
 */
function withGeneratedIconData(
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

  const iconData = names.map((name) => ({
    name,
    metadata: icons[name]?.metadata ?? {},
  }));
  const dataFile = path.join(PACKAGE_ROOT, "build", "icons-data.generated.js");
  try {
    fs.writeFileSync(
      dataFile,
      `export const ICON_DATA = ${JSON.stringify(iconData)};\n`
    );
  } catch {
    // The build output only exists in a built package; ignore when absent.
  }

  return config;
}

export default withDynamicIcon;
