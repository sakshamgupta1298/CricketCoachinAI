# Troubleshooting Systemd Service - Exit Code 203

## Problem
The service shows `status=203/EXEC` which means systemd cannot execute the command.

## Quick Fix Steps

### Step 1: Check the Detailed Logs
```bash
journalctl -u crickcoach-backend.service -n 50 --no-pager
```

### Step 2: Verify All Paths Exist
```bash
# Check if Python exists
ls -la /root/CricketCoachinAI/myenv/bin/python3

# Check if backend script exists
ls -la /root/CricketCoachinAI/backend_script.py

# Check if virtual environment exists
ls -la /root/CricketCoachinAI/myenv/
```

### Step 3: Test the Command Manually
```bash
cd /root/CricketCoachinAI
source myenv/bin/activate
python3 backend_script.py
```

If this works, the issue is with the systemd service configuration.

### Step 4: Check Python Path
```bash
which python3
/root/CricketCoachinAI/myenv/bin/python3 --version
```

### Step 5: Fix Common Issues

#### Issue A: Python path might be wrong
Try using absolute path or check if python3 exists:
```bash
# Check what's in the venv bin directory
ls -la /root/CricketCoachinAI/myenv/bin/
```

#### Issue B: Virtual environment might not be activated properly
The service file should use the full path to python3 in the venv.

#### Issue C: Backend script might have wrong permissions
```bash
chmod +x /root/CricketCoachinAI/backend_script.py
```

#### Issue D: Check if shebang is correct in backend_script.py
```bash
head -n 1 /root/CricketCoachinAI/backend_script.py
```

### Step 6: Update Service File if Needed

If paths are different, edit the service file:
```bash
nano /etc/systemd/system/crickcoach-backend.service
```

Make sure these paths are correct:
- `WorkingDirectory=/root/CricketCoachinAI`
- `ExecStart=/root/CricketCoachinAI/myenv/bin/python3 /root/CricketCoachinAI/backend_script.py`

### Step 7: Alternative Service File (if venv path is wrong)

If the virtual environment path is different, try this version:

```bash
cat > /etc/systemd/system/crickcoach-backend.service << 'EOF'
[Unit]
Description=CrickCoach Backend Service
After=network.target
Wants=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/CricketCoachinAI
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=/usr/bin/python3 /root/CricketCoachinAI/backend_script.py
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
ReadWritePaths=/var/log

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF
```

Then reload:
```bash
systemctl daemon-reload
systemctl restart crickcoach-backend.service
systemctl status crickcoach-backend.service
```

