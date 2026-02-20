#!/bin/bash
# Manual Setup Commands - Copy and paste these commands one by one on your server
# Server IP: 139.59.1.59

# ============================================
# STEP 1: Update System
# ============================================
apt update && apt upgrade -y

# ============================================
# STEP 2: Install Required Packages
# ============================================
apt install -y python3 python3-pip python3-venv curl wget git ufw nginx

# ============================================
# STEP 3: Create Project Directory
# ============================================
mkdir -p /root/CricketCoachinAI
cd /root/CricketCoachinAI

# ============================================
# STEP 4: Create Python Virtual Environment
# ============================================
python3 -m venv myenv
source myenv/bin/activate

# ============================================
# STEP 5: Install Python Dependencies
# ============================================
# Make sure requirements.txt is uploaded first
pip install --upgrade pip
pip install -r requirements.txt

# ============================================
# STEP 6: Create Uploads Directory
# ============================================
mkdir -p /root/CricketCoachinAI/uploads
chmod 755 /root/CricketCoachinAI/uploads

# ============================================
# STEP 7: Create Systemd Service File
# ============================================
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

# ============================================
# STEP 8: Reload Systemd and Enable Service
# ============================================
systemctl daemon-reload
systemctl enable crickcoach-backend.service
systemctl start crickcoach-backend.service
systemctl status crickcoach-backend.service

# ============================================
# STEP 9: Create Nginx Configuration
# ============================================
cat > /etc/nginx/sites-available/crickcoach << 'NGINX_EOF'
# Nginx configuration for CrickCoach Backend (HTTP-only)
server {
    listen 80;
    listen [::]:80;
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
NGINX_EOF

# ============================================
# STEP 10: Enable Nginx Site
# ============================================
ln -sf /etc/nginx/sites-available/crickcoach /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t

# ============================================
# STEP 11: Start and Enable Nginx
# ============================================
systemctl enable nginx
systemctl start nginx
systemctl status nginx

# ============================================
# STEP 12: Configure Firewall
# ============================================
ufw --force enable
ufw allow ssh
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 3000/tcp
ufw reload
ufw status

# ============================================
# STEP 13: Verify Services
# ============================================
echo "Checking backend service..."
systemctl status crickcoach-backend.service

echo "Checking nginx service..."
systemctl status nginx

echo "Checking if backend is listening on port 3000..."
netstat -tlnp | grep 3000

echo "Testing backend directly..."
curl http://localhost:3000/api/health

echo "Testing backend via nginx..."
curl http://localhost/health

echo ""
echo "============================================"
echo "Setup Complete!"
echo "============================================"
echo "Backend URL: http://139.59.1.59:3000"
echo "Nginx URL: http://139.59.1.59"
echo "Health Check: http://139.59.1.59/health"
echo ""
echo "To view logs:"
echo "  Backend: journalctl -u crickcoach-backend.service -f"
echo "  Nginx: tail -f /var/log/nginx/crickcoach_access.log"
echo "============================================"

