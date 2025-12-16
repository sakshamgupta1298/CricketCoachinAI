#!/bin/bash

# CrickCoach HTTPS Setup Script
# This script helps set up SSL certificates for HTTPS

set -e

echo "🔒 Setting up HTTPS for CrickCoach Backend..."
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

SERVER_IP="165.232.184.91"
DOMAIN_NAME=""

# Check if domain name is provided
if [ -n "$1" ]; then
    DOMAIN_NAME="$1"
    print_info "Using domain name: $DOMAIN_NAME"
else
    print_warning "No domain name provided. You can use Let's Encrypt with IP address using certbot's --standalone mode"
    print_info "For production, it's recommended to use a domain name"
    read -p "Do you want to continue with IP address only? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Please provide a domain name: ./setup_https.sh yourdomain.com"
        exit 1
    fi
fi

# Option 1: Let's Encrypt (Recommended for production with domain)
if [ -n "$DOMAIN_NAME" ]; then
    print_info "Setting up Let's Encrypt SSL certificate..."
    
    # Install certbot
    if ! command -v certbot &> /dev/null; then
        print_info "Installing certbot..."
        apt update
        apt install certbot python3-certbot-nginx -y
        print_status "Certbot installed"
    else
        print_status "Certbot already installed"
    fi
    
    # Stop nginx temporarily for standalone mode (if needed)
    print_info "Obtaining SSL certificate..."
    certbot certonly --standalone -d "$DOMAIN_NAME" --non-interactive --agree-tos --email admin@$DOMAIN_NAME
    
    if [ $? -eq 0 ]; then
        print_status "SSL certificate obtained successfully"
        
        # Update nginx config with certificate paths
        print_info "Updating nginx configuration..."
        sed -i "s|# ssl_certificate /etc/letsencrypt/live/165.232.184.91/fullchain.pem;|ssl_certificate /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem;|g" /etc/nginx/sites-available/crickcoach
        sed -i "s|# ssl_certificate_key /etc/letsencrypt/live/165.232.184.91/privkey.pem;|ssl_certificate_key /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem;|g" /etc/nginx/sites-available/crickcoach
        sed -i "s|# ssl_trusted_certificate /etc/letsencrypt/live/165.232.184.91/chain.pem;|ssl_trusted_certificate /etc/letsencrypt/live/$DOMAIN_NAME/chain.pem;|g" /etc/nginx/sites-available/crickcoach
        sed -i "s|# ssl_stapling on;|ssl_stapling on;|g" /etc/nginx/sites-available/crickcoach
        sed -i "s|# ssl_stapling_verify on;|ssl_stapling_verify on;|g" /etc/nginx/sites-available/crickcoach
        
        # Update server_name in nginx config
        sed -i "s|server_name 165.232.184.91;|server_name $DOMAIN_NAME $SERVER_IP;|g" /etc/nginx/sites-available/crickcoach
        
        print_status "Nginx configuration updated"
    else
        print_error "Failed to obtain SSL certificate"
        exit 1
    fi
else
    # Option 2: Self-signed certificate (for testing/development)
    print_info "Setting up self-signed SSL certificate..."
    
    SSL_DIR="/etc/nginx/ssl"
    mkdir -p "$SSL_DIR"
    
    print_info "Generating self-signed certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/crickcoach.key" \
        -out "$SSL_DIR/crickcoach.crt" \
        -subj "/C=US/ST=State/L=City/O=CrickCoach/CN=$SERVER_IP"
    
    if [ $? -eq 0 ]; then
        print_status "Self-signed certificate generated"
        
        # Update nginx config with self-signed certificate paths
        print_info "Updating nginx configuration..."
        sed -i "s|# ssl_certificate /etc/nginx/ssl/crickcoach.crt;|ssl_certificate /etc/nginx/ssl/crickcoach.crt;|g" /etc/nginx/sites-available/crickcoach
        sed -i "s|# ssl_certificate_key /etc/nginx/ssl/crickcoach.key;|ssl_certificate_key /etc/nginx/ssl/crickcoach.key;|g" /etc/nginx/sites-available/crickcoach
        
        print_status "Nginx configuration updated"
        print_warning "Note: Self-signed certificates will show a security warning in browsers"
        print_info "For production, use Let's Encrypt with a domain name"
    else
        print_error "Failed to generate self-signed certificate"
        exit 1
    fi
fi

# Test nginx configuration
print_info "Testing nginx configuration..."
nginx -t
if [ $? -eq 0 ]; then
    print_status "Nginx configuration is valid"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Reload nginx
print_info "Reloading nginx..."
systemctl reload nginx
print_status "Nginx reloaded"

# Set up auto-renewal for Let's Encrypt (if using domain)
if [ -n "$DOMAIN_NAME" ]; then
    print_info "Setting up certificate auto-renewal..."
    
    # Add renewal hook to reload nginx
    if [ ! -f /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh ]; then
        mkdir -p /etc/letsencrypt/renewal-hooks/deploy
        cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh << 'EOF'
#!/bin/bash
systemctl reload nginx
EOF
        chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
    fi
    
    # Add cron job for auto-renewal
    (crontab -l 2>/dev/null | grep -v "certbot renew"; echo "0 12 * * * /usr/bin/certbot renew --quiet --deploy-hook /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh") | crontab -
    
    print_status "Auto-renewal configured"
fi

# Test HTTPS endpoint
print_info "Testing HTTPS endpoint..."
sleep 2
if curl -k -f https://localhost/health > /dev/null 2>&1; then
    print_status "HTTPS endpoint is working"
else
    print_warning "HTTPS endpoint test failed (this might be normal if using self-signed cert)"
fi

# Display final status
echo ""
echo "🎉 HTTPS Setup Complete!"
echo "========================"
echo ""
print_info "Server Information:"
if [ -n "$DOMAIN_NAME" ]; then
    echo "  - HTTPS URL: https://$DOMAIN_NAME"
    echo "  - IP HTTPS URL: https://$SERVER_IP"
else
    echo "  - HTTPS URL: https://$SERVER_IP"
fi
echo "  - Health Check: https://$SERVER_IP/health"
echo ""
print_info "Certificate Information:"
if [ -n "$DOMAIN_NAME" ]; then
    echo "  - Certificate: /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem"
    echo "  - Private Key: /etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem"
    echo "  - Auto-renewal: Enabled (runs daily at 12:00)"
else
    echo "  - Certificate: /etc/nginx/ssl/crickcoach.crt"
    echo "  - Private Key: /etc/nginx/ssl/crickcoach.key"
    echo "  - Note: Self-signed certificate (for testing only)"
fi
echo ""
print_warning "Next Steps:"
echo "  1. Update your mobile app config.js to use: https://$SERVER_IP"
if [ -n "$DOMAIN_NAME" ]; then
    echo "  2. Or use domain: https://$DOMAIN_NAME"
fi
echo "  3. Test the mobile app connection"
echo "  4. Monitor logs for any issues"
echo ""
print_status "HTTPS setup completed successfully! 🔒"

