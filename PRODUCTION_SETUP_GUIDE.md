# 🚀 CrickCoach Production Server Setup Guide

## Overview
This guide helps you set up your CrickCoach backend to run 24/7 on your Digital Ocean server using nginx as a reverse proxy and systemd for service management.

## 🎯 What This Setup Provides

### ✅ **24/7 Backend Operation**
- Backend automatically starts on server boot
- Auto-restart if backend crashes
- Systemd service management

### ✅ **Nginx Reverse Proxy**
- Professional web server setup
- Handles large file uploads (up to 100MB)
- CORS headers for mobile app
- Security headers
- Load balancing ready

### ✅ **Production Ready**
- Firewall configuration
- Logging and monitoring
- Resource limits
- Security hardening

## 📋 Prerequisites

1. **Digital Ocean Droplet** running Ubuntu 20.04+
2. **SSH access** to your server
3. **Backend files** already on the server
4. **Root access** to the server

## 🚀 Quick Setup

### Step 1: Deploy to Server
```bash
# Run the deployment script
./deploy_to_server.sh
```

This script will:
- Upload all configuration files
- Install nginx and dependencies
- Configure firewall
- Set up systemd service
- Start all services

### Step 2: Verify Setup
```bash
# Test backend health
curl http://139.59.1.59/health

# Test direct backend
curl http://139.59.1.59:3000/api/health
```

## 🔧 Manual Setup (Alternative)

If you prefer to set up manually:

### 1. Upload Files to Server
```bash
scp nginx_config.conf root@139.59.1.59:/root/
scp crickcoach-backend.service root@139.59.1.59:/root/
scp setup_production_server.sh root@139.59.1.59:/root/
```

### 2. Run Setup on Server
```bash
ssh root@139.59.1.59
chmod +x /root/setup_production_server.sh
/root/setup_production_server.sh
```

## 📱 Update Mobile App Configuration

After setup, update your mobile app to use the new URL:

### Update config.js
```javascript
const config = {
  development: {
    API_BASE_URL: 'http://139.59.1.59',  // Remove :3000
    API_TIMEOUT: 600000,
  },
  production: {
    API_BASE_URL: 'http://139.59.1.59',  // Remove :3000
    API_TIMEOUT: 600000,
  },
  test: {
    API_BASE_URL: 'http://139.59.1.59',  // Remove :3000
    API_TIMEOUT: 600000,
  }
};
```

## 🔍 Service Management

### Backend Service
```bash
# Check status
systemctl status crickcoach-backend

# View logs
journalctl -u crickcoach-backend -f

# Restart service
systemctl restart crickcoach-backend

# Stop service
systemctl stop crickcoach-backend

# Start service
systemctl start crickcoach-backend
```

### Nginx Service
```bash
# Check status
systemctl status nginx

# View logs
tail -f /var/log/nginx/crickcoach_error.log

# Test configuration
nginx -t

# Reload configuration
systemctl reload nginx
```

## 📊 Monitoring & Logs

### Backend Logs
```bash
# Real-time logs
journalctl -u crickcoach-backend -f

# Last 100 lines
journalctl -u crickcoach-backend -n 100

# Logs from today
journalctl -u crickcoach-backend --since today
```

### Nginx Logs
```bash
# Access logs
tail -f /var/log/nginx/crickcoach_access.log

# Error logs
tail -f /var/log/nginx/crickcoach_error.log
```

### System Resources
```bash
# Check system resources
htop

# Check disk usage
df -h

# Check memory usage
free -h
```

## 🔧 Troubleshooting

### Backend Not Starting
```bash
# Check service status
systemctl status crickcoach-backend

# Check logs for errors
journalctl -u crickcoach-backend -n 50

# Check if port is in use
netstat -tlnp | grep 3000
```

### Nginx Issues
```bash
# Test nginx configuration
nginx -t

# Check nginx status
systemctl status nginx

# Check nginx logs
tail -f /var/log/nginx/error.log
```

### Connection Issues
```bash
# Test local connectivity
curl http://localhost:3000/api/health

# Test nginx proxy
curl http://localhost/health

# Check firewall
ufw status
```

## 🔒 Security Considerations

### Firewall
- Only ports 22 (SSH), 80 (HTTP), and 443 (HTTPS) are open
- Port 3000 is accessible but should be used only for direct access if needed

### SSL/HTTPS (Recommended for Production)
```bash
# Install Certbot
apt install certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d your-domain.com

# Auto-renewal
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📈 Performance Optimization

### Nginx Optimization
- Client max body size: 100MB (for video uploads)
- Timeout settings: 300s (for video processing)
- CORS headers configured for mobile app

### Backend Optimization
- Resource limits set in systemd service
- Auto-restart on failure
- Logging to systemd journal

## 🆘 Support Commands

### Quick Health Check
```bash
#!/bin/bash
echo "🔍 CrickCoach Health Check"
echo "========================="
echo "Backend Status: $(systemctl is-active crickcoach-backend)"
echo "Nginx Status: $(systemctl is-active nginx)"
echo "Backend Health: $(curl -s http://localhost:3000/api/health | jq -r '.status' 2>/dev/null || echo 'Failed')"
echo "Nginx Proxy: $(curl -s http://localhost/health | jq -r '.status' 2>/dev/null || echo 'Failed')"
```

### Backup Script
```bash
#!/bin/bash
# Backup backend files
tar -czf crickcoach-backup-$(date +%Y%m%d).tar.gz /root/CricketCoachinAI/
```

## 🎉 Success Indicators

After successful setup, you should see:
- ✅ Backend service running: `systemctl status crickcoach-backend`
- ✅ Nginx service running: `systemctl status nginx`
- ✅ Health check passing: `curl http://139.59.1.59/health`
- ✅ Mobile app can connect to backend
- ✅ Video uploads working
- ✅ Authentication working

## 📞 Need Help?

If you encounter issues:
1. Check the logs: `journalctl -u crickcoach-backend -f`
2. Verify nginx: `systemctl status nginx`
3. Test connectivity: `curl http://139.59.1.59/health`
4. Check firewall: `ufw status`

Your CrickCoach backend is now production-ready! 🚀
