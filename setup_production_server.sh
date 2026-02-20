#!/bin/bash

# CrickCoach Production Server Setup Script
# This script sets up nginx, systemd service, and configures the backend for 24/7 operation

set -e  # Exit on any error

echo "🚀 Setting up CrickCoach Production Server..."
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

# Update system packages
print_info "Updating system packages..."
apt update && apt upgrade -y
print_status "System packages updated"

# Install nginx
print_info "Installing nginx..."
apt install nginx -y
print_status "Nginx installed"

# Install Python dependencies
print_info "Installing Python dependencies..."
apt install python3 python3-pip python3-venv -y
print_status "Python dependencies installed"

# Install additional tools
print_info "Installing additional tools..."
apt install curl wget git htop ufw -y
print_status "Additional tools installed"

# Configure firewall
print_info "Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp  # For direct backend access if needed
print_status "Firewall configured"

# Create project directory if it doesn't exist
PROJECT_DIR="/root/CricketCoachinAI"
if [ ! -d "$PROJECT_DIR" ]; then
    print_info "Creating project directory..."
    mkdir -p "$PROJECT_DIR"
    print_status "Project directory created"
fi

# Setup Python virtual environment
print_info "Setting up Python virtual environment..."
cd "$PROJECT_DIR"
if [ ! -d "myenv" ]; then
    python3 -m venv myenv
    print_status "Virtual environment created"
fi

# Activate virtual environment and install requirements
print_info "Installing Python requirements..."
source myenv/bin/activate
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    print_status "Python requirements installed"
else
    print_warning "requirements.txt not found, installing basic packages..."
    pip install flask flask-cors requests python-dotenv
fi

# Copy nginx configuration
print_info "Setting up nginx configuration..."
cp /root/nginx_config.conf /etc/nginx/sites-available/crickcoach
ln -sf /etc/nginx/sites-available/crickcoach /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default  # Remove default site
print_status "Nginx configuration copied"

# Test nginx configuration
print_info "Testing nginx configuration..."
nginx -t
if [ $? -eq 0 ]; then
    print_status "Nginx configuration is valid"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Copy systemd service file
print_info "Setting up systemd service..."
cp /root/crickcoach-backend.service /etc/systemd/system/
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

# Start and enable services
print_info "Starting services..."
systemctl enable nginx
systemctl start nginx
systemctl enable crickcoach-backend
systemctl start crickcoach-backend
print_status "Services started and enabled"

# Wait a moment for services to start
sleep 5

# Check service status
print_info "Checking service status..."
if systemctl is-active --quiet nginx; then
    print_status "Nginx is running"
else
    print_error "Nginx failed to start"
    systemctl status nginx
fi

if systemctl is-active --quiet crickcoach-backend; then
    print_status "CrickCoach backend is running"
else
    print_error "CrickCoach backend failed to start"
    systemctl status crickcoach-backend
fi

# Test backend connectivity
print_info "Testing backend connectivity..."
sleep 10  # Give backend time to fully start

# Test health endpoint
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    print_status "Backend health check passed"
else
    print_warning "Backend health check failed, checking logs..."
    journalctl -u crickcoach-backend --no-pager -n 20
fi

# Test nginx proxy
if curl -f http://localhost/health > /dev/null 2>&1; then
    print_status "Nginx proxy is working"
else
    print_warning "Nginx proxy test failed"
fi

# Display final status
echo ""
echo "🎉 Production Server Setup Complete!"
echo "===================================="
echo ""
print_info "Server Information:"
echo "  - Backend URL: http://139.59.1.59:3000"
echo "  - Nginx Proxy: http://139.59.1.59"
echo "  - Health Check: http://139.59.1.59/health"
echo ""
print_info "Service Management:"
echo "  - Backend Status: systemctl status crickcoach-backend"
echo "  - Backend Logs: journalctl -u crickcoach-backend -f"
echo "  - Nginx Status: systemctl status nginx"
echo "  - Nginx Logs: tail -f /var/log/nginx/crickcoach_error.log"
echo ""
print_info "Useful Commands:"
echo "  - Restart Backend: systemctl restart crickcoach-backend"
echo "  - Restart Nginx: systemctl restart nginx"
echo "  - View Backend Logs: journalctl -u crickcoach-backend -f"
echo "  - Test Backend: curl http://139.59.1.59/health"
echo ""
print_warning "Next Steps:"
echo "  1. Update your mobile app config to use: http://139.59.1.59"
echo "  2. Test the mobile app connection"
echo "  3. Monitor logs for any issues"
echo "  4. Consider setting up SSL/HTTPS for production"
echo ""
print_status "Setup completed successfully! 🚀"
