#!/bin/bash

# Digital Ocean Backend Fix Script
# Run this on your Digital Ocean droplet

echo "🔧 Fixing Digital Ocean Backend Connectivity Issues..."

# 1. Check if Python and required packages are installed
echo "📦 Checking Python dependencies..."
python3 --version
pip3 --version

# 2. Install required packages if not present
echo "📦 Installing required packages..."
pip3 install -r requirements.txt

# 3. Check if the backend script exists
if [ ! -f "backend_script.py" ]; then
    echo "❌ backend_script.py not found in current directory"
    echo "Please upload the backend_script.py file to your droplet"
    exit 1
fi

# 4. Check if the model file exists, download if not
if [ ! -f "slowfast_cricket.pth" ]; then
    echo "📥 Model file not found, downloading..."
    python3 -c "
import os
import gdown
MODEL_PATH = 'slowfast_cricket.pth'
FILE_ID = '1SRsNEUv4a4FLisMZGM0-BH1J4RlqT0HN'
DOWNLOAD_URL = f'https://drive.google.com/uc?id={FILE_ID}'
if not os.path.exists(MODEL_PATH):
    print('Downloading model...')
    gdown.download(DOWNLOAD_URL, MODEL_PATH, quiet=False)
    print('Model downloaded successfully!')
else:
    print('Model already exists!')
"
fi

# 5. Create uploads directory if it doesn't exist
mkdir -p uploads

# 6. Check if port 3000 is already in use
echo "🔍 Checking if port 3000 is in use..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️ Port 3000 is already in use. Stopping existing process..."
    sudo pkill -f "python.*backend_script.py"
    sleep 2
fi

# 7. Check firewall status
echo "🔥 Checking firewall status..."
sudo ufw status

# 8. Ensure port 3000 is open in firewall
echo "🔥 Opening port 3000 in firewall..."
sudo ufw allow 3000/tcp
sudo ufw reload

# 9. Start the backend server
echo "🚀 Starting backend server..."
echo "The server will be accessible at: http://$(curl -s ifconfig.me):3000"
echo "Press Ctrl+C to stop the server"

# Run the backend with proper error handling
python3 backend_script.py
