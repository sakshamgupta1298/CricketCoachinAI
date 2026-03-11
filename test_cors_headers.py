#!/usr/bin/env python3
"""
Test CORS Headers and Mobile App Connectivity
This script tests the backend with mobile app-like requests
"""

import requests
import json

def test_cors_headers():
    """Test CORS headers with mobile app-like requests"""
    base_url = "https://165.232.184.91:3000"
    
    print("🔍 Testing CORS Headers and Mobile App Connectivity")
    print("=" * 60)
    
    # Test 1: Basic health check
    print("\n1️⃣ Testing basic health endpoint...")
    try:
        response = requests.get(f"{base_url}/api/health")
        print(f"✅ Status: {response.status_code}")
        print(f"📊 Headers: {dict(response.headers)}")
        print(f"📄 Response: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 2: OPTIONS request (preflight)
    print("\n2️⃣ Testing OPTIONS request (preflight)...")
    try:
        headers = {
            'Origin': 'https://example.com',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type,Authorization'
        }
        response = requests.options(f"{base_url}/api/auth/register", headers=headers)
        print(f"✅ Status: {response.status_code}")
        print(f"📊 CORS Headers:")
        for header, value in response.headers.items():
            if 'access-control' in header.lower():
                print(f"   {header}: {value}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 3: Register endpoint with mobile-like headers
    print("\n3️⃣ Testing register endpoint with mobile-like headers...")
    try:
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'CrickCoach/1.0 (React Native)',
            'Origin': 'https://example.com'
        }
        data = {
            'username': 'test_user_cors',
            'email': 'test_cors@example.com',
            'password': 'testpass123'
        }
        response = requests.post(f"{base_url}/api/auth/register", 
                               headers=headers, 
                               json=data)
        print(f"✅ Status: {response.status_code}")
        print(f"📊 Response Headers:")
        for header, value in response.headers.items():
            if 'access-control' in header.lower():
                print(f"   {header}: {value}")
        print(f"📄 Response: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 4: Login endpoint
    print("\n4️⃣ Testing login endpoint...")
    try:
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'CrickCoach/1.0 (React Native)'
        }
        data = {
            'username': 'test_user_cors',
            'password': 'testpass123'
        }
        response = requests.post(f"{base_url}/api/auth/login", 
                               headers=headers, 
                               json=data)
        print(f"✅ Status: {response.status_code}")
        print(f"📊 CORS Headers:")
        for header, value in response.headers.items():
            if 'access-control' in header.lower():
                print(f"   {header}: {value}")
        print(f"📄 Response: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 5: Test with fetch-like headers
    print("\n5️⃣ Testing with fetch-like headers...")
    try:
        headers = {
            'Content-Type': 'application/json',
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'User-Agent': 'CrickCoach/1.0'
        }
        response = requests.get(f"{base_url}/api/health", headers=headers)
        print(f"✅ Status: {response.status_code}")
        print(f"📊 All Headers: {dict(response.headers)}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_cors_headers()
