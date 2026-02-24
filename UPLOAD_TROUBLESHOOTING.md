# Upload Troubleshooting Guide

## 🚨 Common Upload Issues and Solutions

### 1. **Timeout Issues**

**Problem:** Upload fails with "network error" or timeout
**Solutions:**
- ✅ **Increased timeout** to 5 minutes (300,000ms) in `config.js`
- ✅ **Check ngrok tunnel** - make sure it's running
- ✅ **Reduce video size** - try smaller videos first

### 2. **Ngrok Limitations**

**Problem:** Ngrok free tier has restrictions
**Solutions:**
- ⚠️ **File size limit:** ~100MB for free tier
- ⚠️ **Request timeout:** ~60 seconds for free tier
- ⚠️ **Bandwidth limit:** Limited for free tier
- 💡 **Consider paid ngrok** for larger files

### 3. **Authentication Issues**

**Problem:** 401 Unauthorized errors
**Solutions:**
- ✅ **Login first** before uploading
- ✅ **Check token** - make sure you're logged in
- ✅ **Token expiration** - login again if needed

### 4. **File Size Issues**

**Problem:** File too large
**Solutions:**
- 📏 **Compress video** before uploading
- 📏 **Reduce resolution** (720p instead of 1080p)
- 📏 **Shorten duration** (30 seconds instead of 2 minutes)
- 📏 **Use MP4 format** (most compatible)

### 5. **Network Issues**

**Problem:** Connection problems
**Solutions:**
- 🌐 **Check internet** connection
- 🌐 **Restart ngrok** tunnel
- 🌐 **Try different network** (mobile data vs WiFi)

## 🔧 **Quick Fixes to Try:**

### Fix 1: Restart Everything
```bash
# 1. Stop ngrok (Ctrl+C)
# 2. Restart ngrok
ngrok https 8000

# 3. Rebuild app
expo start --clear
```

### Fix 2: Test with Small File
- Use a very small video file (< 10MB)
- Test with 5-10 second video
- Check if it works

### Fix 3: Check Backend Logs
- Look at your backend console
- Check for error messages
- Verify backend is processing requests

### Fix 4: Update Ngrok URL
- If ngrok restarted, update the URL in `config.js`
- Rebuild the app with new URL

## 📊 **Current Configuration:**

- **API Timeout:** 300,000ms (5 minutes)
- **Ngrok URL:** httpss://b0a929210c19.ngrok-free.app
- **Upload Endpoint:** /api/upload
- **Authentication:** Required (JWT token)

## 🧪 **Testing Steps:**

1. **Test connectivity:**
   ```bash
   node test_connectivity.js
   ```

2. **Test authentication:**
   ```bash
   node test_login_endpoint.js
   ```

3. **Test upload with timeout:**
   ```bash
   node test_upload_timeout.js
   ```

## 🎯 **Most Likely Causes:**

1. **Ngrok timeout** - Free tier limitations
2. **File too large** - Exceeds ngrok limits
3. **Backend processing** - Takes too long
4. **Network instability** - Connection drops

## 💡 **Recommendations:**

1. **Use smaller videos** for testing (< 50MB)
2. **Consider paid ngrok** for production
3. **Add progress indicators** in the app
4. **Implement retry logic** for failed uploads
5. **Add file size validation** before upload

## 🆘 **If Still Failing:**

1. Check backend logs for specific errors
2. Try uploading from a different device/network
3. Test with a different video file
4. Consider using a different tunneling service
5. Check if backend is running properly
