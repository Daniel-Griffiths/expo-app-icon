/**
 * Registry of the project's configured icon keys.
 *
 * Shipped empty on purpose: the config plugin writes an `expo-app-icon-env.d.ts` into the
 * project root that augments this interface with the project's `IconName` union, so the
 * installed package is never modified and projects sharing one copy of it (a monorepo)
 * each keep their own icon names.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DynamicAppIconRegistry {}

/**
 * Union of the icon keys declared in the plugin config, read from the registry the generated
 * `expo-app-icon-env.d.ts` augments; widened to `string` until the project has run
 * `expo config` / prebuild once (there is no generated file yet).
 */
export type IconName = DynamicAppIconRegistry extends { IconName: infer T extends string }
  ? T
  : string;
