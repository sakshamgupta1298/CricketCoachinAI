# Network Error Fix for Upload Functionality

## Issues Identified

The "Network Error" (ERR_NETWORK) when uploading videos was caused by several potential issues:

1. **Nginx timeout settings too low** - 5 minutes wasn't enough for large video uploads
2. **No connectivity check before upload** - App attempted upload without verifying server reachability
3. **No retry logic** - Network hiccups caused immediate failures
4. **Insufficient error handling** - Generic error messages didn't help diagnose issues

## Fixes Applied

### 1. Increased Nginx Timeouts (`nginx_config.conf`)

Updated timeout settings from 300s (5 minutes) to 600s (10 minutes) to accommodate large video uploads:

```nginx
# Increase timeout for video processing and uploads (10 minutes)
proxy_connect_timeout 600s;
proxy_send_timeout 600s;
proxy_read_timeout 600s;
send_timeout 600s;
```

**Action Required:** If you're using nginx, you need to:
1. Copy the updated `nginx_config.conf` to your server
2. Reload nginx: `sudo nginx -t && sudo systemctl reload nginx`

### 2. Enhanced Upload Function (`src/services/api.ts`)

#### Added Connectivity Check
- Verifies server connectivity before attempting upload
- Provides clear error message if server is unreachable

#### Added Retry Logic
- Automatically retries up to 2 times on network errors
- Uses exponential backoff (2s, 4s delays)
- Only retries on network errors, not authentication or validation errors

#### Improved Error Handling
- Better error messages for different failure scenarios
- More detailed logging for debugging
- Progress tracking with file size information

#### Enhanced FormData Configuration
- Added `maxBodyLength` and `maxContentLength` settings
- Improved React Native FormData compatibility
- Better timeout handling

### 3. Improved Axios Configuration

Added React Native-specific settings:
- `maxBodyLength: Infinity` - Allow large file uploads
- `maxContentLength: Infinity` - Allow large responses
- `validateStatus` - Better error handling

## Testing the Fix

### 1. Verify Backend is Running

```bash
# On your server
curl https://165.232.184.91/api/health
```

Should return a successful response.

### 2. Test from Mobile App

1. Open the app
2. Try uploading a video
3. Check the console logs for:
   - Connectivity check status
   - Upload progress
   - Any retry attempts
   - Detailed error messages if it fails

### 3. Check Network Connectivity

If uploads still fail, verify:
- Device has internet connection
- Device can reach the server IP (165.232.184.91)
- Backend server is running and accessible
- Firewall allows connections on port 80

## Common Issues and Solutions

### Issue: "Cannot connect to server"
**Solution:** 
- Check if backend is running: `ps aux | grep python`
- Check if nginx is running: `sudo systemctl status nginx`
- Verify server IP is correct in `config.js`
- Test connectivity: `ping 165.232.184.91`

### Issue: "Network connection failed" after retries
**Solution:**
- Check device internet connection
- Verify server is accessible from device network
- Check firewall rules on server
- Try from different network (mobile data vs WiFi)

### Issue: Upload times out
**Solution:**
- Video file might be too large (max 100MB)
- Network connection might be slow
- Server might be overloaded
- Check nginx timeout settings are applied

## Next Steps

1. **Rebuild the app** to include the updated code:
   ```bash
   # For development
   npx expo start --clear
   
   # For production build
   eas build --platform android
   ```

2. **Update nginx on server** (if using nginx):
   ```bash
   sudo cp nginx_config.conf /etc/nginx/sites-available/crickcoach
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. **Test the upload functionality** with a small video first

4. **Monitor logs** for any remaining issues:
   - App console logs
   - Backend logs: `tail -f /path/to/backend/logs`
   - Nginx logs: `sudo tail -f /var/log/nginx/crickcoach_error.log`

## Additional Debugging

If issues persist, enable more detailed logging:

1. Check app console for detailed error messages
2. Check backend logs for incoming requests
3. Use network monitoring tools to see if requests are reaching the server
4. Test with a simple curl command:
   ```bash
   curl -X POST https://165.232.184.91/api/health \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

## Files Modified

- ✅ `nginx_config.conf` - Increased timeout settings
- ✅ `src/services/api.ts` - Enhanced upload function with retry logic and connectivity checks

