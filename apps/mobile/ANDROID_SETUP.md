# Android Setup Guide — Secure CBT Mobile App

This guide covers everything needed to run the Secure CBT Flutter app on Android (emulator or physical device).

---

## Part A: Android Emulator Setup (First Time)

### 1. Install Android Studio

1. Download from **https://developer.android.com/studio**
2. Run the installer `.exe`
3. During installation, ensure **Android Virtual Device (AVD)** is checked
4. Default install path: `C:\Program Files\Android\Android Studio`

### 2. Install Android SDK

1. Launch Android Studio
2. **More Actions → SDK Manager**
3. **SDK Platforms** tab — check **Android API 34**
4. **SDK Tools** tab — check:
   - Android SDK Build-Tools
   - Android Emulator
   - Android SDK Platform-Tools
   - Intel x86 Emulator Accelerator (HAXM) — if on Intel CPU
5. Click **Apply** and wait for downloads

### 3. Set Environment Variables

1. Open **Start** → type `env` → click **Edit environment variables for your account**
2. Click **New** (User variables):
   - **Variable name**: `ANDROID_HOME`
   - **Variable value**: `C:\Users\ASUS\AppData\Local\Android\Sdk`
3. Edit the **Path** variable → add these entries:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\emulator`
   - `%ANDROID_HOME%\tools`
   - `%ANDROID_HOME%\tools\bin`
4. Click **OK** on all dialogs
5. **Restart your terminal**

### 4. Verify & Accept Licenses

```powershell
flutter doctor --android-licenses
```
Type `y` for each prompt. Then:
```powershell
flutter doctor
```
Expected output: `[✓] Android toolchain - develop for Android devices`

### 5. Create Android Emulator (AVD)

**Via Android Studio (recommended):**

1. Android Studio → **More Actions → Virtual Device Manager**
2. Click **Create Virtual Device**
3. Choose **Pixel 6** → Next
4. Select system image **UpsideDownCake API 34** (download if needed) → Next
5. Name it `pixel6` → **Finish**

**Via command line:**

```powershell
flutter emulators --create --name pixel6
```

### 6. Launch & Run

```powershell
# List available emulators
flutter emulators

# Launch the emulator
flutter emulators --launch pixel6

# Wait 30-60 seconds for full boot, then:
cd apps/mobile
flutter run
```

---

## Part B: Test Credentials (Seeded Data)

Once the app is running on the emulator:

| Screen | What to Enter |
|--------|---------------|
| Login | `202501001` / `202501001` (student account) |
| Token | `D87FDEB6` (UTS Matematika exam token — re-run `pnpm db:seed` if token expired) |

The exam screen should show UTS Matematika questions with a timer, answer options, and navigation panel.

---

## Part C: Build Debug APK (Optional)

Once the emulator is working:

```powershell
# From apps/mobile directory
flutter build apk --debug
```

Output APK: `build/app/outputs/flutter-apk/app-debug.apk`

Transfer to a physical Android device via USB, email, or cloud storage to install and test.

---

## Part D: Troubleshooting

| Problem | Fix |
|---------|-----|
| `flutter doctor` shows Android license not accepted | Run `flutter doctor --android-licenses` |
| `ANDROID_HOME` not found | Verify: `dir %ANDROID_HOME%` should list folders |
| Emulator black screen / won't start | In AVD Manager, edit AVD → Graphics: **Software - GLES 2.0** |
| `flutter run` can't find device | Wait longer for boot; check `adb devices` |
| HAXM install fails (Intel CPU) | Enable **VT-x** in BIOS, or use ARM system image |
| Token expired or invalid | Re-run `pnpm run db:seed` from repo root |
| Windows Hyper-V conflict with HAXM | In AVD Manager, use an **ARM64** image instead of x86 |

---

## Part E: Android Security Configuration (Already Implemented)

These security features are configured in the Android platform files:

### `android/app/build.gradle.kts`
- `minSdk = 24`, `targetSdk = 34`
- Dependencies for screen security and lifecycle awareness

### `AndroidManifest.xml`
- `FLAG_SECURE` — prevents screenshots and screen recording
- `BIND_DEVICE_ADMIN` — enables Lock Task Mode (kiosk)
- `INTERNET` / `ACCESS_NETWORK_STATE` — network access
- `WAKE_LOCK` — keeps screen on during exam

### `MainActivity.kt`
- `FLAG_SECURE` applied via `window.setFlags`
- MethodChannels registered for fullscreen and lifecycle monitoring
- Kotlin Native Plugin hooks for Screen Security and App Lifecycle
