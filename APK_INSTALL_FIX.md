# 🔧 APK Installation Fix Guide

## 🚨 Problem: "There was a problem parsing the package"

This error occurs when Android cannot parse/install the APK file. Common causes:

1. **Corrupted APK file** - File is incomplete or damaged
2. **Invalid signature** - APK not properly signed
3. **Architecture mismatch** - APK built for different CPU architecture
4. **Incomplete download** - File transfer was interrupted
5. **Android version incompatibility** - APK requires newer Android version

## ✅ Solution: Rebuild APK Properly

### Option 1: Build with EAS Build (Recommended)

1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Configure EAS Build** (if not done):
   ```bash
   eas build:configure
   ```

4. **Build APK for Android**:
   ```bash
   # For preview/testing (faster, unsigned)
   eas build --platform android --profile preview
   
   # OR for production (slower, properly signed)
   eas build --platform android --profile production
   ```

5. **Download the APK**:
   - EAS will provide a download link
   - Download the APK to your computer
   - Transfer to your device

### Option 2: Build Locally with Expo

1. **Prebuild native code**:
   ```bash
   npx expo prebuild --clean
   ```

2. **Build APK** (requires Android Studio):
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

3. **Find the APK**:
   - Location: `android/app/build/outputs/apk/release/app-release.apk`

### Option 3: Use Expo Development Build

1. **Create development build**:
   ```bash
   eas build --platform android --profile development
   ```

2. **Install on device**:
   - Download and install the APK
   - This build includes development tools

## 📱 Installing the APK

### Method 1: Direct Install

1. **Transfer APK to device**:
   - Via USB: Copy APK to device
   - Via cloud: Upload to Google Drive/Dropbox and download on device
   - Via email: Email APK to yourself

2. **Enable Unknown Sources**:
   - Go to **Settings** → **Security** → Enable **Unknown Sources**
   - OR **Settings** → **Apps** → **Special Access** → **Install Unknown Apps**

3. **Install APK**:
   - Open file manager on device
   - Navigate to APK location
   - Tap the APK file
   - Tap **Install**

### Method 2: ADB Install (Recommended for Testing)

1. **Connect device via USB**:
   ```bash
   adb devices
   ```

2. **Install APK**:
   ```bash
   adb install -r build-1768931761207.apk
   ```

3. **If installation fails, check error**:
   ```bash
   adb install -r -d build-1768931761207.apk
   ```

## 🔍 Verify APK Integrity

### Check APK File:

1. **Verify file size**:
   - APK should be ~100-150MB for this app
   - If significantly smaller, file is corrupted

2. **Check file extension**:
   - Ensure file ends with `.apk` (not `.apk.zip` or `.zip`)

3. **Verify it's a valid ZIP** (APKs are ZIP files):
   ```bash
   unzip -t build-1768931761207.apk
   ```

## 🛠️ Troubleshooting

### Issue: "App not installed" or "Package appears to be corrupt"

**Solution:**
1. Uninstall any existing version of the app
2. Clear device cache
3. Rebuild APK with updated version code
4. Try installing again

### Issue: "Installation failed: INSTALL_FAILED_INVALID_APK"

**Solution:**
1. APK is corrupted - rebuild it
2. Check Android version compatibility
3. Ensure device has enough storage space

### Issue: "Installation failed: INSTALL_FAILED_UPDATE_INCOMPATIBLE"

**Solution:**
1. Uninstall existing app completely
2. Clear app data
3. Install new APK

### Issue: "Installation failed: INSTALL_FAILED_INSUFFICIENT_STORAGE"

**Solution:**
1. Free up space on device (need at least 200MB)
2. Clear app cache
3. Try again

## 📋 Update app.json for Better Compatibility

Add these to `app.json` under `android`:

```json
{
  "android": {
    "package": "com.saksham_5.cricketcoachmobile",
    "versionCode": 2,
    "minSdkVersion": 21,
    "targetSdkVersion": 34,
    "compileSdkVersion": 34,
    "edgeToEdgeEnabled": true,
    "permissions": [
      "CAMERA",
      "RECORD_AUDIO",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "INTERNET",
      "ACCESS_NETWORK_STATE"
    ],
    "usesCleartextTraffic": true
  }
}
```

**Note:** Increment `versionCode` each time you rebuild to avoid installation conflicts.

## 🚀 Quick Rebuild Command

```bash
# Clean and rebuild
npx expo prebuild --clean
eas build --platform android --profile preview
```

## ✅ Verification Checklist

- [ ] APK file size is reasonable (~100-150MB)
- [ ] APK file extension is `.apk`
- [ ] APK can be extracted as ZIP (valid format)
- [ ] Device has enough storage space
- [ ] Unknown sources enabled on device
- [ ] No existing app installed (or uninstalled)
- [ ] Android version is compatible (Android 5.0+)
- [ ] versionCode is incremented if rebuilding

## 💡 Best Practices

1. **Always use EAS Build** for production APKs
2. **Increment versionCode** for each build
3. **Test on multiple devices** before distribution
4. **Keep APK files** in a safe location
5. **Use ADB install** for testing (better error messages)

