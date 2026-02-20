#!/bin/bash

echo "========================================"
echo "iOS Clean Rebuild Script"
echo "========================================"
echo ""

echo "[1/6] Cleaning Expo cache..."
rm -rf .expo
rm -rf node_modules/.cache
echo "✅ Cache cleared"
echo ""

echo "[2/6] Cleaning iOS build artifacts..."
cd ios
rm -rf build
rm -rf Pods
rm -rf Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData/*
echo "✅ iOS build artifacts cleared"
cd ..
echo ""

echo "[3/6] Reinstalling pods..."
cd ios
pod deintegrate || true
pod install --repo-update
echo "✅ Pods reinstalled"
cd ..
echo ""

echo "[4/6] Running Expo prebuild (clean)..."
npx expo prebuild --clean --platform ios
echo "✅ Prebuild completed"
echo ""

echo "[5/6] Verifying Info.plist configuration..."
if grep -q "NSAllowsArbitraryLoads" ios/CrickCoachAI/Info.plist; then
    echo "✅ NSAllowsArbitraryLoads found in Info.plist"
else
    echo "❌ WARNING: NSAllowsArbitraryLoads not found in Info.plist"
fi

if grep -q "139.59.1.59" ios/CrickCoachAI/Info.plist; then
    echo "✅ Backend IP (139.59.1.59) found in Info.plist exceptions"
else
    echo "❌ WARNING: Backend IP not found in Info.plist exceptions"
fi
echo ""

echo "[6/6] Build instructions:"
echo ""
echo "To build and run on iOS:"
echo "  npx expo run:ios"
echo ""
echo "Or open in Xcode:"
echo "  open ios/CrickCoachAI.xcworkspace"
echo ""
echo "========================================"
echo "Important Notes:"
echo "========================================"
echo "1. Make sure you're using a DEVELOPMENT BUILD, not Expo Go"
echo "2. The app must be completely uninstalled from your device first"
echo "3. After rebuilding, install the new build on your device"
echo "4. Check the logs to verify network connections are working"
echo ""
echo "To verify ATS settings after build:"
echo "  Check: ios/CrickCoachAI/Info.plist"
echo "  Look for: NSAppTransportSecurity -> NSAllowsArbitraryLoads = true"
echo ""

