# Ngrok Setup for CrickCoach

This document explains how to use ngrok to solve the cleartext traffic issue and enable secure HTTPS communication between your mobile app and backend.

## 🎯 Problem Solved

- ❌ **Before**: "Cleartext traffic not permitted" errors
- ✅ **After**: Secure HTTPS communication with no configuration issues

## 🚀 Benefits of Using Ngrok

1. **HTTPS by Default** - No more cleartext traffic issues
2. **Works from Anywhere** - Your app can connect from any network
3. **No Special Configuration** - No need for Android manifest changes
4. **Secure** - Encrypted traffic between app and backend
5. **Easy Testing** - Works on physical devices and emulators

## 📋 Current Configuration

### API Base URL
```
https://7ffc0e8d88a6.ngrok-free.app
```

### Updated Files
- ✅ `config.js` - Updated to use ngrok URL
- ✅ `app.json` - Removed cleartext traffic configuration
- ✅ `test_connectivity.js` - Updated to test ngrok URL

## 🔧 Setup Instructions

### 1. Start Ngrok
```bash
ngrok http 8000
```

### 2. Update Configuration
The configuration has been automatically updated to use your ngrok URL.

### 3. Test Connectivity
```bash
node test_connectivity.js
```

### 4. Start Your App
```bash
expo start --clear
```

## 📱 Testing Your App

1. **Open the app** on your device/emulator
2. **Go to Profile screen**
3. **Use "Test API Connection" button**
4. **Try logging in** with your credentials
5. **Test video upload** functionality

## ⚠️ Important Notes

### Keep Ngrok Running
- Ngrok must stay running while testing
- The URL will change if you restart ngrok
- Update `config.js` if the URL changes

### URL Changes
If ngrok restarts and gives you a new URL:
1. Update `config.js` with the new URL
2. Rebuild your app: `expo start --clear`

### Free Tier Limitations
- ngrok free tier has some limitations
- For production, consider a paid ngrok plan or proper hosting

## 🔄 Migration from HTTP to HTTPS

### What Changed
- **Before**: `http://192.168.1.3:8000`
- **After**: `https://7ffc0e8d88a6.ngrok-free.app`

### Removed Configuration
- ❌ `usesCleartextTraffic: true`
- ❌ `networkSecurityConfig`
- ❌ Custom Android manifest files

### Benefits
- ✅ No more Android configuration issues
- ✅ Works on all devices and networks
- ✅ More secure communication
- ✅ Easier testing and deployment

## 🐛 Troubleshooting

### App Can't Connect
1. **Check if ngrok is running**
2. **Verify the URL in config.js**
3. **Test with the connectivity script**
4. **Check ngrok dashboard at http://localhost:4040**

### URL Changed
1. **Update config.js with new URL**
2. **Rebuild app: expo start --clear**
3. **Test connectivity again**

### Backend Not Accessible
1. **Ensure backend is running on port 8000**
2. **Check ngrok tunnel status**
3. **Verify firewall settings**

## 📊 Testing Results

```
✅ SUCCESS: https://7ffc0e8d88a6.ngrok-free.app/api/health
   Status: 200
   Response: {
     "message": "Cricket Coach API is running",
     "status": "healthy"
   }
```

## 🎉 Success!

Your app should now work without any cleartext traffic issues. The HTTPS connection through ngrok provides:

- **Secure communication**
- **No Android configuration needed**
- **Works from any network**
- **Easy testing and development**

## 📞 Support

If you encounter any issues:
1. Check ngrok is running
2. Verify the URL in configuration
3. Test connectivity with the provided script
4. Check the ngrok dashboard for tunnel status 