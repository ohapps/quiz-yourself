# Installing Quiz Yourself on a Physical Device

This guide explains how to get the "Quiz Yourself" app running on your physical iPhone or Android device.

## Prerequisites

To use the build commands (`eas`), you must install the Expo Application Services (EAS) CLI globally on your machine:

1.  **Install EAS CLI**:
    ```bash
    npm install -g eas-cli
    ```
2.  **Verify Installation**:
    ```bash
    eas --version
    ```
3.  **Login to Expo**:
    ```bash
    eas login
    ```
    *(If you don't have an account, you can create one during the login process or at [expo.dev](https://expo.dev))*

---

## Option 1: Expo Go (Simplest for Development)

This is the fastest way to test the app while you are developing.

1.  **Install Expo Go**: Download the "Expo Go" app from the [Apple App Store](https://apps.apple.com/app/expo-go/id982107779) or [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent).
2.  **Connect to the Same Wi-Fi**: Ensure your computer and your phone are on the same Wi-Fi network.
3.  **Start the Server**:
    ```bash
    npm start
    ```
4.  **Scan the QR Code**:
    *   **Android**: Open the Expo Go app and tap "Scan QR Code".
    *   **iOS**: Open the default Camera app and scan the QR code shown in your terminal. Follow the prompt to open in Expo Go.

---

## Option 2: Development Builds (Recommended for Native Features)

Since this app uses `expo-sqlite`, you may eventually want a **Development Build**. This creates a custom version of Expo Go that includes exactly the native code your app needs.

1.  **Install EAS CLI**:
    ```bash
    npm install -g eas-cli
    ```
2.  **Login to Expo**:
    ```bash
    eas login
    ```
3.  **Configure Project**:
    ```bash
    eas build:configure
    ```
4.  **Create a Development Build**:
    *   **iOS**: `eas build --profile development --platform ios`
    *   **Android**: `eas build --profile development --platform android`
5.  **Install the resulting file**: Follow the link provided by EAS to install the build on your device.
6.  **Run with the build**:
    ```bash
    npx expo start --dev-client
    ```

---

## Option 3: Internal Distribution (Testing without Expo Go)

To share the app with others or test it as a standalone app:

1.  **Build an Ad-Hoc/Preview Build**:
    ```bash
    eas build --profile preview --platform all
    ```
2.  **Install via QR/Link**: EAS will provide a URL or QR code that allows you to download the `.ipa` (iOS) or `.apk` (Android) directly to your phone.

---

## Option 4: TestFlight / App Store Distribution (Production)

To distribute your app to testers via Apple TestFlight (or submit to the App Store):

### 1. Build and Auto-Submit in One Step
The simplest way is to build the production profile and submit it directly in one command:
```bash
eas build --platform ios --profile production --auto-submit
```
Once the cloud build finishes, EAS will automatically submit it to Apple.

### 2. Submit an Already Built Archive
If you have already built a production version and want to upload it to TestFlight, you do not need to rebuild the app.

#### Method A: Interactive Selection
Run the submit command:
```bash
eas submit --platform ios
```
When prompted, select **"Select a build from EAS"**. The CLI will fetch your recent builds and let you choose which one to upload.

#### Method B: Submit via Build ID
If you know the specific EAS Build ID (found in your console terminal logs or on the [Expo Dashboard](https://expo.dev)):
```bash
eas submit --platform ios --id <YOUR_BUILD_ID>
```

#### Method C: Submit via File URL
If you have a direct URL to the build file (`.ipa`):
```bash
eas submit --platform ios --url <URL_TO_IPA_FILE>
```

---

## Build Expiration (iOS)

On iOS, buildings have different expiration rules depending on how they were signed:

| Method | Expiration | Notes |
| :--- | :--- | :--- |
| **Expo Go** | N/A | Works as long as your dev server is running. |
| **TestFlight** | 90 Days | After 90 days, the build will no longer open. |
| **Ad-Hoc / Dev Build** | 1 Year | Signed with a paid Apple Developer account. |
| **Free Apple ID** | 7 Days | If you sign the app with a free account, it must be re-installed every week. |

---

## Common Errors

### 🍎 Apple Developer: "No team associated"
**Cause**: You are using `eas build` for iOS without a paid Apple Developer account ($99/year).
**Fix**:
*   **For Development**: Stick to **Expo Go** (Option 1). It does not require a paid account.
*   **For Standalone**: You must build locally using Xcode. Open the `ios` folder in Xcode and sign with your Personal Team. Note: This build will only last **7 days** on your device.

### 🤖 Android: "AAPT: error: file failed to compile"
**Cause**: An image in your `assets` folder has the wrong extension (e.g., a `.jpg` file named `.png`). Android's build tool (AAPT2) is very strict about this.
**Fix**: Verify your images are the correct format. I have already fixed this for the current `logo.png` by converting it from a JPEG to a proper PNG.

---

## Troubleshooting

*   **Network Issues**: If the QR code doesn't work, try starting with the tunnel flag: `npx expo start --tunnel`.
*   **iOS Permission**: If you get an "Untrusted Developer" error on iOS, go to **Settings > General > VPN & Device Management** and trust the developer profile.
*   **Database Persistence**: Note that the SQLite database is local to your device. If you delete the app, your custom questions will be lost.
