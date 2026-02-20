# Manual Server Setup Guide

## Server Information
- **Server IP**: `139.59.1.59`
- **User**: `root`

This guide provides step-by-step instructions to manually set up all services on your new server.

---

## Step 1: Connect to Server

```bash
ssh root@139.59.1.59
```

---

## Step 2: Update System Packages

```bash
apt update && apt upgrade -y
```

---

## Step 3: Install Required Packages

```bash
apt install -y python3 python3-pip python3-venv curl wget git ufw nginx
```

---

## Step 4: Create Project Directory

```bash
mkdir -p /root/CricketCoachinAI
cd /root/CricketCoachinAI
```

---

## Step 5: Upload Backend Files

From your local machine, upload the backend files:

```bash
# From your local machine
scp backend_script.py root@139.59.1.59:/root/CricketCoachinAI/
scp requirements.txt root@139.59.1.59:/root/CricketCoachinAI/
```

---

## Step 6: Create Python Virtual Environment

On the server:

```bash
cd /root/CricketCoachinAI
python3 -m venv myenv
source myenv/bin/activate
```

---

## Step 7: Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

## Step 8: Create Uploads Directory

```bash
mkdir -p /root/CricketCoachinAI/uploads
chmod 755 /root/CricketCoachinAI/uploads
```

---

## Step 9: Create Systemd Service File

Create the systemd service file:

```bash
nano /etc/systemd/system/crickcoach-backend.service
```

Copy and paste the following content:

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

Save and exit (Ctrl+X, then Y, then Enter).

---

## Step 10: Reload Systemd and Enable Service

```bash
# Reload systemd daemon
systemctl daemon-reload

# Enable service to start on boot
systemctl enable crickcoach-backend.service

# Start the service
systemctl start crickcoach-backend.service

# Check service status
systemctl status crickcoach-backend.service
```

---

## Step 11: Create Nginx Configuration

Create the nginx configuration file:

```bash
nano /etc/nginx/sites-available/crickcoach
```

Copy and paste the following content:

```nginx
# Nginx configuration for CrickCoach Backend (HTTP-only)
# This file should be placed in /etc/nginx/sites-available/crickcoach
# and symlinked to /etc/nginx/sites-enabled/

server {
    listen 80;
    listen [::]:80;
    # Domain for your backend API
    server_name api.crickcoachai.com;
    
    # Logging
    access_log /var/log/nginx/crickcoach_access.log;
    error_log /var/log/nginx/crickcoach_error.log;
    
    # Increase client body size for video uploads (up to 100MB)
    client_max_body_size 100M;
    
    # Increase timeout for video processing and uploads (10 minutes)
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;
    send_timeout 600s;
    
    # Main backend proxy
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers for mobile app
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # Increase timeouts for API endpoints (especially uploads)
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:3000/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files (if any)
    location /static/ {
        alias /root/CricketCoachinAI/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers (HTTP-only, no HSTS)
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

Save and exit (Ctrl+X, then Y, then Enter).

---

## Step 12: Enable Nginx Site

```bash
# Create symlink to enable the site
ln -sf /etc/nginx/sites-available/crickcoach /etc/nginx/sites-enabled/

# Remove default site (optional)
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t
```

If the test is successful, you should see:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

## Step 13: Start and Enable Nginx

```bash
# Enable nginx to start on boot
systemctl enable nginx

# Start nginx
systemctl start nginx

# Check nginx status
systemctl status nginx
```

---

## Step 14: Configure Firewall

```bash
# Enable UFW firewall
ufw --force enable

# Allow SSH (important - do this first!)
ufw allow ssh
ufw allow 22/tcp

# Allow HTTP
ufw allow 80/tcp

# Allow backend API port
ufw allow 3000/tcp

# Reload firewall
ufw reload

# Check firewall status
ufw status
```

---

## Step 15: Verify Services Are Running

### Check Backend Service
```bash
systemctl status crickcoach-backend.service
```

### Check Nginx Service
```bash
systemctl status nginx
```

### Check if Backend is Listening
```bash
netstat -tlnp | grep 3000
```

You should see something like:
```
tcp        0      0 0.0.0.0:3000            0.0.0.0:*               LISTEN      12345/python3
```

---

## Step 16: Test the Setup

### Test Backend Directly
```bash
curl http://localhost:3000/api/health
```

### Test Backend via Nginx
```bash
curl http://localhost/health
```

### Test from External Machine
From your local machine:

```bash
# Test direct backend
curl http://139.59.1.59:3000/api/health

# Test via nginx
curl http://139.59.1.59/health
```

---

## Step 17: View Logs (Optional)

### Backend Service Logs
```bash
# View recent logs
journalctl -u crickcoach-backend.service -n 50

# Follow logs in real-time
journalctl -u crickcoach-backend.service -f
```

### Nginx Logs
```bash
# Access logs
tail -f /var/log/nginx/crickcoach_access.log

# Error logs
tail -f /var/log/nginx/crickcoach_error.log
```

---

## Service Management Commands

### Backend Service

```bash
# Start service
systemctl start crickcoach-backend.service

# Stop service
systemctl stop crickcoach-backend.service

# Restart service
systemctl restart crickcoach-backend.service

# Check status
systemctl status crickcoach-backend.service

# Enable on boot
systemctl enable crickcoach-backend.service

# Disable on boot
systemctl disable crickcoach-backend.service

# View logs
journalctl -u crickcoach-backend.service -f
```

### Nginx Service

```bash
# Start nginx
systemctl start nginx

# Stop nginx
systemctl stop nginx

# Restart nginx
systemctl restart nginx

# Reload nginx (without downtime)
systemctl reload nginx

# Check status
systemctl status nginx

# Test configuration
nginx -t
```

---

## Troubleshooting

### Backend Service Won't Start

1. **Check logs:**
   ```bash
   journalctl -u crickcoach-backend.service -n 100
   ```

2. **Check if Python dependencies are installed:**
   ```bash
   cd /root/CricketCoachinAI
   source myenv/bin/activate
   pip list
   ```

3. **Check if port 3000 is already in use:**
   ```bash
   netstat -tlnp | grep 3000
   lsof -i :3000
   ```

4. **Test backend script manually:**
   ```bash
   cd /root/CricketCoachinAI
   source myenv/bin/activate
   python3 backend_script.py
   ```

### Nginx Issues

1. **Test configuration:**
   ```bash
   nginx -t
   ```

2. **Check nginx error logs:**
   ```bash
   tail -f /var/log/nginx/error.log
   tail -f /var/log/nginx/crickcoach_error.log
   ```

3. **Check if port 80 is in use:**
   ```bash
   netstat -tlnp | grep 80
   ```

### Firewall Issues

1. **Check firewall status:**
   ```bash
   ufw status verbose
   ```

2. **Check if ports are open:**
   ```bash
   ufw status numbered
   ```

3. **Allow ports if needed:**
   ```bash
   ufw allow 3000/tcp
   ufw allow 80/tcp
   ```

### Connection Issues

1. **Test from server:**
   ```bash
   curl http://localhost:3000/api/health
   curl http://localhost/health
   ```

2. **Test from external machine:**
   ```bash
   curl http://139.59.1.59:3000/api/health
   curl http://139.59.1.59/health
   ```

3. **Check if services are listening:**
   ```bash
   netstat -tlnp | grep -E '3000|80'
   ```

---

## Summary

After completing all steps, you should have:

✅ Backend service running on port 3000  
✅ Nginx reverse proxy running on port 80  
✅ Firewall configured  
✅ Services enabled to start on boot  
✅ Health checks passing  

**Access URLs:**
- Direct Backend: `http://139.59.1.59:3000`
- Via Nginx: `http://139.59.1.59`
- Health Check: `http://139.59.1.59/health`

---

## Next Steps

1. Update your mobile app configuration files with the new IP address
2. Rebuild your mobile apps
3. Test the mobile app connection
4. Monitor logs for any issues

