#!/bin/bash

# Systemd Service Setup Script for CrickCoach Backend
# Run this script on your server to set up the systemd service

echo "=========================================="
echo "CrickCoach Backend Systemd Setup"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Create systemd service file
echo "📝 Creating systemd service file..."
cat > /etc/systemd/system/crickcoach-backend.service << 'EOF'
[Unit]
Description=CrickCoach Backend Service
After=network.target
Wants=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/CricketCoachinAI
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/root/CricketCoachinAI/myenv/bin
Environment=PYTHONUNBUFFERED=1
ExecStart=/root/CricketCoachinAI/myenv/bin/python3 -u /root/CricketCoachinAI/backend_script.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=crickcoach-backend

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/root/CricketCoachinAI/uploads
ReadWritePaths=/root/CricketCoachinAI/logging
ReadWritePaths=/var/log

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Service file created"

# Verify paths exist
echo ""
echo "🔍 Verifying paths..."
if [ ! -d "/root/CricketCoachinAI" ]; then
    echo "⚠️  Warning: /root/CricketCoachinAI directory not found"
fi

if [ ! -f "/root/CricketCoachinAI/backend_script.py" ]; then
    echo "⚠️  Warning: backend_script.py not found"
fi

if [ ! -f "/root/CricketCoachinAI/myenv/bin/python3" ]; then
    echo "⚠️  Warning: Python virtual environment not found at /root/CricketCoachinAI/myenv/bin/python3"
    echo "   Make sure you've created the virtual environment:"
    echo "   cd /root/CricketCoachinAI && python3 -m venv myenv"
fi

# Reload systemd
echo ""
echo "🔄 Reloading systemd daemon..."
systemctl daemon-reload

# Stop any existing manual process
echo ""
echo "🛑 Stopping any existing backend processes..."
pkill -f "backend_script.py" 2>/dev/null || true
sleep 2

# Enable service
echo ""
echo "✅ Enabling service to start on boot..."
systemctl enable crickcoach-backend.service

# Start service
echo ""
echo "🚀 Starting service..."
systemctl start crickcoach-backend.service

# Wait a moment for service to start
sleep 3

# Check status
echo ""
echo "📊 Service Status:"
echo "=========================================="
systemctl status crickcoach-backend.service --no-pager -l

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "✅ Service is now running via systemd"
echo ""
echo "Useful commands:"
echo "  📊 Check status:    systemctl status crickcoach-backend"
echo "  📜 View logs:       journalctl -u crickcoach-backend -f"
echo "  🔄 Restart:         systemctl restart crickcoach-backend"
echo "  🛑 Stop:            systemctl stop crickcoach-backend"
echo "  ▶️  Start:           systemctl start crickcoach-backend"
echo ""
echo "Test the API:"
echo "  curl http://localhost:3000/api/health"
echo ""

