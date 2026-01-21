#!/bin/bash

echo "========================================"
echo "CrickCoach APK Rebuild Script"
echo "========================================"
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g eas-cli
fi

# Check if logged in to Expo
echo "🔍 Checking Expo login status..."
if ! eas whoami &> /dev/null; then
    echo "⚠️  Not logged in to Expo. Please login:"
    echo "   eas login"
    exit 1
fi

echo "✅ Logged in to Expo"
echo ""

# Increment version code in app.json
echo "📝 Updating version code..."
CURRENT_VERSION=$(grep -o '"versionCode": [0-9]*' app.json | grep -o '[0-9]*')
NEW_VERSION=$((CURRENT_VERSION + 1))
sed -i '' "s/\"versionCode\": $CURRENT_VERSION/\"versionCode\": $NEW_VERSION/g" app.json
echo "✅ Version code updated to $NEW_VERSION"
echo ""

# Ask user which build profile to use
echo "Select build profile:"
echo "1. Preview (faster, unsigned, for testing)"
echo "2. Production (slower, properly signed)"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" == "1" ]; then
    PROFILE="preview"
    echo "📦 Building preview APK..."
elif [ "$choice" == "2" ]; then
    PROFILE="production"
    echo "📦 Building production APK..."
else
    echo "❌ Invalid choice. Using preview profile."
    PROFILE="preview"
fi

echo ""
echo "🚀 Starting EAS build..."
echo "   Profile: $PROFILE"
echo "   Platform: android"
echo ""

# Build APK
eas build --platform android --profile $PROFILE

echo ""
echo "========================================"
echo "Build completed!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Download the APK from the EAS build page"
echo "2. Transfer to your Android device"
echo "3. Enable 'Install Unknown Apps' in device settings"
echo "4. Install the APK"
echo ""
echo "To install via ADB:"
echo "   adb install -r <downloaded-apk-file>"
echo ""

