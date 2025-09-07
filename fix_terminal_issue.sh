#!/bin/bash

# Quick Fix for Terminal Issue on Digital Ocean Droplet
# Run this script on your droplet to fix the Flask terminal error

echo "🔧 Fixing Flask Terminal Issue..."

# Navigate to your project directory
cd /root/CricketCoachinAI

# Make the startup script executable
chmod +x start_backend.sh

# Stop any existing backend processes
echo "🛑 Stopping existing backend processes..."
sudo pkill -f "python.*backend_script.py" || true
sudo systemctl stop crickcoach-backend.service || true

# Wait a moment
sleep 2

# Test the backend directly
echo "🧪 Testing backend startup..."
python3 -c "
import sys
sys.path.append('/root/CricketCoachinAI')
from backend_script import app, init_database, initialize_models

print('Testing imports...')
init_database()
print('Database initialized')
initialize_models()
print('Models initialized')
print('✅ Backend imports successful!')
"

# Start the backend manually to test
echo "🚀 Starting backend manually..."
nohup python3 backend_script.py > /var/log/crickcoach-backend.log 2>&1 &

# Wait for the backend to start
echo "⏳ Waiting for backend to start..."
sleep 10

# Test if the backend is responding
echo "🧪 Testing backend connectivity..."
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Backend is running successfully!"
    echo "🌐 External URL: http://165.232.184.91:3000"
    echo "📊 Health check: http://165.232.184.91:3000/api/health"
    
    # Set up the systemd service
    echo "🔧 Setting up systemd service..."
    sudo cp crickcoach-backend.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable crickcoach-backend.service
    
    echo "✅ Setup completed! Your backend should now work with your mobile app."
else
    echo "❌ Backend is not responding. Check logs:"
    tail -20 /var/log/crickcoach-backend.log
fi
