# Rebuild Required for Google Sign-In

## Error Explanation

The error `'RNGoogleSignin' could not be found` occurs because `@react-native-google-signin/google-signin` is a **native module** that needs to be compiled into your app's binary. This cannot work with Expo Go - you **must** rebuild your app.

## Solution: Rebuild Your App

Since you're using `expo-dev-client`, you need to rebuild the native app to include the Google Sign-In module.

### For Android:

```bash
# Clean build (recommended)
cd android
./gradlew clean
cd ..

# Rebuild the app
npx expo run:android
```

### For iOS:

```bash
# Clean build (recommended)
cd ios
pod deintegrate
pod install
cd ..

# Rebuild the app
npx expo run:ios
```

## Important Notes

1. **You cannot use Expo Go** - Google Sign-In requires a development build
2. **Rebuild is required** - Native modules must be compiled into the app
3. **Development builds only** - This won't work with the standard Expo Go app
4. **Time required** - First build may take 5-10 minutes

## After Rebuilding

Once the rebuild completes:

1. The app will install on your device/emulator
2. The Google Sign-In button should appear on the login screen
3. You should see in console: `✅ [GOOGLE_SIGNIN] Configured for android/ios`

## Troubleshooting

### Still getting the error after rebuild?

1. **Make sure you're using the development build**, not Expo Go:
   - Check the app name - it should say your app name, not "Expo Go"
   - Development builds have a custom icon

2. **Clear cache and rebuild**:
   ```bash
   # Android
   npx expo start --clear
   cd android && ./gradlew clean && cd ..
   npx expo run:android
   
   # iOS
   npx expo start --clear
   cd ios && pod deintegrate && pod install && cd ..
   npx expo run:ios
   ```

3. **Verify the package is installed**:
   ```bash
   npm list @react-native-google-signin/google-signin
   ```

4. **Check node_modules**:
   ```bash
   # Reinstall if needed
   rm -rf node_modules
   npm install
   ```

### Build Errors?

- **Android**: Make sure you have Android SDK and build tools installed
- **iOS**: Make sure you have Xcode and CocoaPods installed
- Check the error messages for specific missing dependencies

## Quick Commands

```bash
# Android - Full clean rebuild
npx expo start --clear && cd android && ./gradlew clean && cd .. && npx expo run:android

# iOS - Full clean rebuild  
npx expo start --clear && cd ios && pod deintegrate && pod install && cd .. && npx expo run:ios
```

## Verification

After rebuilding, check the console logs when the app starts. You should see:

```
✅ [GOOGLE_SIGNIN] Configured for android
🔧 [GOOGLE_SIGNIN] Config check: { hasWebClientId: true, hasAndroidClientId: true, ... }
```

If you see warnings about the native module not being available, the rebuild didn't work - try the troubleshooting steps above.

