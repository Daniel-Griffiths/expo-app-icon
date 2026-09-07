<div align="center">
  <img src="https://raw.githubusercontent.com/Daniel-Griffiths/expo-app-icon/master/assets/icon.png" width="128" alt="expo-app-icon" />
</div>
  
# Expo App Icon
Programmatically change your app's icon at runtime in Expo.

## Install

```sh
npx expo install expo-app-icon
```

## Configure

Add the plugin to your `app.json` config and declare your icons. Each icon is just a key and an image path:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-app-icon",
        {
          "red": "./assets/icons/red.png",
          "blue": "./assets/icons/blue.png"
        }
      ]
    ]
  }
}
```

The same image is used for both platforms. For per-platform images, use the object form:

```json
{
  "red": "./assets/icons/red.png",
  "split": {
    "ios": "./assets/icons/split-ios.png",
    "android": "./assets/icons/split-android.png"
  }
}
```

For a Liquid Glass icon (iOS 26+), pass an Icon Composer `.icon`:

```json
{
  "glass": "./assets/icons/glass.icon",
  "frost": { "ios": "./assets/icons/frost.icon", "android": "./assets/icons/frost.png" }
}
```

The sibling `.png` (e.g. `glass.png`) is used for Android and as the fallback on older iOS — it must exist.

Then create a new build (the plugin runs during prebuild):

```sh
npx expo prebuild --clean
```

## Usage

Switch icons at runtime with the `useAppIcon` hook — no per-app persistence needed (the native module is the source of truth). `IconName` is typed to your configured keys — the config plugin writes an `expo-app-icon-env.d.ts` into your project root on every `expo config` / prebuild / export (add it to `.gitignore` next to `expo-env.d.ts`; it augments the package's empty `DynamicAppIconRegistry`, so the installed package is never modified and every app in a monorepo keeps its own union). Until that first run, `IconName` is `string`.

```tsx
import { useAppIcon, type IconName } from "expo-app-icon";

const ICONS: IconName[] = ["red", "blue"];

function IconPicker() {
  const { icon, setIcon, isDefault } = useAppIcon();

  return ICONS.map((name) => (
    <Pressable key={name} onPress={() => setIcon(name)}>
      <Text>
        {name}
        {icon === name ? " ✓" : ""}
      </Text>
    </Pressable>
  ));
}
```

- `icon` — the current icon key, or `null` for the default.
- `setIcon(name | null)` — switch icons; pass `null` to reset to the default. (The iOS timing fix is built in.)
- `isDefault` / `isSupported` — handy flags (`isSupported` is `false` on web).

Or call the underlying functions directly:

```ts
import { getAppIcon, setAppIcon } from "expo-app-icon";

const current = getAppIcon(); // icon name, or "DEFAULT"
setAppIcon("red");
setAppIcon(null); // reset to default
```
