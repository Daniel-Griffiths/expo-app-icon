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
  "blue": { "image": "./assets/icons/blue.png" },
  "split": {
    "ios": "./assets/icons/split-ios.png",
    "android": "./assets/icons/split-android.png"
  }
}
```

- `image` sets both platforms; `ios` / `android` override it per platform.

Then create a new build (the plugin runs during prebuild):

```sh
npx expo prebuild --clean
```

## Usage

Switch icons at runtime with the `useAppIcon` hook — no per-app persistence needed (the native module is the source of truth). `IconName` is typed to your configured keys:

```tsx
import { useAppIcon, type IconName } from "expo-app-icon";

const ICONS: IconName[] = ["red", "blue"];

function IconPicker() {
  const { icon, setIcon, isDefault } = useAppIcon();

  return ICONS.map((name) => (
    <Pressable key={name} onPress={() => setIcon(name)}>
      <Text>{name}{icon === name ? " ✓" : ""}</Text>
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
