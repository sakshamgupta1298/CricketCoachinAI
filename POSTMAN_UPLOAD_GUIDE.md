# Postman Guide: Testing Upload Endpoint

This guide shows you how to test the `/api/upload` endpoint using Postman.

## Prerequisites

1. **Get an Authentication Token** - You need to login first to get a Bearer token
2. **Have a video file ready** - MP4, AVI, MOV, MKV, M4V, or WEBM format (max 100MB)

## Step-by-Step Instructions

### Step 1: Login to Get Authentication Token

1. **Create a new POST request** in Postman
2. **Set the URL**: `http://165.232.184.91/api/auth/login`
3. **Set method**: `POST`
4. **Go to Headers tab**:
   - Add header: `Content-Type: application/json`
5. **Go to Body tab**:
   - Select `raw`
   - Select `JSON` from dropdown
   - Enter the following:
   ```json
   {
     "username": "your_username",
     "password": "your_password"
   }
   ```
6. **Click Send**
7. **Copy the token** from the response (it will be in the `token` field)

### Step 2: Upload Video File

1. **Create a new POST request** in Postman
2. **Set the URL**: `http://165.232.184.91/api/upload`
3. **Set method**: `POST`
4. **Go to Headers tab**:
   - Add header: `Authorization: Bearer YOUR_TOKEN_HERE`
     (Replace `YOUR_TOKEN_HERE` with the token from Step 1)
   - **Important**: Do NOT add `Content-Type` header - Postman will set it automatically for multipart/form-data

5. **Go to Body tab**:
   - Select `form-data` (NOT raw or binary)
   - Add the following fields:

   | Key | Type | Value |
   |-----|------|-------|
   | `video` | File | Select your video file |
   | `player_type` | Text | `batsman` or `bowler` |
   | `batter_side` | Text | `left` or `right` (only if player_type is batsman) |
   | `bowler_side` | Text | `left` or `right` (only if player_type is bowler) |
   | `bowler_type` | Text | `fast_bowler` or `spin_bowler` (only if player_type is bowler) |

   **Example for Batsman:**
   ```
   video: [Select File] sample_video.mp4
   player_type: batsman
   batter_side: right
   ```

   **Example for Bowler:**
   ```
   video: [Select File] sample_video.mp4
   player_type: bowler
   bowler_side: right
   bowler_type: fast_bowler
   ```

6. **Click Send**

### Step 3: Understanding the Response

**Success Response (200 OK):**
```json
{
  "message": "Video uploaded and analysis started",
  "filename": "secure_filename.mp4",
  "player_type": "batsman",
  "analysis_id": "some_id"
}
```

**Error Responses:**

- **401 Unauthorized**: Token is invalid or expired
  ```json
  {
    "error": "Authentication required"
  }
  ```
  Solution: Get a new token from Step 1

- **400 Bad Request**: Missing video file or invalid data
  ```json
  {
    "error": "No video file selected"
  }
  ```
  Solution: Make sure you selected a file in the `video` field

- **500 Internal Server Error**: Server-side processing error
  ```json
  {
    "error": "Error message here"
  }
  ```

## Visual Guide

### Headers Tab Setup:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Body Tab Setup (form-data):
```
┌─────────────────┬──────────┬─────────────────────────┐
│ Key             │ Type     │ Value                   │
├─────────────────┼──────────┼─────────────────────────┤
│ video           │ File     │ [Select File] video.mp4  │
│ player_type     │ Text     │ batsman                 │
│ batter_side     │ Text     │ right                   │
└─────────────────┴──────────┴─────────────────────────┘
```

## Quick Test Script

If you prefer using curl instead of Postman:

```bash
# Step 1: Login
TOKEN=$(curl -X POST http://165.232.184.91/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}' \
  | jq -r '.token')

# Step 2: Upload video
curl -X POST http://165.232.184.91/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "video=@/path/to/your/video.mp4" \
  -F "player_type=batsman" \
  -F "batter_side=right"
```

## Troubleshooting

### Issue: "Network Error" or Connection Refused
- Check if server is running: `curl http://165.232.184.91/api/health`
- Verify firewall allows connections on port 80
- Check if nginx is running on the server

### Issue: "Authentication required" (401)
- Token may have expired - get a new one
- Make sure the Authorization header format is correct: `Bearer TOKEN`
- Check that there's a space between "Bearer" and the token

### Issue: "No video file selected" (400)
- Make sure you selected `form-data` in Body tab (not raw or binary)
- Verify the field name is exactly `video` (case-sensitive)
- Make sure you actually selected a file, not just typed the filename

### Issue: Upload Times Out
- Video file might be too large (max 100MB)
- Network connection might be slow
- Server might be processing - check server logs

### Issue: "Invalid file type"
- Supported formats: MP4, AVI, MOV, MKV, M4V, WEBM
- Make sure file extension matches the actual file type

## Testing Different Scenarios

### Test 1: Batsman Upload
```
video: cricket_batting.mp4
player_type: batsman
batter_side: right
```

### Test 2: Bowler Upload
```
video: cricket_bowling.mp4
player_type: bowler
bowler_side: right
bowler_type: fast_bowler
```

### Test 3: Left-handed Batsman
```
video: left_handed_batting.mp4
player_type: batsman
batter_side: left
```

### Test 4: Spin Bowler
```
video: spin_bowling.mp4
player_type: bowler
bowler_side: right
bowler_type: spin_bowler
```

## Environment Variables in Postman

You can set up Postman environment variables for easier testing:

1. Create a new Environment (e.g., "CricketCoach Production")
2. Add variables:
   - `base_url`: `http://165.232.184.91`
   - `token`: (leave empty, will be set after login)
3. Use in requests: `{{base_url}}/api/upload`
4. Set token after login: `pm.environment.set("token", pm.response.json().token);`

## Postman Collection

You can create a Postman collection with:
1. **Login Request** - Gets token and saves to environment
2. **Upload Request** - Uses token from environment
3. **Health Check** - Tests server connectivity

This makes it easy to test the entire flow!

