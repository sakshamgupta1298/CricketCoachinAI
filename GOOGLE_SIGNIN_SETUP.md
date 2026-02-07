# Google Sign-In Setup Guide (iOS & Android Only)

This guide will help you set up Google Sign-In for the CrickCoach AI app. **Note: Google Sign-In is configured for iOS and Android platforms only.**

## Prerequisites

1. A Google Cloud Console account
2. Access to your project's Google Cloud Console

## Step 1: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. If prompted, configure the OAuth consent screen first:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in the required information
   - Add scopes: `email` and `profile`
   - Add test users if needed

## Step 2: Create OAuth Client IDs

### For Android:
1. Click **Create Credentials** > **OAuth client ID**
2. Select **Android** as the application type
3. Enter your package name: `com.saksham_5.cricketcoachmobile`
4. Get your SHA-1 certificate fingerprint:
   ```bash
   # For debug keystore (development)
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   
   # For release keystore (production)
   keytool -list -v -keystore your-release-key.keystore -alias your-key-alias
   ```
5. Copy the SHA-1 fingerprint and paste it in the Google Cloud Console
6. Click **Create**
7. Copy the **Client ID** (this is your Android Client ID)

### For iOS:
1. Click **Create Credentials** > **OAuth client ID**
2. Select **iOS** as the application type
3. Enter your bundle identifier: `com.saksham5.cricketcoachmobile`
4. Click **Create**
5. Copy the **Client ID** (this is your iOS Client ID)

### For Web (Required for iOS and Android):
**Important:** Even though we're only using iOS and Android, you still need a Web Client ID because:
- iOS requires both `iosClientId` and `webClientId`
- Android uses `webClientId` (or `androidClientId` if provided)

1. Click **Create Credentials** > **OAuth client ID**
2. Select **Web application** as the application type
3. Add authorized redirect URIs (if needed for your backend)
4. Click **Create**
5. Copy the **Client ID** (this is your Web Client ID - **required for both iOS and Android**)

## Step 3: Configure Environment Variables

Create a `.env` file in the root of your project (or add to your existing environment configuration):

```env
# Required for both iOS and Android
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com

# Required for iOS
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com

# Optional for Android (will use webClientId if not provided)
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
```

**Important:** 
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is **required** for both iOS and Android
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` is **required** for iOS
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` is optional for Android (will fallback to webClientId)

## Step 4: Google Sign-In Service Configuration

The Google Sign-In service is located at `src/services/googleSignIn.ts` and is **automatically configured for iOS and Android only**. The service:

- Only initializes on iOS and Android platforms
- Uses platform-specific configuration:
  - **iOS**: Requires both `iosClientId` and `webClientId`
  - **Android**: Uses `webClientId` (or `androidClientId` if provided)
- All functions include platform checks to ensure they only work on iOS/Android

The configuration is handled automatically based on the platform, so you just need to set the environment variables.

## Step 5: Backend Setup

Your backend needs to handle Google Sign-In. The endpoint should be:

**POST** `/api/auth/google-signin`

**Request Body:**
```json
{
  "id_token": "google-id-token",
  "email": "user@example.com",
  "name": "User Name",
  "photo": "https://photo-url.com/photo.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token",
  "user": {
    "id": 1,
    "username": "user",
    "email": "user@example.com"
  }
}
```

### Backend Implementation Example (Python/Flask):

```python
from google.oauth2 import id_token
from google.auth.transport import requests

@app.route('/api/auth/google-signin', methods=['POST'])
def google_signin():
    try:
        data = request.get_json()
        id_token_str = data.get('id_token')
        email = data.get('email')
        name = data.get('name')
        photo = data.get('photo')
        
        # Verify the Google ID token
        try:
            idinfo = id_token.verify_oauth2_token(
                id_token_str, 
                requests.Request(), 
                GOOGLE_CLIENT_ID  # Your web client ID
            )
            
            # Check if user exists
            user = get_user_by_email(email)
            
            if not user:
                # Create new user
                user = create_user_from_google(email, name, photo)
            
            # Generate JWT token
            token = generate_jwt_token(user['id'], user['username'])
            
            return jsonify({
                'success': True,
                'token': token,
                'user': user
            })
        except ValueError:
            return jsonify({'error': 'Invalid Google token'}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

## Step 6: Test the Implementation

1. Make sure all environment variables are set
2. Rebuild your app (native modules require a rebuild):
   ```bash
   # For Android
   npx expo run:android
   
   # For iOS
   npx expo run:ios
   ```
3. Test Google Sign-In on the login screen
4. Check the console logs for any errors

## Troubleshooting

### "DEVELOPER_ERROR" on Android
- Make sure your SHA-1 fingerprint is correctly added in Google Cloud Console
- Verify the package name matches exactly
- Rebuild the app after adding SHA-1

### "Sign in was cancelled"
- This is normal if the user cancels the sign-in flow
- No action needed

### "Google Play Services not available"
- Make sure Google Play Services is installed and updated on the device
- This only applies to Android

### Token verification fails on backend
- Make sure you're using the correct `webClientId` for token verification
- Check that the token hasn't expired
- Verify the Google OAuth library is properly installed on the backend

## Additional Resources

- [React Native Google Sign-In Documentation](https://react-native-google-signin.github.io/docs/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Identity Platform](https://developers.google.com/identity)

## Notes

- **Platform Support**: Google Sign-In is configured for **iOS and Android only**. The button will not appear on web platforms.
- The `webClientId` is required for both iOS and Android
- iOS requires both `iosClientId` and `webClientId`
- Android can use `webClientId` alone, or `androidClientId` if provided
- Make sure to keep your OAuth credentials secure and never commit them to version control
- For production, use separate OAuth credentials for development and production environments
- The SHA-1 fingerprint for production builds will be different from debug builds
- The Google Sign-In button is automatically hidden on unsupported platforms (web)

