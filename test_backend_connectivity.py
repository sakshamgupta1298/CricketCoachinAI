#!/usr/bin/env python3
"""
Test script to verify backend connectivity
Run this on your local machine to test if the backend is accessible
"""

import requests
import sys
import time

def test_backend_connectivity():
    """Test if the backend is accessible"""
    
    # Backend URL from your config
    base_url = "http://139.59.1.59:3000"
    
    print("🔍 Testing CrickCoach Backend Connectivity...")
    print(f"🌐 Target URL: {base_url}")
    print("-" * 50)
    
    # Test 1: Basic connectivity
    print("1️⃣ Testing basic connectivity...")
    try:
        response = requests.get(f"{base_url}/api/health", timeout=10)
        if response.status_code == 200:
            print("✅ Backend is accessible!")
            print(f"📊 Response: {response.json()}")
        else:
            print(f"❌ Backend responded with status: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Connection refused - Backend is not running or port is blocked")
        return False
    except requests.exceptions.Timeout:
        print("❌ Request timed out - Backend is not responding")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Test 2: Registration endpoint
    print("\n2️⃣ Testing registration endpoint...")
    try:
        test_data = {
            "username": "test_user",
            "email": "test@example.com",
            "password": "testpassword123"
        }
        response = requests.post(f"{base_url}/api/auth/register", json=test_data, timeout=10)
        print(f"📊 Registration endpoint status: {response.status_code}")
        if response.status_code in [200, 409]:  # 409 means user already exists
            print("✅ Registration endpoint is working!")
        else:
            print(f"⚠️ Registration endpoint returned: {response.status_code}")
    except Exception as e:
        print(f"❌ Registration test failed: {e}")
    
    # Test 3: Login endpoint
    print("\n3️⃣ Testing login endpoint...")
    try:
        test_data = {
            "username": "test_user",
            "password": "testpassword123"
        }
        response = requests.post(f"{base_url}/api/auth/login", json=test_data, timeout=10)
        print(f"📊 Login endpoint status: {response.status_code}")
        if response.status_code in [200, 401]:  # 401 means invalid credentials
            print("✅ Login endpoint is working!")
        else:
            print(f"⚠️ Login endpoint returned: {response.status_code}")
    except Exception as e:
        print(f"❌ Login test failed: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Backend connectivity test completed!")
    print("📱 Your mobile app should now be able to connect to the backend.")
    return True

if __name__ == "__main__":
    success = test_backend_connectivity()
    sys.exit(0 if success else 1)
