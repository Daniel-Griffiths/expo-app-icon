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
import { appleIconBaseName, appleIconFileName, forEachAppleIcon } from "./icons";

/**
 * Xcode group / on-disk folder the generated icon assets live in.
 */
const APPLE_ASSET_GROUP = "AppIconVariants";

type PlistIconEntry = {
  CFBundleIconFiles: string[];
  UIPrerenderedIcon: boolean;
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
    await forEachAppleIcon(props, async (iconKey, _icon, variant) => {
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
      if (!icon.ios) return;
      const entry: PlistIconEntry = {
        CFBundleIconFiles: [appleIconBaseName(iconKey, variant)],
        UIPrerenderedIcon: !!icon.prerendered,
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
        if (!icon.ios) return;
        const fileName = appleIconFileName(iconKey, variant);
        const { source } = await generateImageAsync(
          {
            projectRoot: config.modRequest.projectRoot,
            cacheType: `expo-app-icon-${variant.width}-${variant.height}`,
          },
          {
            name: fileName,
            src: icon.ios,
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
