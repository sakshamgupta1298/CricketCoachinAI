#!/bin/bash

# Comprehensive Digital Ocean Backend Setup Script
# Run this on your Digital Ocean droplet

set -e  # Exit on any error

echo "🚀 Setting up CrickCoach Backend on Digital Ocean..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Install required system packages
print_status "Installing system dependencies..."
sudo apt install -y python3 python3-pip python3-venv curl wget git ufw

# 3. Create project directory
print_status "Setting up project directory..."
mkdir -p /root/CrickCoach
cd /root/CrickCoach

# 4. Copy files to the directory (assuming they're uploaded)
print_status "Checking for backend files..."
if [ ! -f "backend_script.py" ]; then
    print_error "backend_script.py not found! Please upload it to /root/CrickCoach/"
    exit 1
fi

if [ ! -f "requirements.txt" ]; then
    print_error "requirements.txt not found! Please upload it to /root/CrickCoach/"
    exit 1
fi

# 5. Create virtual environment
print_status "Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# 6. Install Python dependencies
print_status "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# 7. Download model if not present
print_status "Checking for model file..."
if [ ! -f "slowfast_cricket.pth" ]; then
    print_status "Downloading model file..."
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

# 8. Create uploads directory
print_status "Creating uploads directory..."
mkdir -p uploads

# 9. Configure firewall
print_status "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 3000/tcp
sudo ufw reload

# 10. Create systemd service
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/crickcoach-backend.service > /dev/null <<EOF
[Unit]
Description=CrickCoach Backend Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/CrickCoach
Environment=PATH=/root/CrickCoach/venv/bin:/usr/bin:/usr/local/bin
ExecStart=/root/CrickCoach/venv/bin/python /root/CrickCoach/backend_script.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 11. Enable and start the service
print_status "Enabling and starting the service..."
sudo systemctl daemon-reload
sudo systemctl enable crickcoach-backend.service
sudo systemctl start crickcoach-backend.service

# 12. Check service status
print_status "Checking service status..."
sleep 5
sudo systemctl status crickcoach-backend.service --no-pager

# 13. Test the API
print_status "Testing API endpoint..."
sleep 10
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    print_status "✅ Backend is running successfully!"
    print_status "🌐 External URL: http://$(curl -s ifconfig.me):3000"
    print_status "🔧 Health check: http://$(curl -s ifconfig.me):3000/api/health"
else
    print_error "❌ Backend is not responding. Check logs with: sudo journalctl -u crickcoach-backend.service -f"
fi

# 14. Show useful commands
echo ""
print_status "Useful commands:"
echo "  View logs: sudo journalctl -u crickcoach-backend.service -f"
echo "  Restart service: sudo systemctl restart crickcoach-backend.service"
echo "  Stop service: sudo systemctl stop crickcoach-backend.service"
echo "  Check status: sudo systemctl status crickcoach-backend.service"
echo "  Test API: curl http://localhost:3000/api/health"

print_status "Setup completed! Your backend should now be accessible from your mobile app."
