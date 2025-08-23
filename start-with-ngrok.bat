@echo off
echo ========================================
echo CrickCoach App with Ngrok Configuration
echo ========================================
echo.

echo [1/4] Testing ngrok connectivity...
node test_connectivity.js
echo.

echo [2/4] Configuration Summary:
echo ✅ Using ngrok URL: https://b0a929210c19.ngrok-free.app
echo ✅ HTTPS (no cleartext traffic issues)
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
echo 🔗 Ngrok URL: https://b0a929210c19.ngrok-free.app
echo ⚠️  Keep ngrok running: ngrok http 8000
echo 📱 Works on any device/network
echo 🔒 HTTPS - no security issues
echo.

echo Starting Expo...
expo start --clear

pause 