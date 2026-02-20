#!/usr/bin/env python3
"""
Quick test script to verify backend connectivity and login endpoint
"""

import requests
import json
import sys

# Test URLs - update if needed
TEST_URLS = [
    'http://139.59.1.59:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]

def test_health_check(base_url):
    """Test health check endpoint"""
    try:
        url = f"{base_url}/api/health"
        print(f"\n🔍 Testing: {url}")
        response = requests.get(url, timeout=5)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
        return response.status_code == 200
    except requests.exceptions.ConnectionError:
        print(f"   ❌ Connection refused - backend not running or not accessible")
        return False
    except requests.exceptions.Timeout:
        print(f"   ❌ Timeout - backend not responding")
        return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False

def test_login(base_url, username="test", password="test"):
    """Test login endpoint"""
    try:
        url = f"{base_url}/api/auth/login"
        print(f"\n🔍 Testing login: {url}")
        payload = {
            "username": username,
            "password": password
        }
        response = requests.post(url, json=payload, timeout=5)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print(f"   ✅ Login endpoint is working!")
            return True
        elif response.status_code == 401:
            print(f"   ⚠️  Login endpoint works but credentials are invalid (expected)")
            return True
        else:
            print(f"   ❌ Unexpected status code")
            return False
    except requests.exceptions.ConnectionError:
        print(f"   ❌ Connection refused - backend not running or not accessible")
        return False
    except requests.exceptions.Timeout:
        print(f"   ❌ Timeout - backend not responding")
        return False
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False

def main():
    print("=" * 60)
    print("Backend Connectivity Test")
    print("=" * 60)
    
    working_urls = []
    
    for base_url in TEST_URLS:
        print(f"\n📡 Testing: {base_url}")
        print("-" * 60)
        
        # Test health check
        health_ok = test_health_check(base_url)
        
        if health_ok:
            # Test login endpoint
            login_ok = test_login(base_url)
            if login_ok:
                working_urls.append(base_url)
        else:
            print(f"   ⚠️  Skipping login test - health check failed")
    
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    
    if working_urls:
        print(f"\n✅ Working URLs:")
        for url in working_urls:
            print(f"   - {url}")
        print(f"\n💡 Update your config.js to use one of these URLs:")
        print(f"   API_BASE_URL: '{working_urls[0]}'")
    else:
        print("\n❌ No working URLs found!")
        print("\nTroubleshooting:")
        print("1. Make sure backend is running: python -u backend_script.py")
        print("2. Check if port 3000 is open: netstat -tlnp | grep 3000")
        print("3. Check firewall: ufw status")
        print("4. If running on server, verify it's accessible from network")
        sys.exit(1)

if __name__ == '__main__':
    main()

