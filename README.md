# Cricket Coach Mobile App

A React Native mobile application that integrates with a Flask backend to provide AI-powered cricket technique analysis. The app allows users to upload or record cricket videos and receive detailed biomechanical feedback and improvement suggestions.

## Features

- **Video Upload**: Select cricket videos from device gallery
- **Video Recording**: Record cricket videos directly in the app
- **AI Analysis**: Get detailed biomechanical analysis of batting and bowling techniques
- **Real-time Feedback**: Instant analysis results with improvement suggestions
- **Progress Tracking**: View analysis history and track improvements
- **Modern UI**: Clean, intuitive interface with Material Design 3
- **Cross-platform**: Works on both Android and iOS

## Tech Stack

### Backend (Flask)
- **Framework**: Flask
- **AI/ML**: PyTorch, TensorFlow, OpenAI GPT-4
- **Computer Vision**: OpenCV, MediaPipe
- **CORS**: flask-cors for mobile integration

### Mobile App (React Native + Expo)
- **Framework**: React Native with Expo
- **Navigation**: React Navigation v6
- **UI Library**: React Native Paper (Material Design 3)
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Video Handling**: Expo Camera, Expo Image Picker
- **Styling**: StyleSheet with custom theme system

## Prerequisites

- Node.js (v16 or higher)
- Python (v3.8 or higher)
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

## Installation & Setup

### 1. Backend Setup (Flask)

#### Install Python Dependencies
```bash
# Navigate to the backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Install Additional Dependencies
```bash
pip install flask-cors
pip install torch torchvision
pip install tensorflow tensorflow-hub
pip install opencv-python
pip install pandas numpy
pip install openai
pip install pytorchvideo
```

#### Configure Environment Variables
Create a `.env` file in the backend directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
FLASK_ENV=development
FLASK_DEBUG=True
```

#### Run the Backend
```bash
# Make sure you're in the backend directory
python backend_script.py
```

The Flask server will start on `http://localhost:8000`

### 2. Mobile App Setup (React Native + Expo)

#### Install Node.js Dependencies
```bash
# Navigate to the mobile app directory
cd mobile-app

# Install dependencies
npm install
```

#### Configure Environment Variables
Copy the example environment file:
```bash
cp env.example .env
```

Edit `.env` file:
```env
# API Configuration
API_BASE_URL=http://YOUR_COMPUTER_IP:8000
API_TIMEOUT=30000

# App Configuration
APP_NAME=Cricket Coach
APP_VERSION=1.0.0

# Development
DEBUG=true
```

**Important**: Replace `YOUR_COMPUTER_IP` with your computer's local IP address (e.g., `192.168.1.100`). You can find this by running `ipconfig` (Windows) or `ifconfig` (macOS/Linux).

#### Start the Development Server
```bash
# Start Expo development server
npm start
```

#### Run on Device/Emulator

**Android:**
```bash
# Install Expo Go app on your Android device
# Scan the QR code from the terminal
# Or run on Android emulator:
npm run android
```

**iOS:**
```bash
# Install Expo Go app on your iOS device
# Scan the QR code from the terminal
# Or run on iOS simulator (macOS only):
npm run ios
```

## Project Structure

```
cricket-coach/
├── backend_script.py          # Flask backend with AI analysis
├── mobile-app/                # React Native mobile app
│   ├── App.tsx               # Main app component
│   ├── package.json          # Node.js dependencies
│   ├── app.json             # Expo configuration
│   ├── babel.config.js      # Babel configuration
│   ├── tsconfig.json        # TypeScript configuration
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── screens/         # App screens
│   │   ├── services/        # API services
│   │   ├── context/         # React Context providers
│   │   ├── types/           # TypeScript type definitions
│   │   └── theme/           # UI theme and styling
│   └── assets/              # Images and static assets
└── README.md                # This file
```

## API Endpoints

### Backend API (Flask)

- `GET /api/health` - Health check endpoint
- `POST /api/upload` - Upload video for analysis
  - Form data: `video` (file), `player_type` (string), `batter_side`/`bowler_side` (string)

### Mobile App Features

- **Home Screen**: App overview and quick actions
- **Upload Screen**: Select and upload cricket videos
- **Camera Screen**: Record cricket videos directly
- **Results Screen**: View detailed analysis results
- **History Screen**: Browse past analyses
- **Profile Screen**: User settings and statistics

## Usage

### 1. Start the Backend
```bash
cd backend
python backend_script.py
```

### 2. Start the Mobile App
```bash
cd mobile-app
npm start
```

### 3. Using the App

1. **Upload Video**: 
   - Tap "Upload" tab
   - Select player type (Batsman/Bowler)
   - Choose batting/bowling side
   - Select video from gallery
   - Tap "Start Analysis"

2. **Record Video**:
   - Tap "Camera" tab
   - Configure settings (player type, side)
   - Tap record button
   - Review and analyze

3. **View Results**:
   - Detailed biomechanical analysis
   - Identified flaws and recommendations
   - General improvement tips
   - Injury risk assessment

4. **Track Progress**:
   - View analysis history
   - Search and filter results
   - Monitor improvements over time

## Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Ensure Flask backend is running
   - Check API_BASE_URL in .env file
   - Verify computer IP address is correct
   - Check firewall settings

2. **Video Upload Issues**
   - Ensure video format is supported (MP4, AVI, MOV, MKV)
   - Check video file size (max 100MB)
   - Verify camera permissions are granted

3. **Build Errors**
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall: `rm -rf node_modules && npm install`
   - Reset Expo cache: `expo start -c`

### Development Tips

1. **Testing on Physical Device**
   - Use Expo Go app for quick testing
   - Ensure device and computer are on same network
   - Use computer's local IP address in API_BASE_URL

2. **Backend Development**
   - Enable debug mode for detailed error messages
   - Check console logs for API request/response details
   - Monitor upload folder for processed videos

3. **Mobile App Development**
   - Use React Native Debugger for debugging
   - Enable hot reload for faster development
   - Test on both Android and iOS devices

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Contact: support@cricketcoach.com

## Acknowledgments

- OpenAI for GPT-4 integration
- PyTorch and TensorFlow teams for ML frameworks
- Expo team for React Native development tools
- React Native Paper for UI components
