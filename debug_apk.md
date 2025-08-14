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
adb logcat | grep "CrickCoach"
```

### Method 2: Filter by Tags
```bash
adb logcat | grep -E "(LOGIN|API|HEALTH|APP)"
```

### Method 3: Clear and Watch
```bash
adb logcat -c
adb logcat | grep -E "(LOGIN|API|HEALTH|APP)"
```

## 📊 What to Look For

### ✅ Success Indicators:
- `🚀 [APP] CrickCoach App starting...`
- `🌐 [API] Production URL: http://192.168.1.3:8000`
- `✅ [APP] API health check passed`
- `🔐 [LOGIN] Starting login process...`
- `✅ [LOGIN] Login successful!`

### ❌ Error Indicators:
- `❌ [HEALTH] Health check failed!`
- `🚨 [LOGIN] Authentication error:`
- `📡 [LOGIN] Error message: Network Error`
- `🌐 [LOGIN] Request URL: undefined`

## 🧪 Testing Steps

1. **Install and Open APK**
2. **Watch logs during app startup:**
   ```bash
   adb logcat -c && adb logcat | grep -E "(APP|API)"
   ```

3. **Try to login and watch logs:**
   ```bash
   adb logcat | grep -E "(LOGIN|API)"
   ```

4. **Look for these specific messages:**
   - What URL is being used?
   - Is the health check passing?
   - What error occurs during login?

## 🔧 Common Issues & Solutions

### Issue: "Network Error"
- Check if the API URL is correct
- Verify backend is running
- Check firewall settings

### Issue: "Request URL: undefined"
- API base URL is not being set correctly
- Need to rebuild APK with correct configuration

### Issue: "Health check failed"
- Backend not accessible from phone
- Network connectivity issue

## 📋 Debugging Checklist

- [ ] App starts and shows initialization logs
- [ ] API base URL is set correctly
- [ ] Health check passes
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
   adb logcat | grep -i "error"
   ```

4. **Watch real-time:**
   ```bash
   adb logcat | grep -E "(LOGIN|API|HEALTH|APP)" --line-buffered
   ``` 