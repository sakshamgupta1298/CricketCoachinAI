#!/bin/bash

# Setup script for new server (139.59.1.59)
# This script sets up the CrickCoach backend on the new server

set -e

# Configuration
SERVER_IP="139.59.1.59"
PROJECT_DIR="/root/CricketCoachinAI"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo "🚀 Setting up CrickCoach Backend on New Server"
echo "=============================================="
echo "Server IP: $SERVER_IP"
echo ""

# Update system packages
print_info "Updating system packages..."
apt update && apt upgrade -y
print_status "System packages updated"

# Install required packages
print_info "Installing required packages..."
apt install -y python3 python3-pip python3-venv curl wget git ufw nginx
print_status "Required packages installed"

# Create project directory
print_info "Creating project directory..."
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"
print_status "Project directory created"

# Create virtual environment
print_info "Creating virtual environment..."
if [ ! -d "myenv" ]; then
    python3 -m venv myenv
    print_status "Virtual environment created"
else
    print_warning "Virtual environment already exists"
fi

# Activate virtual environment and install requirements
print_info "Installing Python requirements..."
source myenv/bin/activate
if [ -f "requirements.txt" ]; then
    pip install --upgrade pip
    pip install -r requirements.txt
    print_status "Python requirements installed"
else
    print_warning "requirements.txt not found, installing basic packages..."
    pip install flask flask-cors requests python-dotenv
fi

# Copy nginx configuration
print_info "Setting up nginx configuration..."
if [ -f "/root/nginx_config.conf" ]; then
    cp /root/nginx_config.conf /etc/nginx/sites-available/crickcoach
    ln -sf /etc/nginx/sites-available/crickcoach /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    print_status "Nginx configuration copied"
else
    print_warning "nginx_config.conf not found, skipping nginx setup"
fi

# Test nginx configuration
if [ -f "/etc/nginx/sites-available/crickcoach" ]; then
    print_info "Testing nginx configuration..."
    nginx -t
    if [ $? -eq 0 ]; then
        print_status "Nginx configuration is valid"
    else
        print_error "Nginx configuration test failed"
    fi
fi

# Copy systemd service file
print_info "Setting up systemd service..."
if [ -f "/root/crickcoach-backend-new-server.service" ]; then
    cp /root/crickcoach-backend-new-server.service /etc/systemd/system/crickcoach-backend.service
elif [ -f "/root/crickcoach-backend.service" ]; then
    cp /root/crickcoach-backend.service /etc/systemd/system/crickcoach-backend.service
else
    print_error "Systemd service file not found!"
    exit 1
fi

systemctl daemon-reload
print_status "Systemd service configured"

# Create uploads directory
print_info "Creating uploads directory..."
mkdir -p "$PROJECT_DIR/uploads"
chmod 755 "$PROJECT_DIR/uploads"
print_status "Uploads directory created"

# Create log directory
print_info "Creating log directory..."
mkdir -p /var/log/crickcoach
chmod 755 /var/log/crickcoach
print_status "Log directory created"

# Configure firewall
print_info "Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 3000/tcp
ufw reload
print_status "Firewall configured"

# Start and enable services
print_info "Starting services..."
if [ -f "/etc/nginx/sites-available/crickcoach" ]; then
    systemctl enable nginx
    systemctl start nginx
    print_status "Nginx started and enabled"
fi

systemctl enable crickcoach-backend
systemctl start crickcoach-backend
print_status "Backend service started and enabled"

# Wait a moment for services to start
sleep 5

# Check service status
print_info "Checking service status..."
if systemctl is-active --quiet crickcoach-backend; then
    print_status "Backend service is running"
else
    print_error "Backend service failed to start"
    print_info "Check logs with: journalctl -u crickcoach-backend -f"
fi

if [ -f "/etc/nginx/sites-available/crickcoach" ]; then
    if systemctl is-active --quiet nginx; then
        print_status "Nginx is running"
    else
        print_error "Nginx failed to start"
    fi
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
print_info "Server IP: $SERVER_IP"
echo "  - Backend URL: http://$SERVER_IP:3000"
if [ -f "/etc/nginx/sites-available/crickcoach" ]; then
    echo "  - Nginx Proxy: http://$SERVER_IP"
    echo "  - Health Check: http://$SERVER_IP/health"
fi
echo ""
print_info "Service Management:"
echo "  - Backend Status: systemctl status crickcoach-backend"
echo "  - Backend Logs: journalctl -u crickcoach-backend -f"
echo "  - Restart Backend: systemctl restart crickcoach-backend"
if [ -f "/etc/nginx/sites-available/crickcoach" ]; then
    echo "  - Nginx Status: systemctl status nginx"
    echo "  - Restart Nginx: systemctl restart nginx"
fi
echo ""
print_status "Setup completed successfully! 🚀"

