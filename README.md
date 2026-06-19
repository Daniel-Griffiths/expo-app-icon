<div align="center">
  <img src="https://raw.githubusercontent.com/Daniel-Griffiths/expo-app-icon/master/assets/icon.png" width="128" alt="expo-app-icon" />
</div>
  
# Expo App Icon
Programmatically change your app's icon at runtime in Expo, with proper Android adaptive-icon support.

## Install

```sh
npx expo install expo-app-icon
```

## Configure

Add the plugin to your `app.json` config and declare your icons. Each icon needs an `ios` and/or `android` image path:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-app-icon",
        {
          "red": {
            "ios": "./assets/icons/red.png",
            "android": "./assets/icons/red.png"
          },
          "blue": {
            "ios": "./assets/icons/blue.png",
            "android": "./assets/icons/blue.png"
          }
        }
      ]
    ]
  }
}
```

Then create a new build (the plugin runs during prebuild):

```sh
npx expo prebuild --clean
```

## Usage

```ts
import { getAppIcon, setAppIcon } from "expo-app-icon";

// Get the name of the current icon ("DEFAULT" when none is set)
const current = getAppIcon();

// Switch to one of your configured icons by key
setAppIcon("red");

// Reset back to the default icon
setAppIcon(null);
```
