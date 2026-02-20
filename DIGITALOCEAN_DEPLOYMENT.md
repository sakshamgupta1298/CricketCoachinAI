# CrickCoach Backend Deployment to Digital Ocean

This guide will help you deploy your CrickCoach backend to a Digital Ocean droplet at IP `206.189.141.194`.

## Prerequisites

- SSH access to your Digital Ocean droplet
- Your droplet IP: `206.189.141.194`
- Python 3.8+ installed on the droplet
- Basic knowledge of Linux commands

## Step 1: Initial Droplet Setup

First, connect to your droplet and run the initial setup script:

```bash
# Connect to your droplet
ssh root@206.189.141.194

# Download and run the setup script
wget https://raw.githubusercontent.com/your-repo/crickcoach/main/digitalocean_setup.sh
chmod +x digitalocean_setup.sh
./digitalocean_setup.sh
```

This script will:
- Update the system
- Install Python and dependencies
- Install ML library dependencies (OpenCV, TensorFlow, etc.)
- Configure firewall
- Install and configure nginx
- Set up monitoring and backup scripts

## Step 2: Deploy the Backend

From your local machine, run the deployment script:

```bash
# Make the script executable
chmod +x deploy_to_digitalocean.sh

# Run the deployment
./deploy_to_digitalocean.sh
```

This script will:
- Create a deployment package
- Upload it to the droplet
- Install Python dependencies
- Create a systemd service
- Start the backend service

## Step 3: Verify Deployment

Test that your backend is running:

```bash
# Test health endpoint
curl http://139.59.1.59:3000/api/health

# Check service status
ssh root@206.189.141.194 'sudo systemctl status crickcoach-backend'
```

## Step 4: Update Mobile App Configuration

Your mobile app is already configured to use the new Digital Ocean URL. The configuration files have been updated to use:
- `http://139.59.1.59:3000`

## Configuration Files Updated

The following files have been updated to use the Digital Ocean droplet:

1. **config.js** - Main app configuration
2. **debug_app_config.js** - Debug configuration
3. **test_connectivity.js** - Connectivity testing
4. **test_upload_*.js** - Upload testing scripts
5. **start-with-digitalocean.bat** - New startup script

## Service Management

### Check Service Status
```bash
ssh root@206.189.141.194 'sudo systemctl status crickcoach-backend'
```

### View Logs
```bash
ssh root@206.189.141.194 'sudo journalctl -u crickcoach-backend -f'
```

### Restart Service
```bash
ssh root@206.189.141.194 'sudo systemctl restart crickcoach-backend'
```

### Stop Service
```bash
ssh root@206.189.141.194 'sudo systemctl stop crickcoach-backend'
```

## Monitoring and Maintenance

### Automatic Monitoring
The setup includes automatic monitoring that:
- Checks service status every 5 minutes
- Restarts the service if it's down
- Monitors disk and memory usage
- Logs issues to `/var/log/crickcoach-backend/monitor.log`

### Automatic Backups
Daily backups are created at 2 AM and stored in `/opt/crickcoach-backend/backups/`

### Manual Backup
```bash
ssh root@206.189.141.194 '/opt/crickcoach-backend/backup.sh'
```

## Nginx Configuration

Nginx is configured as a reverse proxy:
- **Direct access**: `http://139.59.1.59:3000`
- **Via nginx**: `http://206.189.141.194` (port 80)

Nginx configuration includes:
- Increased timeouts for video uploads (600s)
- Increased max upload size (100MB)
- Proper headers for proxy

## Troubleshooting

### Service Won't Start
```bash
# Check logs
ssh root@206.189.141.194 'sudo journalctl -u crickcoach-backend -n 50'

# Check Python dependencies
ssh root@206.189.141.194 'cd /opt/crickcoach-backend && python3 -c "import torch; import tensorflow; import cv2; print(\"All imports successful\")"'
```

### Port Issues
```bash
# Check if port 3000 is open
ssh root@206.189.141.194 'netstat -tlnp | grep 3000'

# Check firewall
ssh root@206.189.141.194 'ufw status'
```

### Memory Issues
```bash
# Check memory usage
ssh root@206.189.141.194 'free -h'

# Check disk space
ssh root@206.189.141.194 'df -h'
```

## Security Considerations

1. **Firewall**: Only SSH (22) and HTTP (80, 3000) ports are open
2. **Service User**: The service runs as root (consider creating a dedicated user)
3. **SSL**: Consider adding SSL certificate for HTTPS
4. **Backups**: Daily backups are automatically created

## Performance Optimization

1. **Memory**: The ML models can be memory-intensive. Monitor usage.
2. **Storage**: Video uploads can consume significant space. Monitor disk usage.
3. **CPU**: Video processing is CPU-intensive. Consider scaling if needed.

## Scaling Considerations

If you need to scale:
1. **Vertical scaling**: Upgrade droplet resources
2. **Horizontal scaling**: Add more droplets behind a load balancer
3. **CDN**: Use a CDN for static assets
4. **Database**: Consider moving to a managed database service

## Support

If you encounter issues:
1. Check the logs: `ssh root@206.189.141.194 'sudo journalctl -u crickcoach-backend -f'`
2. Check monitoring logs: `ssh root@206.189.141.194 'tail -f /var/log/crickcoach-backend/monitor.log'`
3. Verify connectivity: `curl http://139.59.1.59:3000/api/health`

## Next Steps

1. Test the mobile app with the new backend
2. Monitor performance and logs
3. Set up SSL certificate for HTTPS
4. Consider setting up monitoring alerts
5. Plan for regular maintenance and updates
