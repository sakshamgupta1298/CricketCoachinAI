# New Server Setup Guide

## Server Information
- **New Server IP**: `139.59.1.59`
- **Old Server IP**: `165.232.184.91` (replaced throughout codebase)

## Files Created/Updated

### Systemd Service Files
1. **`crickcoach-backend-new-server.service`** - New systemd service file for the new server
2. **`crickcoach-backend.service`** - Updated existing service file (can be used on new server)

### Deployment Scripts
1. **`deploy_to_new_server.sh`** - Deployment script specifically for the new server
2. **`setup_new_server.sh`** - Setup script to run on the new server
3. **`deploy_to_server.sh`** - Updated with new IP address
4. **`deploy_to_digitalocean.sh`** - Updated with new IP address

### Configuration Files
- All configuration files have been updated with the new IP address:
  - Test scripts
  - Network security configs (Android/iOS)
  - Documentation files
  - Deployment scripts

## Quick Deployment Steps

### Option 1: Using the New Deployment Script (Recommended)
```bash
./deploy_to_new_server.sh
```

This script will:
1. Upload configuration files to the new server
2. Run the setup script on the server
3. Configure nginx and systemd services
4. Test the deployment

### Option 2: Manual Deployment

1. **Upload files to server:**
```bash
scp nginx_config.conf root@139.59.1.59:/root/
scp crickcoach-backend-new-server.service root@139.59.1.59:/root/crickcoach-backend.service
scp setup_new_server.sh root@139.59.1.59:/root/setup_production_server.sh
scp backend_script.py requirements.txt root@139.59.1.59:/root/CricketCoachinAI/
```

2. **SSH into the server:**
```bash
ssh root@139.59.1.59
```

3. **Run the setup script:**
```bash
chmod +x /root/setup_production_server.sh
/root/setup_production_server.sh
```

## Systemd Service Management

### Check Service Status
```bash
ssh root@139.59.1.59 'systemctl status crickcoach-backend'
```

### View Logs
```bash
ssh root@139.59.1.59 'journalctl -u crickcoach-backend -f'
```

### Restart Service
```bash
ssh root@139.59.1.59 'systemctl restart crickcoach-backend'
```

### Enable Service (auto-start on boot)
```bash
ssh root@139.59.1.59 'systemctl enable crickcoach-backend'
```

## Service File Location
The systemd service file is located at:
- **On server**: `/etc/systemd/system/crickcoach-backend.service`
- **Local copy**: `crickcoach-backend-new-server.service`

## Service Configuration
- **Working Directory**: `/root/CricketCoachinAI`
- **Python Environment**: `/root/CricketCoachinAI/myenv/bin/python3`
- **Script**: `/root/CricketCoachinAI/backend_script.py`
- **Restart Policy**: Always restart on failure (10 second delay)
- **Port**: 3000

## Access URLs
- **Direct Backend**: `http://139.59.1.59:3000`
- **Via Nginx**: `http://139.59.1.59`
- **Health Check**: `http://139.59.1.59/health` or `http://139.59.1.59:3000/api/health`

## Firewall Configuration
The setup script configures UFW firewall to allow:
- SSH (port 22)
- HTTP (port 80)
- Backend API (port 3000)

## Next Steps After Deployment

1. **Update Mobile App Configuration**
   - Update Android network security config: `android/app/src/main/res/xml/network_security_config.xml`
   - Update iOS Info.plist: `ios/CrickCoachAI/Info.plist`
   - Update app config files with new IP address

2. **Test Connectivity**
   ```bash
   curl http://139.59.1.59/health
   curl http://139.59.1.59:3000/api/health
   ```

3. **Monitor Logs**
   ```bash
   ssh root@139.59.1.59 'journalctl -u crickcoach-backend -f'
   ```

4. **Rebuild Mobile Apps**
   - Rebuild Android APK with new IP address
   - Rebuild iOS app with new IP address

## Troubleshooting

### Service Won't Start
```bash
# Check logs
ssh root@139.59.1.59 'journalctl -u crickcoach-backend -n 50'

# Check if Python dependencies are installed
ssh root@139.59.1.59 'cd /root/CricketCoachinAI && source myenv/bin/activate && pip list'
```

### Port Already in Use
```bash
# Check what's using port 3000
ssh root@139.59.1.59 'netstat -tlnp | grep 3000'

# Kill process if needed
ssh root@139.59.1.59 'lsof -ti:3000 | xargs kill -9'
```

### Firewall Issues
```bash
# Check firewall status
ssh root@139.59.1.59 'ufw status'

# Allow ports if needed
ssh root@139.59.1.59 'ufw allow 3000/tcp && ufw allow 80/tcp'
```

## Files Updated with New IP Address

All occurrences of `165.232.184.91` have been replaced with `139.59.1.59` in:
- Test scripts (`.js`, `.py` files)
- Configuration files (Android/iOS)
- Documentation (`.md` files)
- Deployment scripts (`.sh`, `.bat` files)
- Network security configs

## Notes
- The systemd service file uses the same configuration as before, just updated for the new server
- Nginx configuration remains the same (no IP addresses in nginx config)
- All mobile app network security configurations have been updated
- Test scripts have been updated to use the new IP address

