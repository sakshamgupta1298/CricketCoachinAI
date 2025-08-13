#!/bin/bash

echo "🏏 Cricket Coach Mobile App Setup"
echo "=================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Backend setup
echo ""
echo "🔧 Setting up Flask Backend..."
echo "================================"

# Create virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "✅ Backend setup completed"

# Mobile app setup
echo ""
echo "📱 Setting up React Native Mobile App..."
echo "========================================"

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Create environment file
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp env.example .env
    echo "⚠️  Please edit .env file and set your computer's IP address in API_BASE_URL"
fi

echo "✅ Mobile app setup completed"

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit .env file and set your computer's IP address"
echo "2. Start the Flask backend: python backend_script.py"
echo "3. Start the mobile app: npm start"
echo ""
echo "For detailed instructions, see README.md" 