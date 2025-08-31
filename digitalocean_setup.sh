#!/bin/bash

# Digital Ocean Droplet Initial Setup Script
# Run this on the droplet (206.189.141.194) to prepare it for the CrickCoach backend

echo "🔧 Setting up Digital Ocean Droplet for CrickCoach Backend..."
echo "📍 Droplet IP: 206.189.141.194"
echo ""

# Update system
echo "📦 Step 1: Updating system packages..."
apt update && apt upgrade -y
echo "✅ System updated"
echo ""

# Install Python and required packages
echo "🐍 Step 2: Installing Python and dependencies..."
apt install -y python3 python3-pip python3-venv
apt install -y git curl wget unzip
echo "✅ Python and dependencies installed"
echo ""

# Install system dependencies for ML libraries
echo "🔬 Step 3: Installing ML library dependencies..."
apt install -y build-essential cmake pkg-config
apt install -y libjpeg-dev libpng-dev libtiff-dev
apt install -y libavcodec-dev libavformat-dev libswscale-dev libv4l-dev
apt install -y libxvidcore-dev libx264-dev
apt install -y libgtk-3-dev
apt install -y libatlas-base-dev gfortran
apt install -y libhdf5-dev libhdf5-serial-dev libhdf5-103
apt install -y libqtgui4 libqtwebkit4 libqt4-test python3-pyqt5
echo "✅ ML dependencies installed"
echo ""

# Create application directory
echo "📁 Step 4: Creating application directory..."
mkdir -p /opt/crickcoach-backend
mkdir -p /opt/crickcoach-backend/uploads
chmod 755 /opt/crickcoach-backend/uploads
echo "✅ Application directory created"
echo ""

# Configure firewall
echo "🔥 Step 5: Configuring firewall..."
ufw allow ssh
ufw allow 3000/tcp
ufw --force enable
echo "✅ Firewall configured (SSH and port 3000 allowed)"
echo ""

# Install and configure nginx (optional, for reverse proxy)
echo "🌐 Step 6: Installing nginx (optional)..."
apt install -y nginx
echo "✅ Nginx installed"
echo ""

# Create nginx configuration for reverse proxy
echo "🔧 Step 7: Configuring nginx reverse proxy..."
cat > /etc/nginx/sites-available/crickcoach-backend << 'EOF'
server {
    listen 80;
    server_name 206.189.141.194;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeouts for video uploads
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
        
        # Increase max upload size
        client_max_body_size 100M;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/crickcoach-backend /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx
echo "✅ Nginx configured for reverse proxy"
echo ""

# Install PM2 for process management (alternative to systemd)
echo "⚡ Step 8: Installing PM2 (optional process manager)..."
npm install -g pm2
echo "✅ PM2 installed"
echo ""

# Create log directory
echo "📝 Step 9: Creating log directory..."
mkdir -p /var/log/crickcoach-backend
chmod 755 /var/log/crickcoach-backend
echo "✅ Log directory created"
echo ""

# Set up log rotation
echo "🔄 Step 10: Setting up log rotation..."
cat > /etc/logrotate.d/crickcoach-backend << 'EOF'
/var/log/crickcoach-backend/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF
echo "✅ Log rotation configured"
echo ""

# Create monitoring script
echo "📊 Step 11: Creating monitoring script..."
cat > /opt/crickcoach-backend/monitor.sh << 'EOF'
#!/bin/bash

# CrickCoach Backend Monitoring Script

LOG_FILE="/var/log/crickcoach-backend/monitor.log"
SERVICE_NAME="crickcoach-backend"

echo "$(date): Starting monitoring check..." >> $LOG_FILE

# Check if service is running
if systemctl is-active --quiet $SERVICE_NAME; then
    echo "$(date): Service is running" >> $LOG_FILE
else
    echo "$(date): Service is not running, attempting restart..." >> $LOG_FILE
    systemctl restart $SERVICE_NAME
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "$(date): WARNING: Disk usage is ${DISK_USAGE}%" >> $LOG_FILE
fi

# Check memory usage
MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEM_USAGE -gt 80 ]; then
    echo "$(date): WARNING: Memory usage is ${MEM_USAGE}%" >> $LOG_FILE
fi

echo "$(date): Monitoring check completed" >> $LOG_FILE
EOF

chmod +x /opt/crickcoach-backend/monitor.sh
echo "✅ Monitoring script created"
echo ""

# Set up cron job for monitoring
echo "⏰ Step 12: Setting up monitoring cron job..."
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/crickcoach-backend/monitor.sh") | crontab -
echo "✅ Monitoring cron job set up (runs every 5 minutes)"
echo ""

# Create backup script
echo "💾 Step 13: Creating backup script..."
cat > /opt/crickcoach-backend/backup.sh << 'EOF'
#!/bin/bash

# CrickCoach Backend Backup Script

BACKUP_DIR="/opt/crickcoach-backend/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="crickcoach-backend_$DATE.tar.gz"

mkdir -p $BACKUP_DIR

# Create backup
tar -czf $BACKUP_DIR/$BACKUP_FILE \
    --exclude=venv \
    --exclude=__pycache__ \
    --exclude=*.pyc \
    /opt/crickcoach-backend

# Keep only last 7 backups
find $BACKUP_DIR -name "crickcoach-backend_*.tar.gz" -mtime +7 -delete

echo "Backup created: $BACKUP_FILE"
EOF

chmod +x /opt/crickcoach-backend/backup.sh
echo "✅ Backup script created"
echo ""

# Set up daily backup cron job
echo "⏰ Step 14: Setting up daily backup..."
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/crickcoach-backend/backup.sh") | crontab -
echo "✅ Daily backup scheduled (2 AM daily)"
echo ""

# Final system check
echo "🔍 Step 15: Final system check..."
echo "Python version: $(python3 --version)"
echo "Pip version: $(pip3 --version)"
echo "Nginx status: $(systemctl is-active nginx)"
echo "Available disk space: $(df -h / | awk 'NR==2 {print $4}')"
echo "Available memory: $(free -h | awk 'NR==2 {print $7}')"
echo ""

echo "🎉 Digital Ocean Droplet setup completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Upload your backend code using the deploy script"
echo "   2. Install Python dependencies"
echo "   3. Start the backend service"
echo ""
echo "🔧 Useful commands:"
echo "   Check service status: systemctl status crickcoach-backend"
echo "   View logs: journalctl -u crickcoach-backend -f"
echo "   Restart service: systemctl restart crickcoach-backend"
echo "   Check nginx: systemctl status nginx"
echo "   View nginx logs: tail -f /var/log/nginx/access.log"
echo ""
echo "🌐 Your backend will be accessible at:"
echo "   http://206.189.141.194:3000 (direct)"
echo "   http://206.189.141.194 (via nginx)"
echo ""
