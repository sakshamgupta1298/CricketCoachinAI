# Fix DEVELOPER_ERROR for Google Sign-In in Closed Testing

Do these steps **in order**. Both **Firebase** and **Google Cloud** must have the Play SHA-1.

---

## Step 1: Get the Play App Signing SHA-1

1. Open [Google Play Console](https://play.google.com/console/) → your app **CrickCoach AI**.
2. Go to **Setup** → **App integrity** → **App signing**.
3. Under **App signing key certificate**, copy the **SHA-1 certificate fingerprint** (e.g. `AA:BB:CC:...`).  
   Use this exact value in Step 2 and Step 3.

---

## Step 2: Add Play SHA-1 in Firebase

1. Open [Firebase Console](https://console.firebase.google.com/) → project **crickcoachai**.
2. Click the **gear** → **Project settings**.
3. Under **Your apps**, select the **Android** app (`com.saksham_5.cricketcoachmobile`).
4. Click **Add fingerprint** and paste the **Play App Signing SHA-1** from Step 1. Save.
5. **Download** the new **google-services.json** (same page, “Download google-services.json”).
6. Replace your project’s file:
   - Copy the downloaded file to:  
     `android/app/google-services.json`  
   - Overwrite the existing file.

---

## Step 3: Add Play SHA-1 in Google Cloud (OAuth client)

1. Open [Google Cloud Console](https://console.cloud.google.com/) → project **CrickCoachAI**.
2. Go to **APIs & Services** → **Credentials**.
3. Open **CrickCoachAI Android** (the Android OAuth 2.0 client, not “CrickCoachAI Play”).
4. Under **SHA-1 certificate fingerprint**, click **+ ADD FINGERPRINT**.
5. Paste the **same Play App Signing SHA-1** from Step 1. Save.
6. Confirm **Package name** is exactly: `com.saksham_5.cricketcoachmobile`.

---

## Step 4: Rebuild and upload

1. Rebuild the Android app (the new `google-services.json` must be in the build):
   ```bash
   npx expo run:android
   ```
   Or for a release AAB for Play:
   ```bash
   eas build --platform android --profile production
   ```
2. Upload the new build to the **closed testing** track in Play Console.
3. Install the app **from the closed test** (not a sideloaded APK) and try Google Sign-In again.

---

## Checklist

- [ ] Play Console: Copied **App signing key** SHA-1 (not Upload key).
- [ ] Firebase: Added that SHA-1 to the Android app and **re-downloaded** `google-services.json`.
- [ ] Replaced `android/app/google-services.json` with the new file.
- [ ] Google Cloud: Added the same SHA-1 to **CrickCoachAI Android** OAuth client.
- [ ] Package name on that client is `com.saksham_5.cricketcoachmobile`.
- [ ] Rebuilt the app and uploaded to closed testing.
- [ ] Tested Sign-In on the build installed from the Play closed test link.

---

## If it still fails

- Wait 10–15 minutes after saving in Firebase and Google Cloud, then try again.
- Confirm you’re testing the **new** build (the one that includes the updated `google-services.json`), installed from the **closed test** track.
- In Google Cloud, ensure **CrickCoachAI Android** has **two** SHA-1s: your **debug** one and the **Play App Signing** one.
