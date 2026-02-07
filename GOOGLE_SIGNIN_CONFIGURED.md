# Google Sign-In Configuration Complete ✅

Your Google OAuth client IDs have been configured in the project.

## Configuration Summary

- **Web Client ID**: `1002249784978-e98d549dld5a0kdcunu59u15o4kcakk2.apps.googleusercontent.com`
- **iOS Client ID**: `1002249784978-gmepmhh1mh8is050hb10be0q40j33k60.apps.googleusercontent.com`
- **Android Client ID**: `1002249784978-19qb1v8bbcn1hulvsci9tdfngulmvf7g.apps.googleusercontent.com`

## Next Steps

### 1. Create .env File

Since `.env` is gitignored, you need to create it manually:

```bash
# Copy the example file
cp env.example .env
```

Or create `.env` manually with these values:

```env
# Google Sign-In OAuth Credentials (iOS & Android)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1002249784978-e98d549dld5a0kdcunu59u15o4kcakk2.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=1002249784978-gmepmhh1mh8is050hb10be0q40j33k60.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=1002249784978-19qb1v8bbcn1hulvsci9tdfngulmvf7g.apps.googleusercontent.com
```

### 2. Restart Development Server

After creating/updating `.env`, restart your Expo development server:

```bash
# Stop the current server (Ctrl+C)
# Then restart
npx expo start --clear
```

**Important**: Environment variables are loaded at build time, so you need to restart the server.

### 3. Rebuild Native Apps

Since Google Sign-In uses native modules, you need to rebuild your app:

```bash
# For Android
npx expo run:android

# For iOS
npx expo run:ios
```

### 4. Verify Configuration

When the app starts, check the console logs. You should see:

```
✅ [GOOGLE_SIGNIN] Configured for ios
🔧 [GOOGLE_SIGNIN] Config check: { hasWebClientId: true, hasIosClientId: true, ... }
```

or

```
✅ [GOOGLE_SIGNIN] Configured for android
🔧 [GOOGLE_SIGNIN] Config check: { hasWebClientId: true, hasAndroidClientId: true, ... }
```

## Android Additional Setup

For Android, you also need to add your SHA-1 fingerprint to Google Cloud Console:

1. Get your SHA-1 fingerprint:
   ```bash
   # Debug keystore
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   
   # Release keystore (if you have one)
   keytool -list -v -keystore your-release-key.keystore -alias your-key-alias
   ```

2. Go to [Google Cloud Console](https://console.cloud.google.com/)
3. Navigate to **APIs & Services** > **Credentials**
4. Click on your Android OAuth client
5. Add the SHA-1 fingerprint
6. Save

## Testing

1. Open the login screen
2. You should see the "Continue with Google" button (iOS/Android only)
3. Tap the button
4. Select your Google account
5. Grant permissions
6. You should be signed in and redirected to the home screen

## Troubleshooting

### Environment Variables Not Loading

- Make sure `.env` file exists in the project root
- Restart the Expo development server with `--clear` flag
- Check that variable names start with `EXPO_PUBLIC_`
- Rebuild the native app (environment variables are baked in at build time)

### "DEVELOPER_ERROR" on Android

- Verify SHA-1 fingerprint is added in Google Cloud Console
- Make sure package name matches: `com.saksham_5.cricketcoachmobile`
- Rebuild the app after adding SHA-1

### "Sign in was cancelled"

- This is normal if the user cancels the sign-in flow
- No action needed

### Configuration Not Found

- Check console logs for configuration status
- Verify all three client IDs are set in `.env`
- Make sure you've rebuilt the app after setting environment variables

## Notes

- The `.env` file is gitignored and won't be committed to version control
- Environment variables must start with `EXPO_PUBLIC_` to be available in the app
- You need to rebuild native apps for environment variable changes to take effect
- The configuration is platform-specific (iOS uses iosClientId + webClientId, Android uses webClientId + androidClientId)

