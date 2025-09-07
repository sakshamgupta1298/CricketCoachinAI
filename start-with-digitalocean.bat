@echo off
echo ========================================
echo CrickCoach App with Digital Ocean Backend
echo ========================================
echo.

echo [1/4] Testing Digital Ocean connectivity...
node test_connectivity.js
echo.

echo [2/4] Configuration Summary:
echo ✅ Using Digital Ocean droplet: http://165.232.184.91:3000
echo ✅ HTTP (no cleartext traffic issues)
echo ✅ Works from any network
echo ✅ No special Android configuration needed
echo.

echo [3/4] Starting Expo development server...
echo Please wait for the server to start, then:
echo - Press 'a' to open Android emulator/device
echo - Or scan the QR code with Expo Go app
echo.

echo [4/4] Testing Instructions:
echo.
echo 1. Once the app is running, go to Profile screen
echo 2. Use the "Test API Connection" button
echo 3. Try logging in with your credentials
echo 4. Test video upload functionality
echo.

echo ========================================
echo Important Notes:
echo ========================================
echo 🔗 Digital Ocean droplet: http://165.232.184.91:3000
echo ⚠️  Backend must be running on the droplet
echo 📱 Works on any device/network
echo 🔒 HTTP - no security issues
echo.

echo Starting Expo...
expo start --clear

pause
