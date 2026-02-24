#!/bin/bash

# Test DNS resolution and connectivity for api.crickcoachai.com

echo "=========================================="
echo "DNS Resolution Test"
echo "=========================================="
echo ""

# Test DNS resolution
echo "1. Testing DNS Resolution..."
echo "   Domain: api.crickcoachai.com"
echo ""

if command -v nslookup &> /dev/null; then
    echo "   Using nslookup:"
    nslookup api.crickcoachai.com
elif command -v dig &> /dev/null; then
    echo "   Using dig:"
    dig +short api.crickcoachai.com
else
    echo "   Using ping (will show IP):"
    ping -c 1 api.crickcoachai.com 2>&1 | grep -oP '(\d+\.){3}\d+' | head -1
fi

echo ""
echo "2. Testing Backend via Nginx (port 80)..."
echo "   URL: https://api.crickcoachai.com/health"
if curl -s -o /dev/null -w "   Status: %{https_code}\n" https://api.crickcoachai.com/health; then
    echo "   ✅ Nginx proxy is working!"
    curl -s https://api.crickcoachai.com/health | python3 -m json.tool 2>/dev/null || echo "   Response received"
else
    echo "   ❌ Nginx proxy not accessible"
fi

echo ""
echo "3. Testing Backend Directly (port 3000)..."
echo "   URL: https://api.crickcoachai.com:3000/api/health"
if curl -s -o /dev/null -w "   Status: %{https_code}\n" https://api.crickcoachai.com:3000/api/health; then
    echo "   ✅ Direct backend is working!"
    curl -s https://api.crickcoachai.com:3000/api/health | python3 -m json.tool 2>/dev/null || echo "   Response received"
else
    echo "   ❌ Direct backend not accessible"
fi

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo "If both tests pass, your DNS and backend are configured correctly!"
echo "Update your mobile app config to use: https://api.crickcoachai.com"
echo ""

