# iOS Crash Fixes

## Issues Identified and Fixed

### 1. **Missing iOS Bundle Identifier** ✅
**Problem**: iOS builds require a `bundleIdentifier` in `app.json`. Without it, the app will crash on launch.

**Fix**: Added `bundleIdentifier: "com.saksham5.cricketcoachmobile"` to the iOS configuration in `app.json`.

### 2. **Missing iOS Deployment Target** ✅
**Problem**: iOS apps need a minimum deployment target specified.

**Fix**: Added `deploymentTarget: "13.4"` to support iOS 13.4 and above.

### 3. **Jetify Postinstall Script Causing iOS Issues** ✅
**Problem**: The `postinstall` script was running `npx jetify` on all platforms, including iOS/macOS. Jetify is Android-specific and can cause build failures on iOS.

**Fix**: 
- Created `scripts/postinstall.js` that only runs jetify on non-macOS platforms
- Updated `package.json` to use the new script
- Jetify now only runs for Android builds

### 4. **Missing Notification Permissions** ✅
**Problem**: The app uses `expo-notifications` but didn't have the required iOS notification permission description in `infoPlist`.

**Fix**: Added `NSUserNotificationsUsageDescription` and `UIBackgroundModes` with `remote-notification` to the iOS `infoPlist` configuration.

## Files Modified

1. **app.json**
   - Added `bundleIdentifier` for iOS
   - Added `deploymentTarget: "13.4"`
   - Added notification permissions to `infoPlist`

2. **package.json**
   - Updated `postinstall` script to use platform-specific logic

3. **scripts/postinstall.js** (new file)
   - Platform-aware script that skips jetify on macOS/iOS

## Next Steps

1. **Clean and rebuild the iOS app**:
   ```bash
   # Clear cache and rebuild
   npx expo prebuild --clean
   npx expo run:ios
   
   # Or if using EAS Build
   eas build --platform ios
   ```

2. **Test the app**:
   - Launch the app on iOS simulator or device
   - Verify it doesn't crash on startup
   - Test camera, photo library, and notification permissions

3. **If issues persist**, check:
   - Xcode console logs for specific error messages
   - Ensure all native dependencies are properly installed
   - Verify React Native and Expo versions are compatible

## Additional Notes

- The `App.tsx` file exists but is not used (the app uses Expo Router via `app/_layout.tsx`)
- This is fine and won't cause conflicts, but you may want to remove it for clarity
- All iOS permissions are now properly configured in `app.json`

