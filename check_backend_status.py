#!/usr/bin/env python3
"""
Check Backend Status on Digital Ocean Droplet
This script checks if the backend is running and accessible
"""

import requests
import subprocess
import sys

def check_backend_status():
    """Check if the backend is running and accessible"""
    print("🔍 Checking Backend Status on Digital Ocean Droplet")
    print("=" * 60)
    
    # Test 1: Check if backend is responding
    print("\n1️⃣ Testing backend connectivity...")
    try:
        response = requests.get('https://165.232.184.91:3000/api/health', timeout=10)
        print(f"✅ Backend is responding: Status {response.status_code}")
        print(f"📄 Response: {response.text}")
    except requests.exceptions.ConnectionError:
        print("❌ Backend is not reachable - Connection refused")
        print("🔧 This means the backend is not running on the droplet")
        return False
    except requests.exceptions.Timeout:
        print("❌ Backend timeout - Request took too long")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    
    # Test 2: Check if port 3000 is open
    print("\n2️⃣ Testing port 3000...")
    try:
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex(('165.232.184.91', 3000))
        sock.close()
        
        if result == 0:
            print("✅ Port 3000 is open and accessible")
        else:
            print("❌ Port 3000 is closed or blocked")
            return False
    except Exception as e:
        print(f"❌ Error testing port: {e}")
        return False
    
    # Test 3: Test authentication endpoints
    print("\n3️⃣ Testing authentication endpoints...")
    try:
        # Test register endpoint
        register_data = {
            'username': 'test_user_status',
            'email': 'test_status@example.com',
            'password': 'testpass123'
        }
        response = requests.post('https://165.232.184.91:3000/api/auth/register', 
                               json=register_data, timeout=10)
        print(f"📊 Register endpoint: Status {response.status_code}")
        
        # Test login endpoint
        login_data = {
            'username': 'test_user_status',
            'password': 'testpass123'
        }
        response = requests.post('https://165.232.184.91:3000/api/auth/login', 
                               json=login_data, timeout=10)
        print(f"📊 Login endpoint: Status {response.status_code}")
        
        if response.status_code in [200, 409]:  # 409 means user already exists
            print("✅ Authentication endpoints are working")
        else:
            print(f"⚠️ Authentication endpoints returned status {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error testing authentication: {e}")
        return False
    
    print("\n✅ Backend is running and accessible!")
    return True

def provide_fix_instructions():
    """Provide instructions to fix backend issues"""
    print("\n🔧 If backend is not running, here's how to fix it:")
    print("=" * 60)
    print("1. SSH into your droplet:")
    print("   ssh root@165.232.184.91")
    print()
    print("2. Navigate to your project:")
    print("   cd /root/CricketCoachinAI")
    print()
    print("3. Check if backend is running:")
    print("   ps aux | grep python")
    print()
    print("4. If not running, start it:")
    print("   source myenv/bin/activate")
    print("   nohup python3 backend_script.py > /var/log/crickcoach-backend.log 2>&1 &")
    print()
    print("5. Check firewall:")
    print("   sudo ufw status")
    print("   sudo ufw allow 3000/tcp")
    print()
    print("6. Test locally on droplet:")
    print("   curl https://localhost:3000/api/health")

if __name__ == "__main__":
    if not check_backend_status():
        provide_fix_instructions()
    else:
        print("\n🎉 Backend is working correctly!")
        print("📱 The issue might be with your mobile app configuration.")

