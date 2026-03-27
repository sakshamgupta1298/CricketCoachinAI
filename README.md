# Cricket Coach Mobile App

A React Native mobile application that integrates with a Flask backend to provide AI-powered cricket technique analysis. The app allows users to upload or record cricket videos and receive detailed biomechanical feedback and improvement suggestions.

## Features

- **Video Upload**: Select cricket videos from device gallery
- **Video Recording**: Record cricket videos directly in the app
- **AI Analysis**: Get detailed biomechanical analysis of **batting**, **bowling**, and **wicket-keeping** techniques (user selects player type and context; no automatic action recognition)
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
- **https Client**: Axios
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

The Flask server will start on `https://localhost:8000`

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
API_BASE_URL=https://YOUR_COMPUTER_IP:8000
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
  - Form data: `video` (file), `player_type` (batsman/bowler/keeper), `batter_side`/`bowler_side`/`keeper_side`, `shot_type` (batsman), `bowler_type` (bowler), `keeping_type` (keeper)

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
   - Select player type (Batsman/Bowler/Keeper)
   - Choose side and context (e.g. shot type, bowler type, or keeping type)
   - Select video from gallery
   - Tap "Start Analysis"

2. **Record Video**:
   - Tap "Camera" tab
   - Configure settings (player type, side)
   - Tap record button
   - Review and analyze

3. **View Results**:
   - Detailed biomechanical analysis (batting, bowling, or keeping)
   - Identified flaws and recommendations
   - General improvement tips
   - Injury risk assessment

4. **Track Progress**:
   - View analysis history
   - Search and filter results
   - Monitor improvements over time

## How Reviewers Can Test the App

This section gives reviewers a clear path to run and test CrickCoach locally.

---

### For Apple (App Store) Reviewers — iOS Test Flow

Use this flow when testing the app on **iOS** (TestFlight or App Store build). The app connects to our backend; no local setup required.

**1. Open the app**  
→ Launch CrickCoach on your iOS device.

**2. Sign in**  
→ Sign in with **Email** or **Continue with Google** (or use the test account provided in App Store Connect “Notes for Review,” if any).

**3. Go to Upload**  
→ Tap the **Upload** tab (or “Upload Video” from Home).

**4. Choose analysis type**  
→ **Player type:** Batsman / Bowler / Wicket-Keeper  
→ **Side:** Left / Right  
→ **Context:** e.g. Shot type (Cover drive, Pull, etc.), Bowler type (Fast/Spin), or Keeping type (Standing up, Diving, etc.)

**5. Select video**  
→ Tap to pick a short cricket video (5–15 seconds) from the device gallery, or use the sample video if provided in review notes.

**6. Start analysis**  
→ Tap **Start Analysis** and wait for processing (may take 30–90 seconds).

**7. View results**  
→ Confirm the **Results** screen shows: analysis summary, identified flaws, recommendations, and general tips.  
→ Optionally tap **Generate Training Plan** to get a practice schedule.

**8. (Optional) Record & analyze**  
→ Open the **Camera** tab → set player type and side → record a short clip → run analysis and check results.

**9. (Optional) History**  
→ Open **History** and confirm past analyses are listed and open correctly.

**Flow summary:**
```
Open app → Sign in → Upload tab → Select Batsman/Bowler/Keeper + side + context
→ Pick video → Start Analysis → View Results (and optionally Training Plan)
→ Optional: Camera tab (record → analyze) and History
```

If you need **test credentials** or a **demo video**, see the “Notes for Review” (or “App Review Information”) in App Store Connect for this build.

---

### Quick checklist (local testing)

- **Backend**: Python 3.8+, virtual environment, dependencies, `.env` with `OPENAI_API_KEY`
- **Mobile**: Node.js 16+, Expo, device/emulator on same network as host
- **Network**: Backend and phone/emulator must reach each other (use host machine’s IP in mobile `.env`)

### 1. One-time setup

**Backend (from project root):**
```bash
# From project root (CricketCoachinAI)
python -m venv venv
# Activate: source venv/bin/activate (macOS/Linux) or venv\Scripts\activate (Windows)
pip install -r requirements.txt
pip install flask-cors torch torchvision tensorflow tensorflow-hub opencv-python pandas numpy openai
```

Create a `.env` in the project root (or next to `backend_script.py`):
```env
OPENAI_API_KEY=your_openai_api_key_here
FLASK_ENV=development
FLASK_DEBUG=True
```

**Mobile app:**
```bash
cd mobile-app
npm install
cp env.example .env
```

Edit `mobile-app/.env`: set `API_BASE_URL=https://YOUR_COMPUTER_IP:8000` (use your machine’s local IP, e.g. `192.168.1.x`). Same network as the device/emulator.

### 2. Run and verify backend

```bash
# From project root, with venv activated
python backend_script.py
```

Server should listen on port 8000. Quick check:

```bash
curl -k https://localhost:8000/api/health
```

(or open that URL in a browser; you may need to accept the self-signed cert).

### 3. Run the mobile app

```bash
cd mobile-app
npm start
```

- **Physical device**: Install “Expo Go”, scan the QR code, ensure device is on the same Wi‑Fi as the host.
- **Android emulator**: `npm run android`.
- **iOS simulator (macOS)**: `npm run ios`.

### 4. Test flows in the app

1. **Auth (if enabled)**  
   Sign up or log in to confirm auth and navigation work.

2. **Upload flow**  
   - Open **Upload** (or equivalent).  
   - Choose **player type**: Batsman / Bowler / Keeper.  
   - Set **side** (e.g. left/right) and **context** (e.g. shot type, bowler type, keeping type).  
   - Pick a short cricket video (e.g. 5–15 s) from gallery.  
   - Start analysis and wait for the result screen.

3. **Camera flow (optional)**  
   - Open **Camera**, set player type and side, record a short clip, then run analysis.

4. **Results**  
   - Confirm that analysis text, flaws, and tips appear.  
   - Optionally request a **training plan** and check that it generates.

5. **History**  
   - Open **History** and confirm past analyses are listed and open correctly.

### 5. What to report

- **Setup**: Any step that failed (with OS, Node/Python versions, and error messages).  
- **Backend**: Does `GET /api/health` respond? Any errors in the terminal when running analysis?  
- **Mobile**: Can you reach the app and see the UI? Does upload/camera → analysis → results work end-to-end?  
- **Analysis**: Does feedback look sensible for the uploaded video (e.g. batting/bowling/keeping)?  
- **Performance**: Approximate time from “Start Analysis” to results, and any timeouts or crashes.

### 6. Minimal test without full analysis

If you only want to confirm backend + app connectivity:

1. Start backend and run `curl -k https://localhost:8000/api/health`.  
2. Start the app with `API_BASE_URL` pointing at your machine’s IP.  
3. In the app, try any screen that triggers an API call (e.g. login or upload).  
4. Check backend logs for the request; no need to complete a full AI analysis.

**Note:** The README also references a `backend` directory for some steps; in this repo the backend runs from the **project root** (`backend_script.py`, `requirements.txt`). Use the commands above when testing from a fresh clone.

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
