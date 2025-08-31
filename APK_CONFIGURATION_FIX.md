# 🔧 APK Configuration Fix Guide

## 🚨 **Issue Identified**
The APK is not able to connect to the backend because of network security configuration issues. The backend is running on Digital Ocean (`206.189.141.194:3000`) but the APK's network security settings were only configured for local development.

## ✅ **Fixes Applied**

### 1. **Updated Network Security Plugin**
- **File**: `plugins/network-security.js`
- **Change**: Added Digital Ocean IP (`206.189.141.194`) to allowed domains
- **Impact**: Allows HTTP connections to the production backend

### 2. **Updated App Configuration**
- **File**: `app.json`
- **Change**: Added network security plugin to the plugins array
- **Impact**: Ensures the network security configuration is applied during build

### 3. **Verified API Configuration**
- **File**: `config.js`
- **Status**: ✅ Correctly configured to use `http://206.189.141.194:3000`
- **Impact**: API service will use the correct backend URL

## 🔍 **Configuration Details**

### **Backend Status**
- ✅ **Backend Running**: `http://206.189.141.194:3000`
- ✅ **Health Check**: Responding with status 200
- ✅ **Authentication**: Login/Register endpoints working

### **APK Configuration**
- ✅ **API Base URL**: `http://206.189.141.194:3000`
- ✅ **Network Security**: Updated to allow Digital Ocean IP
- ✅ **Cleartext Traffic**: Enabled for HTTP connections
- ✅ **Permissions**: Internet and network state permissions included

## 🛠️ **Next Steps**

### **1. Rebuild the APK**
```bash
# Clear previous build
expo prebuild --clean

# Build for Android
expo build:android

# Or use EAS Build
eas build --platform android
```

### **2. Test the New APK**
1. Install the new APK on your device
2. Open the app and check the logs
3. Try to login with existing credentials
4. Monitor the network requests

### **3. Debug with ADB Logs**
```bash
# Connect to device
adb connect <device-ip>:5555

# Watch logs
adb logcat | findstr "LOGIN API HEALTH APP CONNECTIVITY"
```

## 📋 **Expected Log Output**

### **✅ Success Indicators**
```
🚀 [APP] Initializing API Service...
🌐 [APP] Base URL: http://206.189.141.194:3000
✅ [APP] API health check passed
✅ [APP] Network connectivity test passed
🔐 [LOGIN] Starting login process...
✅ [LOGIN] Login successful!
```

### **❌ Error Indicators**
```
❌ [HEALTH] Health check failed!
❌ [CONNECTIVITY] Network test failed!
🚨 [LOGIN] Network Error
📡 [LOGIN] Error message: Network Error
```

## 🔧 **Troubleshooting**

### **If APK Still Can't Connect:**

1. **Check Network Security Config**
   - Verify the network security plugin is included in app.json
   - Ensure the Digital Ocean IP is in the allowed domains

2. **Verify Backend Accessibility**
   ```bash
   python check_backend_status.py
   ```

3. **Test from Device**
   ```bash
   # Test connectivity from your phone
   curl http://206.189.141.194:3000/api/health
   ```

4. **Check Firewall Settings**
   - Ensure port 3000 is accessible from external devices
   - Check if your network blocks external connections

### **Common Issues & Solutions**

| Issue | Solution |
|-------|----------|
| Network Error | Check if backend is running and accessible |
| Timeout Error | Increase timeout in config.js |
| SSL/TLS Error | Verify cleartext traffic is enabled |
| Permission Denied | Check Android permissions in app.json |

## 📱 **Testing Checklist**

- [ ] APK installs successfully
- [ ] App starts without crashes
- [ ] API health check passes
- [ ] Network connectivity test passes
- [ ] Login functionality works
- [ ] Video upload works
- [ ] Results are displayed correctly

## 🚀 **Production Considerations**

For production deployment, consider:
1. **HTTPS**: Switch to HTTPS for secure connections
2. **Domain**: Use a proper domain instead of IP address
3. **SSL Certificates**: Implement proper SSL/TLS certificates
4. **Security**: Remove cleartext traffic allowances

## 📞 **Support**

If issues persist after applying these fixes:
1. Check the ADB logs for specific error messages
2. Verify the backend is running and accessible
3. Test network connectivity from the device
4. Review the complete error logs for detailed information
