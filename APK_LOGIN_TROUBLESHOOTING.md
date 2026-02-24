# APK Login Troubleshooting Guide

## Common Issues and Solutions

### Issue: Cannot Login with APK

If you're unable to login with an earlier APK file, here are the most common causes and solutions:

---

## 1. **API Server Not Accessible**

### Problem
The APK is trying to connect to a backend server that is not running or not accessible.

### Check Current Configuration
The app is configured to use: `httpss://api.crickcoachai.com`

### Solutions

#### A. Verify Backend Server is Running
```bash
# Test if the backend server is accessible
curl httpss://api.crickcoachai.com/api/health

# Or if using local server
curl https://your-server-ip:8000/api/health
```

#### B. Check Network Connectivity
- Ensure your device has internet connection
- Try accessing the API URL in a browser on your device
- Check if firewall or network restrictions are blocking the connection

#### C. Verify SSL Certificate
If using httpsS, ensure:
- SSL certificate is valid and not expired
- Certificate is properly configured on the server
- Android allows cleartext traffic (if using https) - see network security config

---

## 2. **API URL Mismatch**

### Problem
The APK was built with a different API URL (e.g., localhost or local IP) that's no longer accessible.

### Solutions

#### A. Check What URL the APK is Using
1. Connect your device via USB
2. Enable USB debugging
3. Run: `adb logcat | grep "API Base URL"`
4. Look for logs showing: `✅ [API] Using API URL from config:`

#### B. Rebuild APK with Correct URL
1. Update `config.js` with the correct API URL:
```javascript
production: {
  API_BASE_URL: 'httpss://api.crickcoachai.com', // Your actual server URL
  API_TIMEOUT: 600000,
}
```

2. Rebuild the APK:
```bash
npm run build:android
# or
eas build --platform android
```

---

## 3. **CORS Issues**

### Problem
Backend server is blocking requests from the mobile app.

### Solution
Ensure your backend has CORS properly configured:
```python
# In backend_script.py
CORS(app, resources={
    r"/api/*": {
        "origins": ["*"],  # Or specify your app's origin
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})
```

---

## 4. **Authentication Token Issues**

### Problem
Stored authentication tokens might be expired or invalid.

### Solution
1. Clear app data:
   - Android: Settings > Apps > CrickCoach AI > Storage > Clear Data
   - Or uninstall and reinstall the app

2. Try logging in again with fresh credentials

---

## 5. **Network Security Configuration (Android)**

### Problem
Android blocks https connections or untrusted certificates.

### Check Network Security Config
File: `android/app/src/main/res/xml/network_security_config.xml`

Should allow your API domain:
```xml
<domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">api.crickcoachai.com</domain>
</domain-config>
```

---

## 6. **Backend Server Status**

### Check Backend Health
```bash
# Test backend health endpoint
curl httpss://api.crickcoachai.com/api/health

# Expected response:
# {"status": "healthy", "message": "Backend is running"}
```

### Verify Backend is Running
- Check if Flask server is running on the backend
- Verify database is accessible
- Check server logs for errors

---

## 7. **Debugging Steps**

### Enable Debug Logging
1. Connect device via USB
2. Run: `adb logcat | grep -E "LOGIN|API|AUTH"`
3. Try to login and observe the logs

### Check Specific Error Messages
Look for these in logs:
- `❌ [LOGIN] Login failed` - Authentication error
- `Network error` - Connectivity issue
- `Timeout` - Server not responding
- `401 Unauthorized` - Invalid credentials
- `404 Not Found` - Wrong API endpoint

---

## 8. **Quick Fixes**

### Option 1: Update API URL in APK
If you have access to rebuild:
1. Update `config.js`
2. Rebuild APK
3. Install new APK

### Option 2: Use API URL Changer (if implemented)
Some versions allow changing API URL in app settings:
1. Go to Profile > API Settings
2. Update API URL to correct server
3. Save and try login again

### Option 3: Check Backend Logs
On your server, check:
```bash
# Flask backend logs
tail -f logging/backend_*.log

# Or if using systemd
journalctl -u crickcoach-backend -f
```

---

## 9. **Common Error Messages**

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "Network error" | Cannot reach server | Check internet, verify server is running |
| "Invalid username or password" | Wrong credentials | Verify username/password |
| "User not found" | Account doesn't exist | Register first or check username |
| "Timeout" | Server not responding | Check server status, increase timeout |
| "Connection refused" | Server not running | Start backend server |
| "SSL certificate error" | Certificate issue | Fix SSL cert or use https |

---

## 10. **Testing Connectivity**

### From Device Browser
1. Open browser on your device
2. Navigate to: `httpss://api.crickcoachai.com/api/health`
3. Should see: `{"status": "healthy", ...}`

### From Command Line (if device connected)
```bash
# Test API endpoint
adb shell "curl httpss://api.crickcoachai.com/api/health"
```

---

## 11. **If Nothing Works**

1. **Check Backend Server**
   - Is it running?
   - Is it accessible from internet?
   - Are ports open (80, 443, 8000)?

2. **Check API Configuration**
   - Verify `config.js` has correct URL
   - Ensure production build uses production config

3. **Rebuild APK**
   - Use latest code
   - Ensure correct API URL in config
   - Test with fresh install

4. **Contact Support**
   - Provide error logs
   - Share API URL being used
   - Include device and Android version

---

## Quick Diagnostic Commands

```bash
# 1. Test backend health
curl httpss://api.crickcoachai.com/api/health

# 2. Test login endpoint
curl -X POST httpss://api.crickcoachai.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# 3. Check device logs
adb logcat | grep -E "LOGIN|API|ERROR"

# 4. Check network connectivity from device
adb shell ping -c 3 api.crickcoachai.com
```

---

## Prevention for Future Builds

1. **Always use production API URL in production builds**
2. **Test APK on different networks before distribution**
3. **Implement API URL configuration in app settings**
4. **Add better error messages for network issues**
5. **Include health check on app startup**

---

## Need More Help?

If login still doesn't work after trying these solutions:
1. Collect error logs: `adb logcat > login_errors.txt`
2. Test API manually: Use Postman or curl
3. Check backend server status and logs
4. Verify database is accessible and user exists

