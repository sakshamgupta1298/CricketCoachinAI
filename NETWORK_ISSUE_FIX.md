# Network Issue Fix - Login Not Working

## Problem
When running `python backend_script.py` and trying to login, you're getting a network error.

## Root Cause
The mobile app is configured to connect to `https://api.crickcoachai.com`, but:
1. The backend is running on the new server at `139.59.1.59:3000`
2. The domain `api.crickcoachai.com` may not be pointing to the new server
3. The app is trying to use HTTPS but the server might only have HTTP configured

## Solutions

### Solution 1: Update Mobile App Configuration (Recommended)

The `config.js` file has been updated to use the new server IP: `http://139.59.1.59:3000`

**If you're testing locally:**
1. Find your local IP address:
   ```bash
   # On Mac/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # On Windows
   ipconfig
   ```

2. Update `config.js` temporarily for local testing:
   ```javascript
   API_BASE_URL: 'http://YOUR_LOCAL_IP:3000',
   ```

3. Rebuild the app:
   ```bash
   npm run android
   # or
   npm run ios
   ```

### Solution 2: Verify Backend is Running and Accessible

**On the server (139.59.1.59):**
```bash
# SSH into server
ssh root@139.59.1.59

# Check if backend is running
systemctl status crickcoach-backend

# Or check if port 3000 is listening
netstat -tlnp | grep 3000

# Test the backend directly
curl http://localhost:3000/api/health
```

**From your local machine:**
```bash
# Test if server is accessible
curl http://139.59.1.59:3000/api/health

# Test login endpoint
curl -X POST http://139.59.1.59:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

### Solution 3: Run Backend with Unbuffered Output

When running locally for testing:
```bash
# Use -u flag for unbuffered output
python -u backend_script.py

# Or set environment variable
export PYTHONUNBUFFERED=1
python backend_script.py
```

### Solution 4: Check Firewall Settings

**On the server:**
```bash
# Check firewall status
ufw status

# Allow port 3000 if not already allowed
ufw allow 3000/tcp

# Check if port is open
netstat -tlnp | grep 3000
```

### Solution 5: Verify CORS Configuration

The backend should have CORS enabled. Check `backend_script.py`:
```python
CORS(app, 
     origins=['*'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'User-Agent'],
     supports_credentials=False,
     max_age=86400)
```

## Quick Diagnostic Steps

### 1. Check Backend Logs
```bash
# On server
journalctl -u crickcoach-backend -f

# Or if running locally
tail -f logging/backend_*.log
```

### 2. Test from Mobile Device
- Open a browser on your mobile device
- Navigate to: `http://139.59.1.59:3000/api/health`
- You should see: `{"status":"ok","message":"Backend is running"}`

### 3. Check Network Security Config (Android)
Verify `android/app/src/main/res/xml/network_security_config.xml` allows HTTP:
```xml
<domain includeSubdomains="true">139.59.1.59</domain>
```

### 4. Check iOS Info.plist (iOS)
Verify `ios/CrickCoachAI/Info.plist` has exception for HTTP:
```xml
<key>139.59.1.59</key>
<dict>
    <key>NSExceptionAllowsInsecureHTTPLoads</key>
    <true/>
</dict>
```

## Common Issues

### Issue 1: "Network Error" or "Connection Refused"
**Cause**: Backend is not running or not accessible
**Fix**: 
- Start the backend: `python -u backend_script.py`
- Or start systemd service: `systemctl start crickcoach-backend`
- Check firewall: `ufw allow 3000/tcp`

### Issue 2: "CORS Error"
**Cause**: CORS not properly configured
**Fix**: Verify CORS is enabled in `backend_script.py` (should already be configured)

### Issue 3: "SSL/TLS Error"
**Cause**: App trying to use HTTPS but server only has HTTP
**Fix**: Update `config.js` to use `http://` instead of `https://`

### Issue 4: "Timeout Error"
**Cause**: Network connectivity issues or firewall blocking
**Fix**: 
- Check if device can reach server: `ping 139.59.1.59`
- Check firewall rules
- Verify backend is listening on `0.0.0.0:3000` (not just `127.0.0.1:3000`)

## Testing Checklist

- [ ] Backend is running (`systemctl status crickcoach-backend` or `python backend_script.py`)
- [ ] Backend is accessible from network (`curl http://139.59.1.59:3000/api/health`)
- [ ] Port 3000 is open in firewall (`ufw status`)
- [ ] `config.js` has correct server IP (`http://139.59.1.59:3000`)
- [ ] Mobile app network security config allows HTTP to `139.59.1.59`
- [ ] App has been rebuilt after config changes
- [ ] Device can reach server IP (`ping 139.59.1.59` from device)

## Next Steps

1. **Update config.js** - Already done! ✅
2. **Rebuild the mobile app** with new configuration
3. **Test login** from the mobile app
4. **Check logs** if issues persist

## If Still Having Issues

1. Check backend logs for incoming requests:
   ```bash
   # On server
   journalctl -u crickcoach-backend -f
   
   # Or locally
   tail -f logging/backend_*.log
   ```

2. Test with curl to verify backend works:
   ```bash
   curl -X POST http://139.59.1.59:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"your_username","password":"your_password"}'
   ```

3. Check mobile app logs:
   ```bash
   # Android
   adb logcat | grep -i "login\|api\|network"
   
   # iOS (if using Xcode)
   # Check console logs in Xcode
   ```

