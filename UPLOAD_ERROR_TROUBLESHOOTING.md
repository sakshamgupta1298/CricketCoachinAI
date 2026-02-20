# Upload Error Troubleshooting Guide

## Problem: 500 Internal Server Error on Video Upload

When users try to upload a video, they're getting a "500 Internal Server Error" from Nginx.

## Common Causes

### 1. **Missing Error Handling** ✅ FIXED
- **Issue**: The upload endpoint didn't have try-except blocks
- **Fix**: Added comprehensive error handling to catch all exceptions
- **Status**: Fixed in latest code

### 2. **Authentication Issues**
- **Symptom**: 500 error could be from authentication failure
- **Check**: Verify JWT token is being sent correctly
- **Solution**: Check mobile app logs for authentication errors

### 3. **File System Permissions**
- **Symptom**: Cannot create user folders or save files
- **Check**: 
  ```bash
  ls -la /root/CricketCoachinAI/uploads/
  ls -la /root/CricketCoachinAI/
  ```
- **Fix**: Ensure directories are writable:
  ```bash
  chmod -R 755 /root/CricketCoachinAI/uploads
  chmod -R 755 /root/CricketCoachinAI/logging
  ```

### 4. **Disk Space**
- **Symptom**: Cannot save files due to full disk
- **Check**:
  ```bash
  df -h
  ```
- **Fix**: Free up disk space

### 5. **Nginx Configuration Issues**
- **Symptom**: Nginx returns 500 but backend is fine
- **Check**: Nginx error logs
  ```bash
  tail -f /var/log/nginx/crickcoach_error.log
  tail -f /var/log/nginx/error.log
  ```
- **Common issues**:
  - `client_max_body_size` too small (should be 100M)
  - Timeout too short
  - Proxy settings incorrect

## Diagnostic Steps

### Step 1: Check Backend Logs

```bash
# If using systemd
journalctl -u crickcoach-backend -f

# Or check log files
tail -f /root/CricketCoachinAI/logging/backend_*.log
```

Look for:
- Error messages
- Stack traces
- File save errors
- Permission errors

### Step 2: Test Upload Endpoint Directly

```bash
# Test with curl (replace TOKEN with actual JWT token)
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "video=@test_video.mp4" \
  -F "player_type=batsman" \
  -F "shot_type=cover_drive" \
  -F "batter_side=right"
```

### Step 3: Check Service Status

```bash
# Check if backend is running
systemctl status crickcoach-backend

# Check if port 3000 is listening
netstat -tlnp | grep 3000
```

### Step 4: Check Nginx Logs

```bash
# Real-time nginx error logs
tail -f /var/log/nginx/crickcoach_error.log

# Check for 500 errors
grep "500" /var/log/nginx/crickcoach_error.log | tail -20
```

### Step 5: Verify File Permissions

```bash
# Check upload directory
ls -la /root/CricketCoachinAI/uploads/

# Check if directory is writable
touch /root/CricketCoachinAI/uploads/test.txt
rm /root/CricketCoachinAI/uploads/test.txt
```

## Quick Fixes

### Fix 1: Restart Backend Service

```bash
systemctl restart crickcoach-backend
journalctl -u crickcoach-backend -f
```

### Fix 2: Check and Fix Permissions

```bash
# Ensure directories exist and are writable
mkdir -p /root/CricketCoachinAI/uploads
mkdir -p /root/CricketCoachinAI/logging
chmod -R 755 /root/CricketCoachinAI/uploads
chmod -R 755 /root/CricketCoachinAI/logging
```

### Fix 3: Verify Nginx Configuration

```bash
# Test nginx config
nginx -t

# Check client_max_body_size
grep "client_max_body_size" /etc/nginx/sites-available/crickcoach

# Should show: client_max_body_size 100M;
```

### Fix 4: Check Disk Space

```bash
df -h
# If disk is full, clean up old files
find /root/CricketCoachinAI/uploads -type f -mtime +30 -delete
```

## Testing After Fix

1. **Test from command line:**
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Test upload with curl:**
   ```bash
   curl -X POST http://localhost:3000/api/upload \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "video=@test.mp4" \
     -F "player_type=batsman" \
     -F "shot_type=cover_drive"
   ```

3. **Test from mobile app:**
   - Try uploading a small test video
   - Check app logs for detailed error messages

## Error Messages to Look For

### In Backend Logs:
- `Permission denied` → Fix file permissions
- `No space left on device` → Free up disk space
- `FileNotFoundError` → Check directory paths
- `AttributeError: 'NoneType'` → Check authentication
- `KeyError` → Check request form data

### In Nginx Logs:
- `upstream prematurely closed connection` → Backend crashed
- `upstream timed out` → Increase timeout in nginx
- `client intended to send too large body` → Increase client_max_body_size

## Prevention

1. ✅ **Error Handling**: All endpoints now have try-except blocks
2. ✅ **Logging**: Comprehensive logging for debugging
3. ✅ **Validation**: Input validation before processing
4. ✅ **File Cleanup**: Automatic cleanup on errors

## Next Steps

After applying fixes:

1. **Restart the service:**
   ```bash
   systemctl restart crickcoach-backend
   ```

2. **Monitor logs:**
   ```bash
   journalctl -u crickcoach-backend -f
   ```

3. **Test upload again** from the mobile app

4. **Check logs** if error persists

## Still Having Issues?

1. **Check backend logs** for the exact error:
   ```bash
   journalctl -u crickcoach-backend -n 100 --no-pager
   ```

2. **Check nginx logs**:
   ```bash
   tail -50 /var/log/nginx/crickcoach_error.log
   ```

3. **Verify authentication** is working:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"test","password":"test"}'
   ```

4. **Test upload endpoint** with proper authentication token

