import {
  ConfigPlugin,
  IOSConfig,
  withDangerousMod,
  withInfoPlist,
  withXcodeProject,
} from "expo/config-plugins";
import { generateImageAsync } from "@expo/image-utils";
// @ts-ignore - no types
import pbxFile from "xcode/lib/pbxFile";
import fs from "fs";
import path from "path";

import type { AppleIconTarget, ResolvedIconProps } from "./types";
import {
  appleIconBaseName,
  appleIconFileName,
  assertSourceExists,
  forEachAppleIcon,
  isAppleIconBundle,
} from "./icons";

/**
 * Xcode group / on-disk folder the generated flat icon assets live in.
 */
const APPLE_ASSET_GROUP = "AppIconVariants";

/**
 * Recursively copy an Icon Composer `.icon` bundle (a directory) into the
 * native project.
 */
async function copyDir(src: string, dest: string): Promise<void> {
  await fs.promises.cp(src, dest, { recursive: true });
}

type PlistIconEntry = {
  CFBundleIconFiles: string[];
};

/**
 * Add the generated icon files to the Xcode project (removing stale ones).
 */
export const withAppleIconAssets: ConfigPlugin<ResolvedIconProps> = (
  config,
  props
) => {
  return withXcodeProject(config, async (config) => {
    const groupPath = `${config.modRequest.projectName!}/${APPLE_ASSET_GROUP}`;
    const group = IOSConfig.XcodeUtils.ensureGroupRecursively(
      config.modResults,
      groupPath
    );
    const project = config.modResults;
    const options: any = {};

    const findGroupId = (section: string) =>
      Object.keys(project.hash.project.objects[section] ?? {}).find(
        (id) => project.hash.project.objects[section][id].name === group.name
      );

    const groupId = findGroupId("PBXGroup");
    if (!project.hash.project.objects["PBXVariantGroup"]) {
      project.hash.project.objects["PBXVariantGroup"] = {};
    }
    const variantGroupId = findGroupId("PBXVariantGroup");

    // Unlink any previously generated assets.
    for (const child of [...(group.children || [])] as {
      comment: string;
      value: string;
    }[]) {
      const file = new pbxFile(path.join(group.name, child.comment), options);
      file.target = options ? options.target : undefined;

      project.removeFromPbxBuildFileSection(file);
      project.removeFromPbxFileReferenceSection(file);
      if (groupId) {
        project.removeFromPbxGroup(file, groupId);
      } else if (variantGroupId) {
        project.removeFromPbxVariantGroup(file, variantGroupId);
      }
      project.removeFromPbxResourcesBuildPhase(file);
    }

    // Link the freshly generated assets.
    await forEachAppleIcon(props, async (iconKey, icon, variant) => {
      if (!icon.iosFallback) return;
      const fileName = appleIconFileName(iconKey, variant);
      const alreadyLinked = group?.children.some(
        ({ comment }: { comment: string }) => comment === fileName
      );
      if (alreadyLinked) return;

      config.modResults = IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath: path.join(groupPath, fileName),
        groupName: groupPath,
        project: config.modResults,
        isBuildFile: true,
        verbose: true,
      });
    });

    return config;
  });
};

/**
 * Register the alternate icons in Info.plist (per device family).
 */
export const withAppleAlternateIcons: ConfigPlugin<ResolvedIconProps> = (
  config,
  props
) => {
  return withInfoPlist(config, async (config) => {
    const phoneIcons: Record<string, PlistIconEntry> = {};
    const iconsByTarget: Partial<
      Record<NonNullable<AppleIconTarget>, Record<string, PlistIconEntry>>
    > = {};

    await forEachAppleIcon(props, async (iconKey, icon, variant) => {
      if (!icon.iosFallback) return;
      const entry: PlistIconEntry = {
        CFBundleIconFiles: [appleIconBaseName(iconKey, variant)],
      };
      if (variant.target) {
        (iconsByTarget[variant.target] ??= {})[iconKey] = entry;
      } else {
        phoneIcons[iconKey] = entry;
      }
    });

    const writeIconsBlock = (
      key: string,
      icons: Record<string, PlistIconEntry>
    ) => {
      const block = config.modResults[key];
      if (typeof block !== "object" || Array.isArray(block) || !block) {
        config.modResults[key] = {};
      }
      // @ts-ignore - plist values are loosely typed
      config.modResults[key].CFBundleAlternateIcons = icons;
      // @ts-ignore
      config.modResults[key].CFBundlePrimaryIcon = {
        CFBundleIconFiles: ["AppIcon"],
      };
    };

    writeIconsBlock("CFBundleIcons", phoneIcons);
    for (const [target, icons] of Object.entries(iconsByTarget)) {
      if (Object.keys(icons).length > 0) {
        writeIconsBlock(`CFBundleIcons~${target}`, icons);
      }
    }

    return config;
  });
};

/**
 * Render and write the actual icon PNGs into the iOS project.
 */
export const withAppleIconImages: ConfigPlugin<ResolvedIconProps> = (
  config,
  props
) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const iosRoot = path.join(
        config.modRequest.platformProjectRoot,
        config.modRequest.projectName!
      );
      const assetDir = path.join(iosRoot, APPLE_ASSET_GROUP);

      await fs.promises
        .rm(assetDir, { recursive: true, force: true })
        .catch(() => null);
      await fs.promises.mkdir(assetDir, { recursive: true });

      await forEachAppleIcon(props, async (iconKey, icon, variant) => {
        if (!icon.iosFallback) return;
        assertSourceExists(
          config.modRequest.projectRoot,
          icon.iosFallback,
          isAppleIconBundle(icon.ios ?? "")
            ? `iOS fallback .png for "${iconKey}" (sibling of the .icon)`
            : `iOS icon for "${iconKey}"`
        );
        const fileName = appleIconFileName(iconKey, variant);
        const { source } = await generateImageAsync(
          {
            projectRoot: config.modRequest.projectRoot,
            cacheType: `expo-app-icon-${variant.width}-${variant.height}`,
          },
          {
            name: fileName,
            src: icon.iosFallback,
            removeTransparency: true,
            backgroundColor: "#ffffff",
            resizeMode: "cover",
            width: variant.width,
            height: variant.height,
          }
        );
        await fs.promises.writeFile(path.join(assetDir, fileName), source);
      });

      return config;
    },
  ]);
};

/**
 * Keys whose iOS source is an Icon Composer `.icon` bundle (Liquid Glass).
 */
function glassIconKeys({ icons }: ResolvedIconProps): string[] {
  return Object.entries(icons)
    .filter(([, icon]) => icon.ios && isAppleIconBundle(icon.ios))
    .map(([key]) => key);
}

/**
 * Parse an `ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES` build setting (which
 * may be a JS array, a `("a", "b")` string, or a bare name) into plain names.
 */
function parseAlternateNames(value: unknown): string[] {
  const tokens = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.replace(/^\(|\)$/g, "").split(",")
      : [];
  return tokens
    .map((token) => String(token).trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

/**
 * Copy the `.icon` bundles into the native project so actool can compile them.
 */
export const withAppleGlassIconAssets: ConfigPlugin<ResolvedIconProps> = (
  config,
  props
) => {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const { icons } = props;
      const iosRoot = path.join(
        config.modRequest.platformProjectRoot,
        config.modRequest.projectName!
      );

      for (const key of glassIconKeys(props)) {
        const source = icons[key]!.ios!;
        assertSourceExists(
          config.modRequest.projectRoot,
          source,
          `iOS .icon bundle for "${key}"`
        );
        const dest = path.join(iosRoot, `${key}.icon`);
        await fs.promises
          .rm(dest, { recursive: true, force: true })
          .catch(() => null);
        await copyDir(
          path.resolve(config.modRequest.projectRoot, source),
          dest
        );
      }

      return config;
    },
  ]);
};

/**
 * Register the `.icon` bundles as alternate app icons via the asset-catalog
 * build settings, so iOS 26 renders them with the Liquid Glass treatment.
 * The flat-PNG alternates emitted elsewhere back the same names for older iOS
 * versions and register the names `setAlternateIconName` resolves.
 */
export const withAppleGlassIconBuildSettings: ConfigPlugin<ResolvedIconProps> = (
  config,
  props
) => {
  return withXcodeProject(config, (config) => {
    const keys = glassIconKeys(props);
    if (keys.length === 0) return config;

    const project = config.modResults;
    const groupPath = config.modRequest.projectName!;

    // Link each `.icon` bundle as a project resource (mirrors how the primary
    // `ios.icon` is wired), skipping any that are already linked.
    for (const key of keys) {
      const fileName = `${key}.icon`;
      const group = IOSConfig.XcodeUtils.ensureGroupRecursively(
        project,
        groupPath
      );
      const alreadyLinked = group?.children?.some(
        ({ comment }: { comment: string }) => comment === fileName
      );
      if (alreadyLinked) continue;
      config.modResults = IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath: path.join(groupPath, fileName),
        groupName: groupPath,
        project,
        isBuildFile: true,
        verbose: true,
      });
    }

    // Add the alternate names + opt every icon asset into the build, scoped to
    // the main app target only (extensions/widgets have their own icons and
    // must not inherit these names).
    for (const buildSettings of appTargetBuildSettings(project, groupPath)) {
      const existing = parseAlternateNames(
        buildSettings.ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES
      );
      const merged = Array.from(new Set([...existing, ...keys]));
      buildSettings.ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES = merged.map(
        (name) => `"${name}"`
      );
      buildSettings.ASSETCATALOG_COMPILER_INCLUDE_ALL_APPICON_ASSETS = "YES";
    }

    return config;
  });
};

/** Strip surrounding quotes from a pbxproj scalar value. */
function unquote(value: unknown): string {
  return String(value ?? "").replace(/^"|"$/g, "");
}

/**
 * The `buildSettings` objects of the main application target's build
 * configurations, located by product type + project name. Anything else
 * (extensions, watch/widget targets) is left untouched.
 */
function appTargetBuildSettings(project: any, projectName: string): any[] {
  const targets = project.pbxNativeTargetSection();
  let configListId: string | undefined;
  let fallbackConfigListId: string | undefined;
  for (const id of Object.keys(targets)) {
    const target = targets[id];
    if (!target || typeof target !== "object") continue;
    if (unquote(target.productType) !== "com.apple.product-type.application") {
      continue;
    }
    fallbackConfigListId ??= target.buildConfigurationList;
    if (unquote(target.name) === projectName) {
      configListId = target.buildConfigurationList;
      break;
    }
  }
  configListId ??= fallbackConfigListId;
  if (!configListId) return [];

  const list = project.pbxXCConfigurationList()[configListId];
  const section = project.pbxXCBuildConfigurationSection();
  return (list?.buildConfigurations ?? [])
    .map(({ value }: { value: string }) => section[value]?.buildSettings)
    .filter((settings: unknown) => settings && typeof settings === "object");
}
