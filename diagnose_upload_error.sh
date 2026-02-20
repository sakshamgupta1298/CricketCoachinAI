#!/bin/bash

# Diagnostic script for upload errors
# Run this on the server to identify the issue

echo "=========================================="
echo "Upload Error Diagnostic Script"
echo "=========================================="
echo ""

# 1. Check if backend is running
echo "1. Checking backend service status..."
if systemctl is-active --quiet crickcoach-backend; then
    echo "   ✅ Backend service is running"
else
    echo "   ❌ Backend service is NOT running"
    echo "   Start it with: systemctl start crickcoach-backend"
fi
echo ""

# 2. Check recent backend logs
echo "2. Recent backend errors (last 20 lines)..."
echo "   ----------------------------------------"
journalctl -u crickcoach-backend -n 20 --no-pager | grep -i "error\|exception\|traceback\|failed" || echo "   No recent errors found"
echo ""

# 3. Check nginx error logs
echo "3. Recent nginx errors (last 20 lines)..."
echo "   ----------------------------------------"
if [ -f /var/log/nginx/crickcoach_error.log ]; then
    tail -20 /var/log/nginx/crickcoach_error.log | grep -i "error\|500" || echo "   No recent errors found"
else
    echo "   ⚠️  Nginx error log not found"
fi
echo ""

# 4. Check file permissions
echo "4. Checking file permissions..."
if [ -d "/root/CricketCoachinAI/uploads" ]; then
    if [ -w "/root/CricketCoachinAI/uploads" ]; then
        echo "   ✅ Uploads directory is writable"
    else
        echo "   ❌ Uploads directory is NOT writable"
        echo "   Fix with: chmod -R 755 /root/CricketCoachinAI/uploads"
    fi
else
    echo "   ⚠️  Uploads directory does not exist"
    echo "   Create with: mkdir -p /root/CricketCoachinAI/uploads"
fi

if [ -d "/root/CricketCoachinAI/logging" ]; then
    if [ -w "/root/CricketCoachinAI/logging" ]; then
        echo "   ✅ Logging directory is writable"
    else
        echo "   ❌ Logging directory is NOT writable"
        echo "   Fix with: chmod -R 755 /root/CricketCoachinAI/logging"
    fi
else
    echo "   ⚠️  Logging directory does not exist"
fi
echo ""

# 5. Check disk space
echo "5. Checking disk space..."
df -h / | tail -1 | awk '{print "   Available: " $4 " / " $2 " (" $5 " used)"}'
if [ $(df / | tail -1 | awk '{print $5}' | sed 's/%//') -gt 90 ]; then
    echo "   ⚠️  Disk space is low (above 90%)"
else
    echo "   ✅ Disk space is sufficient"
fi
echo ""

# 6. Check if port 3000 is listening
echo "6. Checking if backend is listening on port 3000..."
if netstat -tlnp 2>/dev/null | grep -q ":3000 "; then
    echo "   ✅ Port 3000 is listening"
    netstat -tlnp 2>/dev/null | grep ":3000 " | head -1
else
    echo "   ❌ Port 3000 is NOT listening"
    echo "   Backend may not be running properly"
fi
echo ""

# 7. Check nginx configuration
echo "7. Checking nginx configuration..."
if nginx -t 2>&1 | grep -q "successful"; then
    echo "   ✅ Nginx configuration is valid"
else
    echo "   ❌ Nginx configuration has errors:"
    nginx -t 2>&1 | grep -i error
fi

if grep -q "client_max_body_size 100M" /etc/nginx/sites-available/crickcoach 2>/dev/null; then
    echo "   ✅ client_max_body_size is set to 100M"
else
    echo "   ⚠️  client_max_body_size may not be set correctly"
fi
echo ""

# 8. Test health endpoint
echo "8. Testing backend health endpoint..."
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "   ✅ Health endpoint is responding"
    curl -s http://localhost:3000/api/health | head -1
else
    echo "   ❌ Health endpoint is NOT responding"
    echo "   Backend may be down or not accessible"
fi
echo ""

# 9. Check Python environment
echo "9. Checking Python environment..."
if [ -f "/root/CricketCoachinAI/myenv/bin/python3" ]; then
    echo "   ✅ Python virtual environment exists"
    /root/CricketCoachinAI/myenv/bin/python3 --version
else
    echo "   ❌ Python virtual environment NOT found"
    echo "   Expected: /root/CricketCoachinAI/myenv/bin/python3"
fi
echo ""

# 10. Check backend script
echo "10. Checking backend script..."
if [ -f "/root/CricketCoachinAI/backend_script.py" ]; then
    echo "   ✅ Backend script exists"
    # Check if it has error handling
    if grep -q "try:" /root/CricketCoachinAI/backend_script.py | grep -q "def api_upload_file"; then
        echo "   ✅ Upload endpoint has error handling"
    else
        echo "   ⚠️  Upload endpoint may not have error handling"
    fi
else
    echo "   ❌ Backend script NOT found"
fi
echo ""

echo "=========================================="
echo "Diagnostic Complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review the errors above"
echo "2. Check detailed logs: journalctl -u crickcoach-backend -f"
echo "3. Test upload with: curl -X POST http://localhost:3000/api/upload ..."
echo ""

