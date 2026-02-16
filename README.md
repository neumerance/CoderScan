# CodeScan – React Native Boilerplate

Expo React Native app with **Tailwind (NativeWind)**, **camera permission**, and **file/photo library permission** preconfigured.

## Stack

- **Expo SDK 54** – React Native tooling and runtime (compatible with Expo Go on device)
- **NativeWind v4** – Tailwind CSS for React Native (utility classes like `className="flex-1 bg-slate-100"`)
- **expo-camera** – Camera access and permission (plugin in `app.json`)
- **expo-media-library** – Photo library / file manager access (plugin in `app.json`)
- **expo-text-extractor** – On-device OCR (Google ML Kit / Apple Vision) for reading text near barcodes

## Setup

1. **Use Node 20.19.4+** (required for SDK 54). If you use `asdf`: `asdf set nodejs 20.19.4` (or add a `.tool-versions` with `nodejs 20.19.4`).

2. **Install dependencies**:

   ```bash
   npm install --legacy-peer-deps
   ```

   Use `--legacy-peer-deps` if you see peer dependency conflicts; the project is aligned to Expo SDK 54.

3. **Start the app**:

   ```bash
   npx expo start
   ```

   Then run on iOS simulator, Android emulator, or a physical device (Expo Go).

## OCR + Dev Client

OCR requires native code, so it does **not** run in Expo Go. Use a custom dev client instead:

1. Build and install a development client:

   ```bash
   npx expo run:ios
   # or
   npx expo run:android
   ```

2. Start Metro for dev client:

   ```bash
   npx expo start --dev-client
   ```

3. Open the installed development client app on your device/simulator and connect to this project.

## Running on Android

If you see **"Failed to resolve the Android SDK path"**, the Android SDK is not installed or not on your path.

1. **Install Android Studio** (or the [command-line tools only](https://developer.android.com/studio#command-tools)) and install the Android SDK via the SDK Manager.
2. **Set `ANDROID_HOME`** to your SDK path (often the default is `~/Library/Android/sdk` on macOS after Android Studio install):

   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
   ```

   Add these to your `~/.zshrc` (or `~/.bash_profile`) to make them permanent.

You can ignore this message if you only plan to run on **iOS** or **Expo Go** on a device.

## Permissions

- **Camera**: Declared via `expo-camera` plugin in `app.json` (`cameraPermission`, `microphonePermission`). Request at runtime with `useCameraPermissions()` from `expo-camera`.
- **File / photo library**: Declared via `expo-media-library` plugin in `app.json` (`photosPermission`, `savePhotosPermission`, `granularPermissions`). Request at runtime with `MediaLibrary.usePermissions()` from `expo-media-library`.

The app includes a simple UI to request both permissions and open the camera.

## Optional: app icon and splash

To add a custom icon and splash screen, add these to `app.json` and place the files under `assets/`:

- `assets/icon.png` (e.g. 1024×1024)
- `assets/splash-icon.png`
- `assets/adaptive-icon.png` (Android)

## Scripts

- `npm start` – Start Expo dev server
- `npm run android` – Run on Android
- `npm run ios` – Run on iOS
- `npm run web` – Run in web browser (limited native API support)
