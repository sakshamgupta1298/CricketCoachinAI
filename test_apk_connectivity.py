import requests
import socket
import subprocess
import platform

def get_local_ip():
    """Get the local IP address of this machine"""
    try:
        # Connect to a remote address to determine local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return "192.168.1.3"  # Fallback

def test_backend_connectivity(ip_address, port=8000):
    """Test if backend is accessible from a specific IP"""
    try:
        url = f"http://{ip_address}:{port}/api/health"
        print(f"🔍 Testing: {url}")
        
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            print(f"✅ SUCCESS: Backend accessible at {url}")
            return True
        else:
            print(f"❌ FAILED: Status {response.status_code} at {url}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ FAILED: {e} at {url}")
        return False

def main():
    print("=== APK CONNECTIVITY DIAGNOSTIC ===")
    
    # Get local IP
    local_ip = get_local_ip()
    print(f"🌐 Local IP detected: {local_ip}")
    
    # Test different IP addresses
    test_ips = [
        local_ip,
        "192.168.1.3",
        "10.0.2.2",  # Android emulator
        "localhost",
        "127.0.0.1"
    ]
    
    print("\n🔧 Testing backend connectivity from different IPs:")
    working_ips = []
    
    for ip in test_ips:
        if test_backend_connectivity(ip):
            working_ips.append(ip)
        print()
    
    print("=== RESULTS ===")
    if working_ips:
        print(f"✅ Working IPs: {working_ips}")
        print(f"🎯 Recommended IP for APK: {working_ips[0]}")
    else:
        print("❌ No working IPs found!")
    
    print("\n=== NEXT STEPS ===")
    print("1. If the recommended IP is different from 192.168.1.3:")
    print("   - Update the APK configuration")
    print("   - Rebuild the APK with the correct IP")
    print("2. If all IPs work but APK still fails:")
    print("   - Check Android network permissions")
    print("   - Verify firewall settings")

if __name__ == "__main__":
    main() 