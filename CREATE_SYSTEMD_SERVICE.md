# How to Create Systemd Service File

## Answer: You Only Need ONE Service File

You only need to create **one** systemd service file: `crickcoach-backend.service`

The backend handles everything (including background processing) in a single process, so no additional service files are needed.

---

## Option 1: Create File Manually (Recommended for Learning)

### Step 1: Create the file
```bash
nano /etc/systemd/system/crickcoach-backend.service
```

### Step 2: Copy and paste this content:

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
ExecStart=/root/CricketCoachinAI/myenv/bin/python3 /root/CricketCoachinAI/backend_script.py
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
```

### Step 3: Save and exit
- Press `Ctrl+X`
- Press `Y` to confirm
- Press `Enter` to save

---

## Option 2: Create File Using cat Command (Faster)

Run this single command on your server:

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
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/root/CricketCoachinAI/myenv/bin
ExecStart=/root/CricketCoachinAI/myenv/bin/python3 /root/CricketCoachinAI/backend_script.py
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

---

## Option 3: Upload Pre-made File from Your Computer

### Step 1: From your local machine, upload the file:
```bash
scp crickcoach-backend-new-server.service root@139.59.1.59:/etc/systemd/system/crickcoach-backend.service
```

### Step 2: On the server, verify the file:
```bash
cat /etc/systemd/system/crickcoach-backend.service
```

---

## After Creating the File

### 1. Reload systemd to recognize the new service:
```bash
systemctl daemon-reload
```

### 2. Enable the service (start on boot):
```bash
systemctl enable crickcoach-backend.service
```

### 3. Start the service:
```bash
systemctl start crickcoach-backend.service
```

### 4. Check if it's running:
```bash
systemctl status crickcoach-backend.service
```

---

## Verify the Service File

Check that the file was created correctly:
```bash
cat /etc/systemd/system/crickcoach-backend.service
```

---

## Important Notes

1. **Only ONE service file needed** - The backend handles everything in one process
2. **File location** - Must be in `/etc/systemd/system/` directory
3. **File name** - Must end with `.service` extension
4. **Permissions** - Root user can create/edit this file
5. **After editing** - Always run `systemctl daemon-reload` after creating/editing

---

## Troubleshooting

### If service won't start:
```bash
# Check the service file syntax
systemctl cat crickcoach-backend.service

# Check logs
journalctl -u crickcoach-backend.service -n 50

# Check if paths exist
ls -la /root/CricketCoachinAI/backend_script.py
ls -la /root/CricketCoachinAI/myenv/bin/python3
```

### If you need to edit the file later:
```bash
nano /etc/systemd/system/crickcoach-backend.service
# Make your changes
systemctl daemon-reload
systemctl restart crickcoach-backend.service
```

---

## Summary

- ✅ Create **ONE** file: `/etc/systemd/system/crickcoach-backend.service`
- ✅ Use any of the 3 methods above (nano, cat, or scp)
- ✅ After creating, run `systemctl daemon-reload`
- ✅ Enable and start the service
- ❌ **NO** additional service files needed

