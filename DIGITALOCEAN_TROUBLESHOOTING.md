# Digital Ocean Backend Troubleshooting Guide

## 🚨 Network Error in APK - Quick Fix Steps

### Step 1: SSH into your Digital Ocean droplet
```bash
ssh root@206.189.141.194
```

### Step 2: Check if backend is running
```bash
# Check if the service is running
sudo systemctl status crickcoach-backend.service

# Check if port 3000 is listening
sudo netstat -tlnp | grep :3000

# Check if the process is running
ps aux | grep python
```

### Step 3: If backend is not running, start it
```bash
# Navigate to your project directory
cd /root/CrickCoach

# Start the backend manually
python3 backend_script.py
```

### Step 4: Check firewall settings
```bash
# Check firewall status
sudo ufw status

# If port 3000 is not allowed, add it
sudo ufw allow 3000/tcp
sudo ufw reload
```

### Step 5: Test the backend locally on the droplet
```bash
# Test if the backend responds locally
curl http://localhost:3000/api/health

# Test from external IP
curl http://139.59.1.59:3000/api/health
```

## 🔧 Complete Setup Instructions

### Option 1: Quick Fix (if backend files are already on droplet)
```bash
# SSH into your droplet
ssh root@206.189.141.194

# Navigate to project directory
cd /root/CrickCoach

# Make the setup script executable
chmod +x setup_digitalocean_backend.sh

# Run the setup script
./setup_digitalocean_backend.sh
```

### Option 2: Manual Setup
```bash
# 1. SSH into your droplet
ssh root@206.189.141.194

# 2. Create project directory
mkdir -p /root/CrickCoach
cd /root/CrickCoach

# 3. Upload your files (from your local machine)
# Use scp or upload through Digital Ocean console
scp backend_script.py root@206.189.141.194:/root/CrickCoach/
scp requirements.txt root@206.189.141.194:/root/CrickCoach/

# 4. Install dependencies
pip3 install -r requirements.txt

# 5. Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 6. Configure firewall
sudo ufw allow 3000/tcp
sudo ufw reload

# 7. Start the backend
python3 backend_script.py
```

## 🐛 Common Issues and Solutions

### Issue 1: "Connection refused" error
**Cause**: Backend is not running or port is blocked
**Solution**:
```bash
# Check if backend is running
sudo systemctl status crickcoach-backend.service

# If not running, start it
sudo systemctl start crickcoach-backend.service

# Check firewall
sudo ufw status
sudo ufw allow 3000/tcp
```

### Issue 2: "Module not found" errors
**Cause**: Python dependencies not installed
**Solution**:
```bash
cd /root/CrickCoach
pip3 install -r requirements.txt
```

### Issue 3: Model file missing
**Cause**: The model file wasn't downloaded
**Solution**:
```bash
cd /root/CrickCoach
python3 -c "
import os
import gdown
MODEL_PATH = 'slowfast_cricket.pth'
FILE_ID = '1SRsNEUv4a4FLisMZGM0-BH1J4RlqT0HN'
DOWNLOAD_URL = f'https://drive.google.com/uc?id={FILE_ID}'
if not os.path.exists(MODEL_PATH):
    gdown.download(DOWNLOAD_URL, MODEL_PATH, quiet=False)
"
```

### Issue 4: Port 3000 already in use
**Cause**: Another process is using port 3000
**Solution**:
```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill the process
sudo pkill -f "python.*backend_script.py"

# Or kill by PID
sudo kill -9 <PID>
```

### Issue 5: Permission denied errors
**Cause**: File permissions issues
**Solution**:
```bash
# Fix permissions
sudo chown -R root:root /root/CrickCoach
sudo chmod -R 755 /root/CrickCoach
```

## 📊 Monitoring and Logs

### View backend logs
```bash
# View real-time logs
sudo journalctl -u crickcoach-backend.service -f

# View recent logs
sudo journalctl -u crickcoach-backend.service --since "1 hour ago"

# View all logs
sudo journalctl -u crickcoach-backend.service
```

### Check system resources
```bash
# Check CPU and memory usage
htop

# Check disk space
df -h

# Check network connections
netstat -tlnp
```

## 🔄 Service Management

### Start/Stop/Restart the service
```bash
# Start the service
sudo systemctl start crickcoach-backend.service

# Stop the service
sudo systemctl stop crickcoach-backend.service

# Restart the service
sudo systemctl restart crickcoach-backend.service

# Enable auto-start on boot
sudo systemctl enable crickcoach-backend.service
```

## 🧪 Testing Connectivity

### From your local machine
```bash
# Test basic connectivity
curl http://139.59.1.59:3000/api/health

# Run the test script
python3 test_backend_connectivity.py
```

### From the droplet
```bash
# Test locally
curl http://localhost:3000/api/health

# Test from external IP
curl http://139.59.1.59:3000/api/health
```

## 📱 Mobile App Configuration

Make sure your mobile app's `config.js` has the correct URL:
```javascript
const config = {
  development: {
    API_BASE_URL: 'http://139.59.1.59:3000',
    API_TIMEOUT: 600000,
  },
  production: {
    API_BASE_URL: 'http://139.59.1.59:3000',
    API_TIMEOUT: 600000,
  }
};
```

## 🆘 Emergency Recovery

If everything is broken, here's how to reset:

```bash
# 1. Stop all services
sudo systemctl stop crickcoach-backend.service

# 2. Clean up
cd /root
rm -rf CrickCoach

# 3. Recreate directory
mkdir CrickCoach
cd CrickCoach

# 4. Upload files again and run setup
# (Follow the complete setup instructions above)
```

## 📞 Support

If you're still having issues:
1. Check the logs: `sudo journalctl -u crickcoach-backend.service -f`
2. Test connectivity: `curl http://localhost:3000/api/health`
3. Check firewall: `sudo ufw status`
4. Verify the backend is running: `ps aux | grep python`
