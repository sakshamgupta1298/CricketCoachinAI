# 🔍 Debugging CrickCoach APK with ADB Logcat

## 📱 Setup Wireless Debugging

### Step 1: Enable Developer Options on Phone
1. Go to **Settings** → **About Phone**
2. Tap **Build Number** 7 times
3. Go back to **Settings** → **Developer Options**
4. Enable **USB Debugging**
5. Enable **Wireless Debugging**

### Step 2: Connect via ADB
1. On your phone, go to **Developer Options** → **Wireless Debugging**
2. Note the **IP address and port** (e.g., `192.168.1.100:5555`)
3. On your computer, run:
   ```bash
   adb connect 192.168.1.100:5555
   ```

## 🔍 Viewing Logs

### Method 1: Filter by App
```bash
adb logcat | findstr "CrickCoach"
```

### Method 2: Filter by Tags (Windows)
```bash
adb logcat | findstr "LOGIN API HEALTH APP CONNECTIVITY"
```

### Method 3: Filter by Tags (Linux/Mac)
```bash
adb logcat | grep -E "(LOGIN|API|HEALTH|APP|CONNECTIVITY)"
```

### Method 4: Clear and Watch
```bash
adb logcat -c
adb logcat | findstr "LOGIN API HEALTH APP CONNECTIVITY"
```

## 📊 What to Look For

### ✅ Success Indicators:
- `🚀 [APP] CrickCoach App starting...`
- `🌐 [API] Production URL: http://192.168.1.3:8000`
- `✅ [APP] API health check passed`
- `✅ [APP] Network connectivity test passed`
- `🔐 [LOGIN] Starting login process...`
- `✅ [LOGIN] Login successful!`

### ❌ Error Indicators:
- `❌ [HEALTH] Health check failed!`
- `❌ [CONNECTIVITY] Network test failed!`
- `🚨 [LOGIN] Authentication error:`
- `📡 [LOGIN] Error message: Network Error`
- `🌐 [LOGIN] Request URL: undefined`

## 🔍 Detailed Error Analysis

### Network Error Details to Look For:
```
📋 [LOGIN] Complete error object: {...}
🔍 [LOGIN] Error stack trace: ...
🌐 [LOGIN] Network error code: ...
🌐 [LOGIN] Network errno: ...
🌐 [LOGIN] Network syscall: ...
🌐 [LOGIN] Network hostname: ...
🌐 [LOGIN] Network port: ...
📤 [LOGIN] Request details: {...}
```

### Request/Response Details:
```
📤 [JSON_API_REQUEST] Making JSON request: POST /api/auth/login
🔧 [JSON_API_REQUEST] Request config: {...}
📥 [JSON_API_RESPONSE] Received JSON response: 200 /api/auth/login
📄 [JSON_API_RESPONSE] Response headers: {...}
📋 [JSON_API_RESPONSE] Response data: {...}
```

## 🧪 Testing Steps

1. **Install and Open APK**
2. **Watch logs during app startup:**
   ```bash
   adb logcat -c && adb logcat | findstr "APP API"
   ```

3. **Try to login and watch logs:**
   ```bash
   adb logcat | findstr "LOGIN API"
   ```

4. **Look for these specific messages:**
   - What URL is being used?
   - Is the health check passing?
   - Is the connectivity test passing?
   - What specific error occurs during login?

## 🔧 Common Issues & Solutions

### Issue: "Network Error"
- Check if the API URL is correct
- Verify backend is running
- Check firewall settings
- Look for network error codes in logs

### Issue: "Request URL: undefined"
- API base URL is not being set correctly
- Need to rebuild APK with correct configuration

### Issue: "Health check failed"
- Backend not accessible from phone
- Network connectivity issue
- Check detailed error logs

### Issue: "Connectivity test failed"
- Network configuration issue
- Check detailed error logs for specific network errors

## 📋 Debugging Checklist

- [ ] App starts and shows initialization logs
- [ ] API base URL is set correctly
- [ ] Health check passes
- [ ] Connectivity test passes
- [ ] Login request is made to correct URL
- [ ] Backend responds successfully
- [ ] Authentication completes

## 💡 Tips

1. **Clear logs before testing:**
   ```bash
   adb logcat -c
   ```

2. **Save logs to file:**
   ```bash
   adb logcat > debug_logs.txt
   ```

3. **Filter specific errors:**
   ```bash
   adb logcat | findstr "error"
   ```

4. **Watch real-time:**
   ```bash
   adb logcat | findstr "LOGIN API HEALTH APP CONNECTIVITY"
   ```

5. **Look for complete error objects:**
   - Search for `📋 [LOGIN] Complete error object:`
   - Search for `🔍 [LOGIN] Error stack trace:`
   - Search for `📤 [LOGIN] Request details:`

## 🚨 New Enhanced Logging Features

The updated APK now includes:

### ✅ **Complete Error Objects**
- Full error details in JSON format
- Stack traces for debugging
- Network-specific error codes

### ✅ **Request/Response Details**
- Complete request configuration
- Response headers and data
- Full URL construction

### ✅ **Network Diagnostics**
- Connectivity test results
- Network error codes
- Request timeout information

### ✅ **Enhanced Interceptors**
- Detailed request logging
- Complete response logging
- Error interception with full details 