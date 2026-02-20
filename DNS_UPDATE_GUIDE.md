# DNS Update Guide

## ✅ DNS Configuration Complete

You've updated the DNS to point `api.crickcoachai.com` to your server IP (139.59.1.59 or 139.50.1.59).

## Configuration Updated

The `config.js` file has been updated to use the domain name instead of the IP address:
- **Before**: `http://139.59.1.59:3000`
- **After**: `http://api.crickcoachai.com` (using Nginx proxy on port 80)

## Benefits of Using Domain Name

1. **Better Maintainability**: If server IP changes, just update DNS, no need to rebuild app
2. **Professional**: Using domain names looks more professional
3. **SSL Ready**: Easy to add SSL/HTTPS later with Let's Encrypt
4. **Nginx Proxy**: Using Nginx on port 80 provides better performance and security

## Current Setup

### Nginx Configuration
- **Listening on**: Port 80
- **Domain**: `api.crickcoachai.com`
- **Proxies to**: Backend on port 3000
- **Access**: `http://api.crickcoachai.com`

### Backend Configuration
- **Running on**: Port 3000
- **Direct access**: `http://api.crickcoachai.com:3000` (if needed)
- **Via Nginx**: `http://api.crickcoachai.com` (recommended)

## Testing DNS Resolution

### 1. Test DNS Resolution
```bash
# Check if DNS is resolving correctly
nslookup api.crickcoachai.com
# or
dig api.crickcoachai.com

# Should return: 139.59.1.59 (or 139.50.1.59)
```

### 2. Test Backend via Domain
```bash
# Test health check via Nginx (port 80)
curl http://api.crickcoachai.com/health

# Test health check directly (port 3000)
curl http://api.crickcoachai.com:3000/api/health

# Test login endpoint
curl -X POST http://api.crickcoachai.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

### 3. Verify Nginx is Running
```bash
# SSH into server
ssh root@139.59.1.59  # or 139.50.1.59

# Check Nginx status
systemctl status nginx

# Check Nginx configuration
nginx -t

# View Nginx logs
tail -f /var/log/nginx/crickcoach_access.log
tail -f /var/log/nginx/crickcoach_error.log
```

## Next Steps

### 1. Rebuild Mobile App
Since `config.js` was updated, you need to rebuild the app:
```bash
# For Android
npm run android

# For iOS
npm run ios
```

### 2. Update Network Security Config (if needed)
If you're still using IP addresses in network security configs, you can optionally add the domain:

**Android** (`android/app/src/main/res/xml/network_security_config.xml`):
```xml
<domain includeSubdomains="true">api.crickcoachai.com</domain>
```

**iOS** (`ios/CrickCoachAI/Info.plist`):
```xml
<key>api.crickcoachai.com</key>
<dict>
    <key>NSExceptionAllowsInsecureHTTPLoads</key>
    <true/>
</dict>
```

### 3. (Optional) Set Up SSL/HTTPS
If you want to use HTTPS (recommended for production):

1. **Install Certbot**:
   ```bash
   apt install certbot python3-certbot-nginx
   ```

2. **Get SSL Certificate**:
   ```bash
   certbot --nginx -d api.crickcoachai.com
   ```

3. **Update config.js**:
   ```javascript
   API_BASE_URL: 'https://api.crickcoachai.com',
   ```

4. **Rebuild app** with HTTPS URL

## Troubleshooting

### Issue: DNS not resolving
**Solution**: Wait a few minutes for DNS propagation (can take up to 48 hours, usually much faster)

### Issue: Connection refused
**Solution**: 
- Verify Nginx is running: `systemctl status nginx`
- Check firewall: `ufw allow 80/tcp`
- Verify backend is running: `systemctl status crickcoach-backend`

### Issue: 502 Bad Gateway
**Solution**: 
- Backend might not be running: `systemctl start crickcoach-backend`
- Check backend logs: `journalctl -u crickcoach-backend -f`

### Issue: Still using old IP
**Solution**: 
- Clear DNS cache on your device
- Restart the app
- Verify DNS: `nslookup api.crickcoachai.com`

## Verification Checklist

- [x] DNS updated to point to server IP
- [x] `config.js` updated to use domain name
- [ ] DNS propagation verified (`nslookup api.crickcoachai.com`)
- [ ] Backend accessible via domain (`curl http://api.crickcoachai.com/health`)
- [ ] Nginx is running and configured
- [ ] Mobile app rebuilt with new configuration
- [ ] Login tested from mobile app

## Current Configuration Summary

- **Domain**: `api.crickcoachai.com`
- **Server IP**: `139.59.1.59` (or `139.50.1.59`)
- **Nginx**: Port 80 → Proxies to port 3000
- **Backend**: Port 3000
- **App Config**: `http://api.crickcoachai.com`
- **Direct Backend**: `http://api.crickcoachai.com:3000` (if needed)

## Notes

- If you mentioned `139.50.1.59` instead of `139.59.1.59`, please verify which IP is correct
- The domain name will work regardless of the exact IP, as long as DNS is pointing to the correct server
- Using the domain name makes it easier to switch servers in the future without rebuilding the app

