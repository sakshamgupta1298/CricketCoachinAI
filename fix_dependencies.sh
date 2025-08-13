#!/bin/bash

echo "🔧 Fixing Cricket Coach Dependencies"
echo "===================================="

# Backend fixes
echo ""
echo "🐍 Backend (Flask) Fixes:"
echo "1. Updating OpenAI to compatible version..."
pip uninstall openai -y
pip install openai==0.28.1

echo "2. Installing flask-cors..."
pip install flask-cors==4.0.0

echo "✅ Backend dependencies fixed!"

# Mobile app fixes
echo ""
echo "📱 Mobile App (React Native) Fixes:"
echo "1. Clearing npm cache..."
npm cache clean --force

echo "2. Removing node_modules..."
rm -rf node_modules

echo "3. Removing package-lock.json..."
rm -f package-lock.json

echo "4. Reinstalling dependencies..."
npm install

echo "✅ Mobile app dependencies fixed!"

echo ""
echo "🎉 All dependencies have been fixed!"
echo ""
echo "Next steps:"
echo "1. Start the Flask backend: python backend_script.py"
echo "2. Start the mobile app: npm start"
echo ""
echo "The OpenAI client error should now be resolved." 