# Systemd Service Setup Guide

This guide will help you set up the backend to run automatically using systemd instead of manually running `python backend_script.py`.

## Quick Setup Steps

### 1. Upload Service File to Server

From your local machine:

```bash
scp crickcoach-backend.service root@139.59.1.59:/etc/systemd/system/crickcoach-backend.service
```

Or if you're already on the server, create it directly:

```bash
nano /etc/systemd/system/crickcoach-backend.service
```

### 2. Copy Service File Content

Copy and paste this content:

```ini
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
```

Save and exit (Ctrl+X, then Y, then Enter).

### 3. Reload Systemd and Enable Service

```bash
# Reload systemd to recognize the new service
systemctl daemon-reload

# Enable the service to start on boot
systemctl enable crickcoach-backend.service

# Start the service
systemctl start crickcoach-backend.service

# Check service status
systemctl status crickcoach-backend.service
```

## Service Management Commands

### Check Service Status
```bash
systemctl status crickcoach-backend
```

### View Logs
```bash
# View recent logs (last 50 lines)
journalctl -u crickcoach-backend -n 50

# Follow logs in real-time
journalctl -u crickcoach-backend -f

# View logs from today
journalctl -u crickcoach-backend --since today

# View logs with timestamps
journalctl -u crickcoach-backend --since "1 hour ago"
```

### Start/Stop/Restart Service
```bash
# Start the service
systemctl start crickcoach-backend

# Stop the service
systemctl stop crickcoach-backend

# Restart the service
systemctl restart crickcoach-backend

# Reload configuration (if service file changed)
systemctl daemon-reload
systemctl restart crickcoach-backend
```

### Enable/Disable Auto-Start
```bash
# Enable service to start on boot
systemctl enable crickcoach-backend

# Disable auto-start on boot
systemctl disable crickcoach-backend

# Check if enabled
systemctl is-enabled crickcoach-backend
```

## Verification

### 1. Check if Service is Running
```bash
systemctl status crickcoach-backend
```

You should see:
- `Active: active (running)`
- `Main PID: <number>`

### 2. Check if Backend is Listening
```bash
netstat -tlnp | grep 3000
# or
ss -tlnp | grep 3000
```

You should see something like:
```
tcp        0      0 0.0.0.0:3000            0.0.0.0:*               LISTEN      12345/python3
```

### 3. Test the API
```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Should return: {"status":"healthy","message":"Cricket Coach API is running"}
```

## Troubleshooting

### Service Won't Start

1. **Check service status:**
   ```bash
   systemctl status crickcoach-backend
   ```

2. **Check logs for errors:**
   ```bash
   journalctl -u crickcoach-backend -n 100
   ```

3. **Verify Python environment:**
   ```bash
   cd /root/CricketCoachinAI
   source myenv/bin/activate
   which python3
   python3 --version
   ```

4. **Test script manually:**
   ```bash
   cd /root/CricketCoachinAI
   source myenv/bin/activate
   python3 -u backend_script.py
   ```
   If this works but systemd doesn't, check the service file paths.

### Service Keeps Restarting

1. **Check logs for crash reasons:**
   ```bash
   journalctl -u crickcoach-backend -n 100 --no-pager
   ```

2. **Check if port 3000 is already in use:**
   ```bash
   lsof -i :3000
   # or
   netstat -tlnp | grep 3000
   ```

3. **Kill any existing processes:**
   ```bash
   pkill -f backend_script.py
   # Then restart service
   systemctl restart crickcoach-backend
   ```

### Logs Not Showing

1. **Check journald logs:**
   ```bash
   journalctl -u crickcoach-backend -f
   ```

2. **Check log files:**
   ```bash
   ls -la /root/CricketCoachinAI/logging/
   tail -f /root/CricketCoachinAI/logging/backend_*.log
   ```

3. **Verify PYTHONUNBUFFERED is set:**
   ```bash
   systemctl show crickcoach-backend | grep PYTHONUNBUFFERED
   ```

### Permission Issues

1. **Check file permissions:**
   ```bash
   ls -la /root/CricketCoachinAI/backend_script.py
   ls -la /root/CricketCoachinAI/myenv/bin/python3
   ```

2. **Check directory permissions:**
   ```bash
   ls -la /root/CricketCoachinAI/
   ```

3. **Ensure service user has access:**
   The service runs as `root`, so permissions should be fine. If you change the user, ensure they have read/write access.

## Service File Locations

- **Service file on server**: `/etc/systemd/system/crickcoach-backend.service`
- **Local copy**: `crickcoach-backend.service` (in your project directory)

## Important Notes

1. **Unbuffered Output**: The service uses `-u` flag and `PYTHONUNBUFFERED=1` to ensure logs appear immediately
2. **Auto-restart**: Service will automatically restart if it crashes (10 second delay)
3. **Logs**: All logs go to systemd journal. Use `journalctl` to view them
4. **Boot**: Service is enabled to start automatically on server boot

## Updating the Service

If you need to update the service file:

1. **Edit the service file:**
   ```bash
   nano /etc/systemd/system/crickcoach-backend.service
   ```

2. **Reload systemd:**
   ```bash
   systemctl daemon-reload
   ```

3. **Restart the service:**
   ```bash
   systemctl restart crickcoach-backend
   ```

## Complete Setup Script

Here's a complete script you can run on the server:

```bash
#!/bin/bash

# Create systemd service file
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

# Reload systemd
systemctl daemon-reload

# Enable service
systemctl enable crickcoach-backend.service

# Start service
systemctl start crickcoach-backend.service

# Check status
systemctl status crickcoach-backend.service

echo ""
echo "✅ Systemd service setup complete!"
echo ""
echo "Useful commands:"
echo "  - Check status: systemctl status crickcoach-backend"
echo "  - View logs: journalctl -u crickcoach-backend -f"
echo "  - Restart: systemctl restart crickcoach-backend"
```

Save this as `setup_systemd.sh` and run:
```bash
chmod +x setup_systemd.sh
./setup_systemd.sh
```

## Next Steps

After setting up the systemd service:

1. ✅ Service will start automatically on boot
2. ✅ Service will restart automatically if it crashes
3. ✅ Logs are available via `journalctl`
4. ✅ No need to manually run `python backend_script.py`

You can now stop manually running the script and let systemd manage it!

