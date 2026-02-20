# iOS Network Connection Fix Guide

## 🚨 Issue
iOS app cannot connect to HTTP backend (`http://139.59.1.59`) even though Android works fine.

## ✅ Configuration Status

### Current Configuration (Verified)
- ✅ `Info.plist` has `NSAllowsArbitraryLoads: true`
- ✅ `Info.plist` has exception domain for `139.59.1.59`
- ✅ Network security plugin is configured correctly
- ✅ `app.json` has proper scheme configuration

## 🔍 Critical Check: Are you using Expo Go?

**IMPORTANT**: If you're using the standard **Expo Go** app, HTTP connections will NOT work, even with ATS disabled. Expo Go has its own network restrictions.

### How to Check:
1. Look at the app icon on your device
2. If it says "Expo Go" - **this won't work with HTTP**
3. You MUST use a **development build** (custom dev client)

### Solution: Use Development Build

You're already set up for this! Your `package.json` includes `expo-dev-client`.

## 🛠️ Complete Fix Steps

### Step 1: Uninstall the App
**CRITICAL**: Completely uninstall the app from your iOS device/simulator before rebuilding.

### Step 2: Clean Rebuild
Run the rebuild script:
```bash
./rebuild-ios.sh
```

Or manually:
```bash
# Clean everything
rm -rf .expo
rm -rf ios/build
rm -rf ios/Pods
rm -rf ios/Podfile.lock

# Rebuild
npx expo prebuild --clean --platform ios
cd ios && pod install && cd ..
```

### Step 3: Build and Run
```bash
# Option 1: Using Expo CLI
npx expo run:ios

# Option 2: Using Xcode
open ios/CrickCoachAI.xcworkspace
# Then build and run from Xcode
```

### Step 4: Verify Info.plist
After rebuilding, verify the settings:
```bash
grep -A 5 "NSAppTransportSecurity" ios/CrickCoachAI/Info.plist
```

You should see:
- `NSAllowsArbitraryLoads` = `true`
- `139.59.1.59` in exception domains

## 🔍 Troubleshooting

### If still not working:

1. **Check if using Expo Go**:
   - If yes, you MUST create a development build
   - Run: `npx expo run:ios` (this creates a dev build)

2. **Verify the build is using your custom Info.plist**:
   ```bash
   # Check the built app's Info.plist
   # The path will be in the build output
   ```

3. **Check Xcode build settings**:
   - Open `ios/CrickCoachAI.xcworkspace` in Xcode
   - Go to Build Settings
   - Search for "Info.plist"
   - Verify it's using the correct Info.plist file

4. **Check device logs**:
   ```bash
   # Connect device and check logs
   xcrun simctl spawn booted log stream --predicate 'processImagePath contains "CrickCoach"'
   ```

5. **Test network connectivity**:
   - The logs show the app is trying to connect
   - Check if you see any ATS-related errors in the logs
   - Look for errors like "App Transport Security" or "ATS"

## 📱 Alternative: Test with Simulator First

1. Open iOS Simulator
2. Run: `npx expo run:ios`
3. Check if it works in simulator
4. If simulator works, the issue might be device-specific

## 🔧 If Nothing Works: Use HTTPS

If HTTP still doesn't work after all steps, consider:
1. Setting up HTTPS on your backend (recommended for production)
2. Using a reverse proxy with SSL certificate
3. Using a service like ngrok for HTTPS tunneling

## ✅ Verification Checklist

- [ ] App is completely uninstalled from device
- [ ] Clean rebuild completed (`npx expo prebuild --clean`)
- [ ] Using development build (NOT Expo Go)
- [ ] Info.plist has `NSAllowsArbitraryLoads: true`
- [ ] Info.plist has `139.59.1.59` in exception domains
- [ ] App rebuilt and reinstalled
- [ ] Checked device logs for ATS errors

## 📞 Still Having Issues?

If you're still seeing the same issue after following all steps:
1. Share the exact error message from the logs
2. Confirm you're using a development build (not Expo Go)
3. Share the output of: `grep -A 10 "NSAppTransportSecurity" ios/CrickCoachAI/Info.plist`

