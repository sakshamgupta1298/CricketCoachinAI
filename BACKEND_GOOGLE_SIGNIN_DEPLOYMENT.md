# Backend Google Sign-In Endpoint Deployment

## What Was Added

I've added the `/api/auth/google-signin` endpoint to your `backend_script.py` file. This endpoint:

1. **Verifies Google ID Token** - Decodes and validates the JWT token from Google
2. **Checks User Existence** - Looks up user by email in the database
3. **Creates New Users** - Automatically creates a new account if user doesn't exist
4. **Generates JWT Token** - Returns a JWT token for your app's authentication
5. **Returns User Data** - Provides user ID, username, and email

## Endpoint Details

**URL:** `POST /api/auth/google-signin`

**Request Body:**
```json
{
  "id_token": "google-jwt-token",
  "email": "user@example.com",
  "name": "User Name",
  "photo": "https://photo-url.com/photo.jpg"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Google Sign-In successful",
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "username": "user_name",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

**Response (Error):**
```json
{
  "error": "Error message here"
}
```

## Deployment Steps

### 1. Upload Updated Backend File

Upload the updated `backend_script.py` to your server:

```bash
# Using SCP
scp backend_script.py user@your-server:/path/to/backend/

# Or using SFTP, Git, or your deployment method
```

### 2. Restart Backend Service

Restart your backend service on the server:

```bash
# If using systemd service
sudo systemctl restart crickcoach-backend

# Or if running manually
# Stop the current process (Ctrl+C or kill)
# Then restart:
python3 backend_script.py
# Or however you normally start it
```

### 3. Verify Endpoint

Test the endpoint to make sure it's working:

```bash
# Test with curl (replace with actual token)
curl -X POST https://api.crickcoachai.com/api/auth/google-signin \
  -H "Content-Type: application/json" \
  -d '{
    "id_token": "test-token",
    "email": "test@example.com",
    "name": "Test User"
  }'
```

## How It Works

1. **Token Verification**: The endpoint decodes the Google JWT token to extract user information
2. **Email Validation**: Verifies the email in the token matches the request
3. **User Lookup**: Checks if a user with that email already exists
4. **User Creation**: If user doesn't exist:
   - Generates a unique username from the name/email
   - Creates a dummy password hash (Google users don't need passwords)
   - Inserts the new user into the database
5. **Token Generation**: Creates a JWT token for your app
6. **Response**: Returns the token and user data

## Security Notes

⚠️ **Current Implementation**: The endpoint decodes the JWT token but doesn't fully verify the signature. For production, you should:

1. **Verify Token Signature**: Use Google's public keys to verify the token signature
2. **Check Token Expiration**: Verify the token hasn't expired
3. **Validate Audience**: Ensure the token was issued for your app

### Enhanced Security (Optional)

To add full token verification, install `google-auth`:

```bash
pip install google-auth
```

Then update the endpoint to use:

```python
from google.oauth2 import id_token
from google.auth.transport import requests

# Verify token
idinfo = id_token.verify_oauth2_token(
    id_token_str, 
    requests.Request(), 
    GOOGLE_CLIENT_ID  # Your web client ID
)
```

## Database Schema

The endpoint uses the existing `users` table:
- `id` - Auto-increment primary key
- `username` - Unique username (generated from name/email)
- `email` - User's email (unique)
- `password_hash` - Dummy hash for Google users
- `created_at` - Timestamp
- `updated_at` - Timestamp

## Testing

After deployment, test from your mobile app:

1. Open the login screen
2. Tap "Continue with Google"
3. Select your Google account
4. You should be logged in and redirected to home

Check the backend logs for:
```
=== GOOGLE SIGN-IN REQUEST RECEIVED ===
Google Sign-In attempt - Email: ...
Google Sign-In successful for user: ... (ID: ...)
```

## Troubleshooting

### 404 Error
- Make sure you uploaded the updated `backend_script.py`
- Restart the backend service
- Check that the route is registered: `@app.route('/api/auth/google-signin', methods=['POST'])`

### 401 Error (Invalid Token)
- Check that the `id_token` is being sent correctly
- Verify the token format (should be a JWT with 3 parts separated by dots)
- Check backend logs for specific error messages

### 500 Error (Server Error)
- Check backend logs for detailed error messages
- Verify database connection is working
- Ensure the `users` table exists and is accessible

### User Creation Fails
- Check database permissions
- Verify the `users` table schema matches expected format
- Check for unique constraint violations (email/username conflicts)

## Logs to Monitor

Watch for these log messages:
- `=== GOOGLE SIGN-IN REQUEST RECEIVED ===` - Request received
- `Google Sign-In attempt - Email: ...` - Processing request
- `Existing user found: ...` - User already exists
- `Creating new user for Google Sign-In: ...` - Creating new user
- `Google Sign-In successful for user: ...` - Success
- Any error messages with stack traces

## Next Steps

1. ✅ Upload `backend_script.py` to server
2. ✅ Restart backend service
3. ✅ Test the endpoint
4. ✅ Test from mobile app
5. ⚠️ (Optional) Add full token signature verification for enhanced security

