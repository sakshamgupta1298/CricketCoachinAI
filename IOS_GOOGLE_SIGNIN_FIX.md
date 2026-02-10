# iOS Google Sign-In Crash Fix

## Problem
Google Sign-In is crashing on iOS when clicking the button.

## Root Causes

1. **Missing Reversed Client ID in URL Schemes** - iOS requires the reversed client ID to be added to Info.plist
2. **App Not Rebuilt** - Native module needs to be compiled into the app
3. **Configuration Issues** - iOS client ID might not be properly configured

## Solution

### Step 1: Add Reversed Client ID to Info.plist ✅

I've already added the reversed client ID to your `ios/CrickCoachAI/Info.plist`:

```xml
<dict>
  <key>CFBundleURLSchemes</key>
  <array>
    <string>com.googleusercontent.apps.1002249784978-gmepmhh1mh8is050hb10be0q40j33k60</string>
  </array>
</dict>
```

**What is a reversed client ID?**
- It's your iOS client ID reversed
- Format: `com.googleusercontent.apps.{CLIENT_ID}`
- Your iOS Client ID: `1002249784978-gmepmhh1mh8is050hb10be0q40j33k60`
- Reversed: `com.googleusercontent.apps.1002249784978-gmepmhh1mh8is050hb10be0q40j33k60`

### Step 2: Rebuild the iOS App

**CRITICAL**: You must rebuild the app after adding the URL scheme:

```bash
# Clean rebuild
cd ios
rm -rf build Pods Podfile.lock
pod deintegrate
pod install
cd ..

# Rebuild
npx expo run:ios
```

Or use the rebuild script:
```bash
./rebuild-ios.sh
npx expo run:ios
```

### Step 3: Verify Configuration

After rebuilding, check that:

1. **Info.plist has the reversed client ID**:
   ```bash
   grep -A 2 "com.googleusercontent.apps" ios/CrickCoachAI/Info.plist
   ```

2. **Google Sign-In service is configured**:
   - Check console logs for: `✅ [GOOGLE_SIGNIN] Configured for ios`
   - Should show: `hasWebClientId: true, hasIosClientId: true`

3. **Client IDs are correct**:
   - iOS Client ID: `1002249784978-gmepmhh1mh8is050hb10be0q40j33k60`
   - Web Client ID: `1002249784978-e98d549dld5a0kdcunu59u15o4kcakk2`

### Step 4: Test

1. Open the app
2. Go to login screen
3. Tap "Continue with Google"
4. Should open Google Sign-In flow (not crash)

## Troubleshooting

### Still Crashing?

1. **Check if app was rebuilt**:
   - Make sure you ran `npx expo run:ios` after updating Info.plist
   - The native module must be compiled

2. **Verify URL scheme is in Info.plist**:
   ```bash
   cat ios/CrickCoachAI/Info.plist | grep -A 1 "com.googleusercontent.apps"
   ```
   Should show the reversed client ID

3. **Check console logs**:
   - Look for: `✅ [GOOGLE_SIGNIN] Configured for ios`
   - Look for any error messages about configuration

4. **Verify Google Cloud Console**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Check that iOS OAuth client exists
   - Verify bundle ID matches: `com.saksham5.cricketcoachmobile`

5. **Check Xcode logs**:
   - Open Xcode
   - Run the app
   - Check the console for detailed error messages

### Common Errors

**Error: "Native module not available"**
- Solution: Rebuild the app with `npx expo run:ios`

**Error: "Configuration error"**
- Solution: Check that both `iosClientId` and `webClientId` are set correctly

**Error: "URL scheme not found"**
- Solution: Make sure reversed client ID is in Info.plist and app is rebuilt

**App crashes immediately**
- Solution: Check Xcode console for crash logs
- Usually means native module isn't linked properly
- Rebuild required

## Additional Notes

- The reversed client ID is **required** for iOS Google Sign-In
- It must be added to `CFBundleURLTypes` in Info.plist
- The app **must be rebuilt** after adding it
- Using Expo Go won't work - you need a development build

## Verification Checklist

- [ ] Reversed client ID added to Info.plist
- [ ] App rebuilt with `npx expo run:ios`
- [ ] Console shows: `✅ [GOOGLE_SIGNIN] Configured for ios`
- [ ] Google Sign-In button doesn't crash
- [ ] Google Sign-In flow opens when button is tapped

## Next Steps

1. ✅ Reversed client ID added to Info.plist
2. ⏳ Rebuild the app: `npx expo run:ios`
3. ⏳ Test Google Sign-In
4. ⏳ Verify it works

