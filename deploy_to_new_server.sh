#!/bin/bash

# Deploy CrickCoach Production Setup to New Server (139.59.1.59)
# This script uploads the configuration files and runs the setup

set -e

# Configuration
SERVER_IP="139.59.1.59"
SERVER_USER="root"
PROJECT_NAME="CrickCoach"

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

echo "🚀 Deploying CrickCoach Production Setup to New Server"
echo "======================================================"
echo "Server: $SERVER_USER@$SERVER_IP"
echo ""

# Check if required files exist
print_info "Checking required files..."
required_files=("nginx_config.conf" "crickcoach-backend-new-server.service" "setup_new_server.sh")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_warning "File not found: $file, trying alternative..."
        # Try alternative names
        if [ "$file" == "crickcoach-backend-new-server.service" ] && [ -f "crickcoach-backend.service" ]; then
            print_info "Using crickcoach-backend.service instead"
            continue
        fi
        if [ "$file" == "setup_new_server.sh" ] && [ -f "setup_production_server.sh" ]; then
            print_info "Using setup_production_server.sh instead"
            continue
        fi
        print_error "Required file not found: $file"
        exit 1
    fi
done
print_status "All required files found"

# Test SSH connection
print_info "Testing SSH connection to server..."
if ssh -o ConnectTimeout=10 -o BatchMode=yes $SERVER_USER@$SERVER_IP exit 2>/dev/null; then
    print_status "SSH connection successful"
else
    print_error "Cannot connect to server. Please check:"
    echo "  1. Server IP is correct: $SERVER_IP"
    echo "  2. SSH key is set up"
    echo "  3. Server is running and accessible"
    exit 1
fi

# Upload configuration files
print_info "Uploading configuration files to server..."
scp nginx_config.conf $SERVER_USER@$SERVER_IP:/root/

# Upload systemd service file (prefer new one, fallback to old)
if [ -f "crickcoach-backend-new-server.service" ]; then
    scp crickcoach-backend-new-server.service $SERVER_USER@$SERVER_IP:/root/crickcoach-backend.service
else
    scp crickcoach-backend.service $SERVER_USER@$SERVER_IP:/root/
fi

# Upload setup script (prefer new one, fallback to old)
if [ -f "setup_new_server.sh" ]; then
    scp setup_new_server.sh $SERVER_USER@$SERVER_IP:/root/setup_production_server.sh
else
    scp setup_production_server.sh $SERVER_USER@$SERVER_IP:/root/
fi

print_status "Configuration files uploaded"

# Make setup script executable
print_info "Making setup script executable..."
ssh $SERVER_USER@$SERVER_IP "chmod +x /root/setup_production_server.sh"
print_status "Setup script is now executable"

# Check if backend files exist on server
print_info "Checking if backend files exist on server..."
if ssh $SERVER_USER@$SERVER_IP "[ -f /root/CricketCoachinAI/backend_script.py ]"; then
    print_status "Backend files found on server"
else
    print_warning "Backend files not found on server"
    print_info "You may need to upload your backend files first"
    echo ""
    print_info "To upload backend files, run:"
    echo "  scp -r backend_script.py requirements.txt $SERVER_USER@$SERVER_IP:/root/CricketCoachinAI/"
    echo ""
    read -p "Do you want to continue with setup anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deployment cancelled. Please upload backend files first."
        exit 0
    fi
fi

# Run the setup script on the server
print_info "Running production setup on server..."
echo "This may take a few minutes..."
echo ""

ssh $SERVER_USER@$SERVER_IP "/root/setup_production_server.sh"

# Test the setup
print_info "Testing the production setup..."
sleep 10  # Give services time to start

# Test backend health
if curl -f http://$SERVER_IP/health > /dev/null 2>&1; then
    print_status "Backend is accessible through nginx proxy"
else
    print_warning "Backend health check failed through nginx"
fi

# Test direct backend access
if curl -f http://$SERVER_IP:3000/api/health > /dev/null 2>&1; then
    print_status "Backend is accessible directly"
else
    print_warning "Direct backend access failed"
fi

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
print_info "Your CrickCoach backend is now running 24/7 with nginx!"
echo ""
print_info "Access URLs:"
echo "  - Main Backend: http://$SERVER_IP"
echo "  - Health Check: http://$SERVER_IP/health"
echo "  - Direct Backend: http://$SERVER_IP:3000"
echo ""
print_info "Service Management:"
echo "  - Backend Status: ssh $SERVER_USER@$SERVER_IP 'systemctl status crickcoach-backend'"
echo "  - Backend Logs: ssh $SERVER_USER@$SERVER_IP 'journalctl -u crickcoach-backend -f'"
echo "  - Restart Backend: ssh $SERVER_USER@$SERVER_IP 'systemctl restart crickcoach-backend'"
echo ""
print_warning "Next Steps:"
echo "  1. Update your mobile app config to use: http://$SERVER_IP"
echo "  2. Test the mobile app connection"
echo "  3. Monitor the logs for any issues"
echo ""
print_status "Deployment completed successfully! 🚀"

