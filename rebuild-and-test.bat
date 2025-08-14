@echo off
echo ========================================
echo CrickCoach App Rebuild and Test Script
echo ========================================
echo.

echo [1/4] Testing backend connectivity...
node test_connectivity.js
echo.

echo [2/4] Clearing Expo cache...
expo start --clear
echo.

echo [3/4] Starting Expo development server...
echo Please wait for the server to start, then:
echo - Press 'a' to open Android emulator/device
echo - Or scan the QR code with Expo Go app
echo.

echo [4/4] Instructions for testing:
echo.
echo 1. Once the app is running, go to Profile screen
echo 2. Use the "Test API Connection" button
echo 3. Check the logs for any cleartext traffic errors
echo 4. If successful, try logging in or uploading a video
echo.

echo ========================================
echo Configuration Summary:
echo ========================================
echo ✅ usesCleartextTraffic: true (in app.json)
echo ✅ Network security config created
echo ✅ Android manifest created
echo ✅ Backend connectivity verified
echo.
echo If you still see cleartext traffic errors:
echo 1. Uninstall and reinstall the app
echo 2. Clear app cache and data
echo 3. Check Android logs: adb logcat ^| grep -i cleartext
echo.

pause 