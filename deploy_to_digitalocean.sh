#!/bin/bash

# CrickCoach Backend Deployment Script for Digital Ocean Droplet
# IP: 206.189.141.194

echo "🚀 Deploying CrickCoach Backend to Digital Ocean Droplet..."
echo "📍 Target: 206.189.141.194"
echo ""

# Configuration
DROPLET_IP="206.189.141.194"
DROPLET_USER="root"
APP_NAME="crickcoach-backend"
APP_DIR="/opt/crickcoach-backend"
SERVICE_NAME="crickcoach-backend"

echo "📋 Deployment Configuration:"
echo "   Droplet IP: $DROPLET_IP"
echo "   App Name: $APP_NAME"
echo "   App Directory: $APP_DIR"
echo "   Service Name: $SERVICE_NAME"
echo ""

# Step 1: Create deployment package
echo "📦 Step 1: Creating deployment package..."
tar -czf crickcoach-backend.tar.gz \
    backend_script.py \
    requirements.txt \
    --exclude=venv \
    --exclude=__pycache__ \
    --exclude=*.pyc \
    --exclude=uploads \
    --exclude=cricket_coach.db

echo "✅ Deployment package created: crickcoach-backend.tar.gz"
echo ""

# Step 2: Upload to droplet
echo "📤 Step 2: Uploading to Digital Ocean droplet..."
scp crickcoach-backend.tar.gz $DROPLET_USER@$DROPLET_IP:/tmp/

if [ $? -eq 0 ]; then
    echo "✅ Package uploaded successfully"
else
    echo "❌ Failed to upload package"
    exit 1
fi
echo ""

# Step 3: Deploy on droplet
echo "🔧 Step 3: Deploying on droplet..."
ssh $DROPLET_USER@$DROPLET_IP << 'ENDSSH'
    echo "🔄 Starting deployment on droplet..."
    
    # Create app directory
    sudo mkdir -p /opt/crickcoach-backend
    sudo chown root:root /opt/crickcoach-backend
    
    # Extract package
    cd /tmp
    sudo tar -xzf crickcoach-backend.tar.gz -C /opt/crickcoach-backend/
    
    # Create uploads directory
    sudo mkdir -p /opt/crickcoach-backend/uploads
    sudo chmod 755 /opt/crickcoach-backend/uploads
    
    # Install Python dependencies
    echo "📦 Installing Python dependencies..."
    cd /opt/crickcoach-backend
    sudo python3 -m pip install --upgrade pip
    sudo python3 -m pip install -r requirements.txt
    
    # Create systemd service file
    echo "🔧 Creating systemd service..."
    sudo tee /etc/systemd/system/crickcoach-backend.service > /dev/null << 'EOF'
[Unit]
Description=CrickCoach Backend API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/crickcoach-backend
Environment=PATH=/usr/bin:/usr/local/bin
Environment=FLASK_PORT=3000
ExecStart=/usr/bin/python3 backend_script.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    sudo systemctl daemon-reload
    sudo systemctl enable crickcoach-backend
    
    # Start the service
    echo "🚀 Starting CrickCoach backend service..."
    sudo systemctl start crickcoach-backend
    
    # Check service status
    echo "📊 Service status:"
    sudo systemctl status crickcoach-backend --no-pager
    
    # Clean up
    rm -f /tmp/crickcoach-backend.tar.gz
    
    echo "✅ Deployment completed on droplet!"
ENDSSH

if [ $? -eq 0 ]; then
    echo "✅ Deployment completed successfully!"
else
    echo "❌ Deployment failed"
    exit 1
fi
echo ""

# Step 4: Test the deployment
echo "🧪 Step 4: Testing deployment..."
echo "Testing health endpoint..."
curl -s https://$DROPLET_IP:3000/api/health

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Health check passed!"
else
    echo ""
    echo "❌ Health check failed"
    echo "Check the service logs: ssh $DROPLET_USER@$DROPLET_IP 'sudo journalctl -u crickcoach-backend -f'"
fi
echo ""

# Step 5: Show useful commands
echo "📋 Useful Commands:"
echo "   Check service status: ssh $DROPLET_USER@$DROPLET_IP 'sudo systemctl status crickcoach-backend'"
echo "   View logs: ssh $DROPLET_USER@$DROPLET_IP 'sudo journalctl -u crickcoach-backend -f'"
echo "   Restart service: ssh $DROPLET_USER@$DROPLET_IP 'sudo systemctl restart crickcoach-backend'"
echo "   Stop service: ssh $DROPLET_USER@$DROPLET_IP 'sudo systemctl stop crickcoach-backend'"
echo ""

echo "🎉 Deployment completed! Your backend is now running at:"
echo "   https://$DROPLET_IP:3000"
echo ""
echo "📱 Update your mobile app configuration to use this URL."
