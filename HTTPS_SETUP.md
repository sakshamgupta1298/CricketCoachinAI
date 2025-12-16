# 🔒 HTTPS Setup Guide for CrickCoach Backend

This guide explains how to set up HTTPS for your CrickCoach backend server.

## 📋 Overview

The backend has been converted from HTTP to HTTPS. This provides:
- ✅ Encrypted communication between mobile app and backend
- ✅ Better security for user data and authentication
- ✅ Production-ready configuration
- ✅ Automatic HTTP to HTTPS redirect

## 🚀 Quick Setup

### Option 1: Using Let's Encrypt (Recommended for Production)

If you have a domain name pointing to your server:

```bash
# On your server, run:
sudo ./setup_https.sh yourdomain.com
```

This will:
1. Install Certbot (Let's Encrypt client)
2. Obtain SSL certificate for your domain
3. Configure nginx with SSL certificates
4. Set up automatic certificate renewal

### Option 2: Self-Signed Certificate (For Testing)

If you don't have a domain name:

```bash
# On your server, run:
sudo ./setup_https.sh
```

This will:
1. Generate a self-signed SSL certificate
2. Configure nginx with the certificate
3. Enable HTTPS (note: browsers will show security warnings)

## 📝 Manual Setup Steps

If you prefer to set up manually:

### 1. Update Nginx Configuration

The `nginx_config.conf` file has been updated with HTTPS support. Copy it to your server:

```bash
scp nginx_config.conf root@165.232.184.91:/root/
ssh root@165.232.184.91
cp /root/nginx_config.conf /etc/nginx/sites-available/crickcoach
```

### 2. Obtain SSL Certificate

#### Using Let's Encrypt (with domain):
```bash
apt install certbot python3-certbot-nginx
certbot certonly --standalone -d yourdomain.com
```

#### Using Self-Signed (testing only):
```bash
mkdir -p /etc/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/crickcoach.key \
    -out /etc/nginx/ssl/crickcoach.crt \
    -subj "/C=US/ST=State/L=City/O=CrickCoach/CN=165.232.184.91"
```

### 3. Update Nginx Config with Certificate Paths

Edit `/etc/nginx/sites-available/crickcoach` and uncomment the appropriate SSL certificate lines:

**For Let's Encrypt:**
```nginx
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
ssl_trusted_certificate /etc/letsencrypt/live/yourdomain.com/chain.pem;
ssl_stapling on;
ssl_stapling_verify on;
```

**For Self-Signed:**
```nginx
ssl_certificate /etc/nginx/ssl/crickcoach.crt;
ssl_certificate_key /etc/nginx/ssl/crickcoach.key;
```

### 4. Test and Reload Nginx

```bash
nginx -t
systemctl reload nginx
```

### 5. Set Up Auto-Renewal (Let's Encrypt only)

```bash
# Add to crontab
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --deploy-hook 'systemctl reload nginx'") | crontab -
```

## 📱 Update Mobile App Configuration

The mobile app configuration has been updated to use HTTPS. Verify in `config.js`:

```javascript
const config = {
  production: {
    API_BASE_URL: 'https://165.232.184.91', // HTTPS now
    API_TIMEOUT: 600000,
  }
};
```

## 🔧 Configuration Files Updated

The following files have been updated for HTTPS:

1. **nginx_config.conf** - Added HTTPS server block with SSL configuration
2. **config.js** - Changed API URLs from `http://` to `https://`
3. **plugins/network-security.js** - Updated Android/iOS network security config
4. **android/app/src/main/res/xml/network_security_config.xml** - Updated Android config

## ✅ Verification

Test your HTTPS setup:

```bash
# Test HTTPS endpoint
curl -k https://165.232.184.91/health

# Test HTTP redirect (should redirect to HTTPS)
curl -I http://165.232.184.91/health
```

Expected output:
- HTTPS endpoint returns 200 OK
- HTTP endpoint returns 301 redirect to HTTPS

## 🔍 Troubleshooting

### Certificate Errors

**Self-Signed Certificate Warning:**
- This is normal for self-signed certificates
- Mobile apps may need to accept the certificate manually
- For production, use Let's Encrypt with a domain name

**Let's Encrypt Certificate Issues:**
```bash
# Check certificate status
certbot certificates

# Renew certificate manually
certbot renew

# Check nginx logs
tail -f /var/log/nginx/crickcoach_error.log
```

### Nginx Configuration Errors

```bash
# Test configuration
nginx -t

# Check nginx status
systemctl status nginx

# View nginx logs
tail -f /var/log/nginx/crickcoach_error.log
```

### Mobile App Connection Issues

1. **Android:**
   - Ensure `network_security_config.xml` is updated
   - Rebuild the app: `npx expo prebuild` then rebuild
   - Check that production IP uses HTTPS only

2. **iOS:**
   - Ensure Info.plist has proper TLS settings
   - Rebuild the app
   - For self-signed certs, you may need to add exception

## 🔐 Security Best Practices

1. **Use Let's Encrypt for Production:**
   - Free, trusted certificates
   - Automatic renewal
   - No browser warnings

2. **Keep Certificates Updated:**
   - Let's Encrypt certificates expire every 90 days
   - Auto-renewal is configured in setup script

3. **Firewall Configuration:**
   - Port 80 (HTTP) - for redirects
   - Port 443 (HTTPS) - main access
   - Port 3000 - backend direct access (optional)

4. **Security Headers:**
   - HSTS (Strict-Transport-Security) is enabled
   - Other security headers configured in nginx

## 📚 Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Certbot Documentation](https://certbot.eff.org/)

## 🆘 Support

If you encounter issues:

1. Check nginx logs: `tail -f /var/log/nginx/crickcoach_error.log`
2. Check backend logs: `journalctl -u crickcoach-backend -f`
3. Test connectivity: `curl -k https://165.232.184.91/health`
4. Verify certificate: `openssl s_client -connect 165.232.184.91:443`

Your CrickCoach backend is now secured with HTTPS! 🔒

