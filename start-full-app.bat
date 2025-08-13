@echo off
echo 🏏 Starting Cricket Coach Full Stack App...
echo =========================================

echo.
echo 🐍 Starting Python Backend Server...
echo ===================================
echo Activating virtual environment...
call venvcrickI\Scripts\activate.bat

echo Starting Flask server on port 8000...
start "Backend Server" cmd /k "python backend_script.py"

echo.
echo ⏳ Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo.
echo 📱 Starting React Native Frontend...
echo ===================================
echo Starting Expo development server...
start "Frontend App" cmd /k "npx expo start --clear"

echo.
echo ✅ Both servers should now be running!
echo 🌐 Backend: http://192.168.1.3:8000
echo 📱 Frontend: Expo development server
echo.
echo 📋 Next steps:
echo 1. Wait for both servers to fully start
echo 2. Open Expo Go on your phone
echo 3. Scan the QR code from the frontend terminal
echo 4. Test the app by uploading a video
echo.
pause 