#!/bin/bash

# Quick Fix for Backend CORS and Network Issues
# Run this on your Digital Ocean droplet

echo "🔧 Fixing Backend CORS and Network Issues..."

# Navigate to your project directory
cd /root/CricketCoachinAI

# Stop the current backend
echo "🛑 Stopping current backend..."
sudo pkill -f "python.*backend_script.py" || true
sleep 2

# Check if the backend file exists
if [ ! -f "backend_script.py" ]; then
    echo "❌ backend_script.py not found!"
    exit 1
fi

# Activate virtual environment
if [ -d "myenv" ]; then
    echo "📦 Activating virtual environment..."
    source myenv/bin/activate
fi

# Check firewall
echo "🔥 Checking firewall..."
sudo ufw status
sudo ufw allow 3000/tcp
sudo ufw reload

# Start the backend with proper settings
echo "🚀 Starting backend with CORS fixes..."
nohup python3 backend_script.py > /var/log/crickcoach-backend.log 2>&1 &

# Wait for the backend to start
echo "⏳ Waiting for backend to start..."
sleep 10

# Test the backend
echo "🧪 Testing backend..."
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Backend is running successfully!"
    echo "🌐 External URL: http://206.189.141.194:3000"
    
    # Test CORS headers
    echo "🔍 Testing CORS headers..."
    curl -I -H "Origin: https://example.com" \
         -H "Access-Control-Request-Method: POST" \
         -H "Access-Control-Request-Headers: Content-Type" \
         -X OPTIONS http://localhost:3000/api/health
    
    echo ""
    echo "✅ Backend should now work with your mobile app!"
    echo "📱 Try testing your APK now."
else
    echo "❌ Backend is not responding. Check logs:"
    tail -20 /var/log/crickcoach-backend.log
fi
