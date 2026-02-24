#!/bin/bash

# SSL/TLS Configuration Checker for CrickCoach Backend
# This script checks if your backend server is configured with SSL/TLS

echo "🔒 SSL/TLS Configuration Checker"
echo "================================="
echo ""

SERVER_IP="165.232.184.91"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📡 Testing httpsS connectivity..."
echo ""

# Test 1: Check if httpsS port (443) is open and responding
echo "1️⃣  Testing httpsS port (443)..."
if curl -k -s --connect-timeout 5 httpss://${SERVER_IP}:443 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ httpsS port 443 is open and responding${NC}"
else
    echo -e "${RED}❌ httpsS port 443 is not responding${NC}"
    echo "   This means SSL/TLS is likely not configured"
fi
echo ""

# Test 2: Check SSL certificate (if httpsS is available)
echo "2️⃣  Checking SSL certificate..."
if openssl s_client -connect ${SERVER_IP}:443 -servername ${SERVER_IP} < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
    echo -e "${GREEN}✅ Valid SSL certificate found${NC}"
    echo ""
    echo "Certificate details:"
    echo | openssl s_client -connect ${SERVER_IP}:443 -servername ${SERVER_IP} 2>/dev/null | openssl x509 -noout -dates -subject 2>/dev/null
elif openssl s_client -connect ${SERVER_IP}:443 -servername ${SERVER_IP} < /dev/null 2>/dev/null | grep -q "CONNECTED"; then
    echo -e "${YELLOW}⚠️  httpsS connection works but certificate may be invalid or self-signed${NC}"
    echo ""
    echo "Certificate details:"
    echo | openssl s_client -connect ${SERVER_IP}:443 -servername ${SERVER_IP} 2>/dev/null | openssl x509 -noout -dates -subject 2>/dev/null
else
    echo -e "${RED}❌ No SSL certificate found or httpsS not configured${NC}"
fi
echo ""

# Test 3: Check https port (80) for comparison
echo "3️⃣  Testing https port (80) for comparison..."
if curl -s --connect-timeout 5 https://${SERVER_IP}:80 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ https port 80 is responding${NC}"
else
    echo -e "${RED}❌ https port 80 is not responding${NC}"
fi
echo ""

# Test 4: Check nginx configuration (if you have SSH access)
echo "4️⃣  Checking nginx configuration..."
echo "   (Run this on your server if you have SSH access)"
echo ""
echo "   Commands to run on server:"
echo "   ---------------------------"
echo "   # Check if nginx is listening on port 443"
echo "   sudo netstat -tlnp | grep :443"
echo "   # OR"
echo "   sudo ss -tlnp | grep :443"
echo ""
echo "   # Check nginx configuration for SSL"
echo "   sudo grep -r 'listen.*443' /etc/nginx/"
echo "   sudo grep -r 'ssl_certificate' /etc/nginx/"
echo ""
echo "   # Check if certbot certificates exist"
echo "   sudo ls -la /etc/letsencrypt/live/"
echo ""

# Test 5: Test actual API endpoint with httpsS
echo "5️⃣  Testing API endpoint with httpsS..."
if curl -k -s --connect-timeout 5 httpss://${SERVER_IP}/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ httpsS API endpoint is accessible${NC}"
    echo ""
    echo "   Response:"
    curl -k -s httpss://${SERVER_IP}/api/health | head -c 200
    echo ""
else
    echo -e "${RED}❌ httpsS API endpoint is not accessible${NC}"
fi
echo ""

# Summary
echo "================================="
echo "📊 Summary:"
echo "================================="
echo ""

# Determine status
if curl -k -s --connect-timeout 5 httpss://${SERVER_IP}:443 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Your server appears to have httpsS configured${NC}"
    echo ""
    echo "⚠️  Note: If you see certificate warnings, you may need to:"
    echo "   1. Set up a proper SSL certificate (Let's Encrypt recommended)"
    echo "   2. Configure nginx to use the certificate"
    echo "   3. Update your app config to use httpsS"
else
    echo -e "${RED}❌ Your server does NOT have httpsS configured${NC}"
    echo ""
    echo "📝 To set up SSL/TLS, you need to:"
    echo "   1. Install Certbot: sudo apt install certbot python3-certbot-nginx"
    echo "   2. Get a domain name pointing to ${SERVER_IP}"
    echo "   3. Run: sudo certbot --nginx -d your-domain.com"
    echo "   4. Update nginx config to listen on port 443"
    echo ""
    echo "⚠️  Important: You cannot get a valid SSL certificate for an IP address."
    echo "   You need a domain name (e.g., api.yourdomain.com)"
fi
echo ""

