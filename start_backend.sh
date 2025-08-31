#!/bin/bash

# CrickCoach Backend Startup Script
# This script handles the terminal issues when running Flask on servers

echo "🚀 Starting CrickCoach Backend..."

# Navigate to the project directory
cd /root/CricketCoachinAI

# Activate virtual environment if it exists
if [ -d "myenv" ]; then
    echo "📦 Activating virtual environment..."
    source myenv/bin/activate
fi

# Set environment variables
export FLASK_ENV=production
export FLASK_DEBUG=0

# Create log directory if it doesn't exist
sudo mkdir -p /var/log
sudo touch /var/log/crickcoach-backend.log
sudo chmod 666 /var/log/crickcoach-backend.log

echo "🔧 Starting backend with production settings..."

# Start the backend with proper settings for server environment
python3 backend_script.py 2>&1 | tee /var/log/crickcoach-backend.log
