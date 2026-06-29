import {
  AndroidConfig,
  ConfigPlugin,
  withAndroidManifest,
  withDangerousMod,
} from "expo/config-plugins";
import { generateImageAsync } from "@expo/image-utils";
// @ts-ignore - no types; ships with @expo/image-utils. Used to pad the adaptive
// foreground onto a transparent canvas without requiring `sharp`.
import jimpCompact from "jimp-compact";
import fs from "fs";
import path from "path";

import type { IconSet } from "./types";
import { assertSourceExists } from "./icons";
import {
  ADAPTIVE_ICON_DIR,
  ANDROID_DENSITY_DIRS,
  ANDROID_DENSITY_SIZES,
  DEFAULT_ICON_NAME,
  activityAliasName,
  adaptiveIconXml,
  adaptiveXmlNames,
  foregroundBitmapName,
  foregroundLayout,
  isOwnedAdaptiveXml,
  isOwnedMipmapFile,
  legacyBitmapNames,
  needsLegacyBitmaps,
  resolveMinSdkVersion,
  toResourceName,
} from "./android-resources";

const { getMainApplicationOrThrow, getMainActivityOrThrow } =
  AndroidConfig.Manifest;

const ANDROID_RES_PATH = ["app", "src", "main", "res"];
const LAUNCHER_CATEGORY = "android.intent.category.LAUNCHER";

/** A standalone MAIN/LAUNCHER intent-filter for an alias. */
const launcherIntentFilter = () => ({
  action: [{ $: { "android:name": "android.intent.action.MAIN" } }],
  category: [{ $: { "android:name": LAUNCHER_CATEGORY } }],
});

/** Whether an intent-filter is the home-screen launcher entry. */
function isLauncherIntentFilter(filter: any): boolean {
  return (
    Array.isArray(filter?.category) &&
    filter.category.some(
      (entry: any) => entry?.$?.["android:name"] === LAUNCHER_CATEGORY
    )
  );
}

/**
 * Set up the launcher entries for icon switching.
 *
 * `MainActivity` keeps every non-launcher filter (deep links, etc.) and stays
 * enabled so tools that launch it by explicit component (e.g. the Expo dev
 * client) keep working — but its MAIN/LAUNCHER filter is removed so it isn't a
 * second home-screen icon. A dedicated `DEFAULT` alias owns the launcher role
 * for the project's primary icon, and one disabled alias is added per
 * configured icon. The native module enables exactly one alias at a time.
 */
export const withAndroidIconAliases: ConfigPlugin<IconSet> = (config, icons) => {
  return withAndroidManifest(config, (config) => {
    const mainApplication = getMainApplicationOrThrow(config.modResults) as any;
    const mainActivity = getMainActivityOrThrow(config.modResults) as any;
    const packageName = config.android!.package!;
    const aliasPrefix = `${packageName}.MainActivity`;

    if (Array.isArray(mainActivity["intent-filter"])) {
      mainActivity["intent-filter"] = mainActivity["intent-filter"].filter(
        (filter: any) => !isLauncherIntentFilter(filter)
      );
    }

    const defaultAlias = {
      $: {
        "android:name": activityAliasName(packageName, DEFAULT_ICON_NAME),
        "android:enabled": "true",
        "android:exported": "true",
        "android:icon": "@mipmap/ic_launcher",
        "android:roundIcon": "@mipmap/ic_launcher_round",
        "android:targetActivity": ".MainActivity",
      },
      "intent-filter": [launcherIntentFilter()],
    };

    const iconAliases = Object.keys(icons).map((iconKey) => {
      const resource = toResourceName(iconKey);
      return {
        $: {
          "android:name": activityAliasName(packageName, iconKey),
          "android:enabled": "false",
          "android:exported": "true",
          "android:icon": `@mipmap/${resource}`,
          "android:roundIcon": `@mipmap/${resource}_round`,
          "android:targetActivity": ".MainActivity",
        },
        "intent-filter": [launcherIntentFilter()],
      };
    });

    const preserved = (mainApplication["activity-alias"] || []).filter(
      (alias: any) => !String(alias.$["android:name"]).startsWith(aliasPrefix)
    );
    mainApplication["activity-alias"] = [
      ...preserved,
      defaultAlias,
      ...iconAliases,
    ];

    return config;
  });
};

/**
 * Read `gradle.properties` if it already exists (used as a minSdk fallback).
 */
function readGradleProperties(platformProjectRoot: string): string | null {
  try {
    return fs.readFileSync(
      path.join(platformProjectRoot, "gradle.properties"),
      "utf8"
    );
  } catch {
    return null;
  }
}

/**
 * Generate, then write, a single density's foreground bitmap (padded + centered).
 */
async function writeForegroundBitmap(
  projectRoot: string,
  outputDir: string,
  iconKey: string,
  source: string,
  canvasSize: number
): Promise<void> {
  const fileName = foregroundBitmapName(iconKey);
  const { contentSize, inset } = foregroundLayout(canvasSize);

  const { source: scaledArt } = await generateImageAsync(
    {
      projectRoot,
      cacheType: `expo-app-icon-fg-${toResourceName(iconKey)}-${canvasSize}`,
    },
    {
      name: fileName,
      src: source,
      removeTransparency: false,
      resizeMode: "cover",
      width: contentSize,
      height: contentSize,
    }
  );

  const canvas = new jimpCompact(canvasSize, canvasSize, 0x00000000);
  canvas.composite(await jimpCompact.read(scaledArt), inset, inset);
  await fs.promises.writeFile(
    path.join(outputDir, fileName),
    await canvas.getBufferAsync(jimpCompact.MIME_PNG)
  );
}

/**
 * Generate, then write, the legacy square + round bitmaps for one density.
 */
async function writeLegacyBitmaps(
  projectRoot: string,
  outputDir: string,
  iconKey: string,
  source: string,
  canvasSize: number
): Promise<void> {
  const [squareName, roundName] = legacyBitmapNames(iconKey);
  const resource = toResourceName(iconKey);

  const { source: square } = await generateImageAsync(
    { projectRoot, cacheType: `expo-app-icon-${resource}-${canvasSize}` },
    {
      name: squareName,
      src: source,
      removeTransparency: true,
      backgroundColor: "#ffffff",
      resizeMode: "cover",
      width: canvasSize,
      height: canvasSize,
    }
  );
  await fs.promises.writeFile(path.join(outputDir, squareName), square);

  const { source: round } = await generateImageAsync(
    { projectRoot, cacheType: `expo-app-icon-round-${resource}-${canvasSize}` },
    {
      name: roundName,
      src: source,
      removeTransparency: false,
      resizeMode: "cover",
      width: canvasSize,
      height: canvasSize,
      borderRadius: canvasSize / 2,
    }
  );
  await fs.promises.writeFile(path.join(outputDir, roundName), round);
}

/**
 * Remove every mipmap/adaptive resource a previous run of this plugin emitted.
 */
async function cleanGeneratedResources(
  resPath: string,
  iconKeys: string[]
): Promise<void> {
  for (const densityDir of ANDROID_DENSITY_DIRS) {
    const dir = path.join(resPath, densityDir);
    const files = await fs.promises.readdir(dir).catch(() => []);
    for (const file of files) {
      if (file.startsWith("ic_launcher.") || file.startsWith("ic_launcher_round.")) {
        continue;
      }
      if (iconKeys.some((iconKey) => isOwnedMipmapFile(file, iconKey))) {
        await fs.promises.rm(path.join(dir, file), { force: true }).catch(() => null);
      }
    }
  }

  const adaptiveDir = path.join(resPath, ADAPTIVE_ICON_DIR);
  const adaptiveFiles = await fs.promises.readdir(adaptiveDir).catch(() => []);
  for (const file of adaptiveFiles) {
    if (iconKeys.some((iconKey) => isOwnedAdaptiveXml(file, iconKey))) {
      await fs.promises
        .rm(path.join(adaptiveDir, file), { force: true })
        .catch(() => null);
    }
  }
}

/**
 * Generate Android launcher icons as adaptive icons (so the launcher mask never
 * shrinks them) plus, when the project's minSdk is below 26, legacy bitmaps.
 */
export const withAndroidIconResources: ConfigPlugin<IconSet> = (
  config,
  icons
) => {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const { platformProjectRoot, projectRoot } = config.modRequest;
      const resPath = path.join(platformProjectRoot, ...ANDROID_RES_PATH);
      const adaptiveDir = path.join(resPath, ADAPTIVE_ICON_DIR);
      await fs.promises.mkdir(adaptiveDir, { recursive: true });

      const minSdkVersion = resolveMinSdkVersion(
        (config as any).plugins,
        readGradleProperties(platformProjectRoot)
      );
      const emitLegacy = needsLegacyBitmaps(minSdkVersion);

      const iconKeys = Object.keys(icons);
      await cleanGeneratedResources(resPath, iconKeys);

      for (const [iconKey, { android }] of Object.entries(icons)) {
        if (!android) continue;
        assertSourceExists(projectRoot, android, `Android icon for "${iconKey}"`);

        for (const densityDir of ANDROID_DENSITY_DIRS) {
          const canvasSize = ANDROID_DENSITY_SIZES[densityDir];
          const outputDir = path.join(resPath, densityDir);
          if (emitLegacy) {
            await writeLegacyBitmaps(
              projectRoot,
              outputDir,
              iconKey,
              android,
              canvasSize
            );
          }
          await writeForegroundBitmap(
            projectRoot,
            outputDir,
            iconKey,
            android,
            canvasSize
          );
        }

        const xml = adaptiveIconXml(foregroundBitmapName(iconKey).replace(/\.png$/, ""));
        const [squareXml, roundXml] = adaptiveXmlNames(iconKey);
        await fs.promises.writeFile(path.join(adaptiveDir, squareXml), xml);
        await fs.promises.writeFile(path.join(adaptiveDir, roundXml), xml);
      }

      return config;
    },
  ]);
};
