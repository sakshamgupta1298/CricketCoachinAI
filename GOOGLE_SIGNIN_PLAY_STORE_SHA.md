# Google Sign-In in Closed Testing / Play Store (DEVELOPER_ERROR Fix)

When you see **DEVELOPER_ERROR** during Google Sign-In in **closed testing** (or any Play Store build), it’s because the app is signed with **Google Play App Signing**, not your local debug or upload keystore. You must add the **Play App Signing SHA-1** to Google Cloud Console.

## Recommended: One Android client with both SHA-1s

Use **one** Android OAuth client (e.g. "CrickCoachAI Android") and add **both** fingerprints to it:

| Fingerprint   | Used for |
|---------------|----------|
| Debug keystore SHA-1 | Local / APK builds |
| **Play App Signing SHA-1** | Closed testing / Play Store |

Then use that same client ID in the app for all builds. No need for a separate "Play" client.

## Why DEVELOPER_ERROR happens

| Build type        | Signing key           | SHA-1 to use                    |
|-------------------|-----------------------|----------------------------------|
| Local debug       | `~/.android/debug.keystore` | Debug keystore SHA-1        |
| Closed/Open testing, Production | **Google Play App Signing** | **Play App Signing SHA-1** |

If only the debug SHA-1 is in Google Cloud, release/closed-test builds get `DEVELOPER_ERROR`.

## Fix: Add Play App Signing SHA-1

### 1. Get the Play App Signing SHA-1

1. Open [Google Play Console](https://play.google.com/console/).
2. Select your app (**CrickCoach** / Cricket Coach).
3. Go to **Setup** → **App signing** (under “App integrity”).
4. In **App signing key certificate**, find **SHA-1 certificate fingerprint**.
5. Copy the SHA-1 value (and optionally SHA-256 if you add it elsewhere).

If you use **Google Play App Signing** (default for new apps), this is the key that actually signs the APK/AAB users (and testers) install.

### 2. Add it to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and select the **same project** used for your app’s OAuth (e.g. where your Android client ID lives).
2. Go to **APIs & Services** → **Credentials**.
3. Open your **Android** OAuth 2.0 client (the one with package name `com.saksham_5.cricketcoachmobile`).
4. Click **Add fingerprint** (or edit the client).
5. Paste the **Play App Signing SHA-1** from step 1.
6. Save.

You can keep your **debug** SHA-1 in the same client so both local builds and Play builds work.

### 3. Optional: Upload key SHA-1

If you upload an AAB signed with your own **upload key**, Play may also use that in some flows. You can add that SHA-1 too:

- **Play Console** → **Setup** → **App signing** → **Upload key certificate** → copy SHA-1.
- Add it as another fingerprint in the same Android OAuth client in Google Cloud Console.

### 4. After adding SHA-1

- No app update is required; the change is only in Google’s servers.
- Wait a few minutes for propagation, then try Google Sign-In again in a **closed testing** build (install from Play Console, not from a local APK).

## Checklist

- [ ] Play Console → **Setup** → **App signing** → copy **App signing key** SHA-1  
- [ ] Google Cloud → **Credentials** → Android OAuth client → **Add fingerprint** → paste Play SHA-1  
- [ ] (Optional) Add **Upload key** SHA-1 from App signing page  
- [ ] Keep existing **debug** SHA-1 for local `npx expo run:android`  
- [ ] Test Sign-In in an app installed from **closed testing** (not sideloaded debug APK)

Once the Play App Signing SHA-1 is in your Android OAuth client, `DEVELOPER_ERROR` in closed testing should stop.

---

## Still getting DEVELOPER_ERROR? Checklist

1. **One client, both SHAs (recommended)**  
   - In Google Cloud → Credentials → open **"CrickCoachAI Android"** (the `19q...` client).  
   - Ensure it has **two** SHA-1 fingerprints: your **debug** one and the **Play App Signing** one from Play Console (Setup → App integrity → App signing).  
   - The app uses this single client ID for all builds; no separate "Play" client needed.

2. **Package name**  
   - The Android OAuth client’s package name must be exactly: `com.saksham_5.cricketcoachmobile`.

3. **Correct SHA-1**  
   - Copy the SHA-1 from **App signing key certificate** (not Upload key) on the App signing page.  
   - Paste it into the Android OAuth client; no spaces, colons are fine (e.g. `AA:BB:CC:...`).

4. **Wait and retest**  
   - After saving, wait 5–10 minutes.  
   - Install the app **from the Play Console closed test track** (not a sideloaded APK) and try Google Sign-In again.

5. **If you use two clients**  
   - Ensure the build you installed from Play was built with the **Play** client ID and that the **CrickCoachAI Play** client has the **Play App Signing SHA-1** and package name `com.saksham_5.cricketcoachmobile`.
