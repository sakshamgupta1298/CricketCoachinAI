# Cleartext Traffic Configuration for CrickCoach

This document explains the configuration changes made to allow https (cleartext) traffic in the CrickCoach Android app for development purposes.

## ⚠️ Security Warning

**This configuration is for development/testing purposes only. For production, you should:**
1. Use httpsS instead of https
2. Remove the `usesCleartextTraffic` settings
3. Implement proper SSL/TLS certificates

## Configuration Changes Made

### 1. Updated `app.json`

The main Expo configuration file has been updated with:

```json
{
  "expo": {
    "android": {
      "usesCleartextTraffic": true,
      "permissions": [
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        // ... other permissions
      ],
      "networkSecurityConfig": {
        "domain-config": [
          {
            "domain": "192.168.1.3",
            "cleartextTrafficPermitted": true
          },
          {
            "domain": "10.0.2.2",
            "cleartextTrafficPermitted": true
          },
          {
            "domain": "localhost",
            "cleartextTrafficPermitted": true
          },
          {
            "domain": "127.0.0.1",
            "cleartextTrafficPermitted": true
          }
        ],
        "base-config": {
          "cleartextTrafficPermitted": true
        }
      }
    }
  }
}
```

### 2. Created Android Network Security Config

Created `android/app/src/main/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system"/>
        </trust-anchors>
    </base-config>
    
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">192.168.1.3</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">127.0.0.1</domain>
    </domain-config>
</network-security-config>
```

### 3. Created Android Manifest

Created `android/app/src/main/AndroidManifest.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="https://schemas.android.com/apk/res/android"
    package="com.saksham_5.cricketcoachmobile">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <!-- ... other permissions -->

    <application
        android:usesCleartextTraffic="true"
        android:networkSecurityConfig="@xml/network_security_config">
        <!-- ... activities -->
    </application>
</manifest>
```

## Testing the Configuration

### 1. Rebuild the App

After making these changes, you need to rebuild your app:

```bash
# Clear Expo cache
expo start --clear

# Or if using EAS Build
eas build --platform android --clear-cache
```

### 2. Test Connectivity

Use the provided test script:

```bash
node test_connectivity.js
```

Or test manually in your app by:
1. Opening the app
2. Going to Profile screen
3. Using the "Test API Connection" button

### 3. Check Logs

Monitor the app logs for any network-related errors:

```bash
# For Expo development
expo logs

# For Android device
adb logcat | grep -i "cleartext\|network\|security"
```

## Troubleshooting

### Common Issues

1. **"Cleartext traffic not permitted" error still appears**
   - Make sure you've rebuilt the app after configuration changes
   - Check that the Android manifest is properly referenced
   - Verify the network security config file is in the correct location

2. **App can't connect to backend**
   - Verify your backend is running on the correct IP/port
   - Check that your device/emulator can reach the backend IP
   - Test with the connectivity script first

3. **Configuration not taking effect**
   - Clear app cache and data
   - Uninstall and reinstall the app
   - Ensure you're using the latest build

### Verification Steps

1. **Check if cleartext traffic is enabled:**
   ```bash
   adb shell settings get global cleartext_traffic_permitted
   ```

2. **Test network connectivity:**
   ```bash
   adb shell ping 192.168.1.3
   ```

3. **Check app permissions:**
   ```bash
   adb shell dumpsys package com.saksham_5.cricketcoachmobile | grep -i permission
   ```

## Production Migration

When ready for production:

1. **Set up httpsS on your backend server**
2. **Update API URLs to use httpsS**
3. **Remove cleartext traffic configurations:**
   - Set `usesCleartextTraffic: false` in `app.json`
   - Remove `networkSecurityConfig` from `app.json`
   - Update `network_security_config.xml` to only allow httpsS
   - Remove `android:usesCleartextTraffic="true"` from AndroidManifest.xml

4. **Test thoroughly with httpsS endpoints**

## Support

If you continue to experience issues:

1. Check the Android logs for specific error messages
2. Verify your backend server is accessible from the device
3. Test with different network configurations
4. Consider using a VPN or different network for testing

## Files Modified/Created

- ✅ `app.json` - Updated with cleartext traffic configuration
- ✅ `android/app/src/main/res/xml/network_security_config.xml` - Created network security config
- ✅ `android/app/src/main/AndroidManifest.xml` - Created Android manifest
- ✅ `test_connectivity.js` - Created connectivity test script
- ✅ `CLEARTEXT_TRAFFIC_SETUP.md` - This documentation file 