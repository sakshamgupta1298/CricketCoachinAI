import requests
import socket
import subprocess
import platform
import time

def get_local_ip():
    """Get the local IP address of this machine"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return "192.168.1.3"

def test_backend_from_phone_perspective():
    """Test backend accessibility from phone's perspective"""
    print("=== PHONE CONNECTIVITY DIAGNOSTIC ===")
    
    local_ip = get_local_ip()
    print(f"🌐 Your computer's IP: {local_ip}")
    
    # Test 1: Check if backend is running
    print("\n🔍 Test 1: Backend Status")
    try:
        response = requests.get(f"https://{local_ip}:8000/api/health", timeout=5)
        if response.status_code == 200:
            print(f"✅ Backend is running and accessible at {local_ip}:8000")
        else:
            print(f"❌ Backend returned status {response.status_code}")
    except Exception as e:
        print(f"❌ Cannot reach backend: {e}")
        return False
    
    # Test 2: Check network connectivity
    print("\n🔍 Test 2: Network Connectivity")
    try:
        # Test if port 8000 is reachable
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((local_ip, 8000))
        sock.close()
        
        if result == 0:
            print(f"✅ Port 8000 is reachable on {local_ip}")
        else:
            print(f"❌ Port 8000 is NOT reachable on {local_ip}")
            print("   This might be a firewall issue")
    except Exception as e:
        print(f"❌ Network test failed: {e}")
    
    # Test 3: Check Windows Firewall
    print("\n🔍 Test 3: Windows Firewall Check")
    try:
        result = subprocess.run(
            ['netsh', 'advfirewall', 'firewall', 'show', 'rule', 'name=all'],
            capture_output=True, text=True, timeout=10
        )
        if '8000' in result.stdout:
            print("✅ Found firewall rules for port 8000")
        else:
            print("❌ No firewall rules found for port 8000")
            print("   This might be blocking mobile connections")
    except Exception as e:
        print(f"❌ Could not check firewall: {e}")
    
    return True

def provide_solutions():
    """Provide solutions for common connectivity issues"""
    print("\n=== SOLUTIONS TO TRY ===")
    
    print("\n1. 🔥 Windows Firewall Fix:")
    print("   Run these commands as Administrator:")
    print("   netsh advfirewall firewall add rule name=\"Cricket Coach Backend\" dir=in action=allow protocol=TCP localport=8000")
    print("   netsh advfirewall firewall add rule name=\"Cricket Coach Backend Out\" dir=out action=allow protocol=TCP localport=8000")
    
    print("\n2. 🌐 Network Configuration:")
    print("   - Make sure your phone and computer are on the same WiFi network")
    print("   - Try using your computer's actual IP address instead of 192.168.1.3")
    print("   - Check if your router blocks local network communication")
    
    print("\n3. 📱 APK Configuration:")
    print("   - Rebuild the APK with the correct IP address")
    print("   - Make sure the APK has internet permissions")
    print("   - Try using https instead of https")
    
    print("\n4. 🔧 Alternative Solutions:")
    print("   - Use ngrok to create a public tunnel")
    print("   - Deploy the backend to a cloud service")
    print("   - Use USB debugging instead of wireless")

def main():
    print("🔍 Testing if your phone can reach the backend...")
    
    if test_backend_from_phone_perspective():
        print("\n✅ Backend is accessible from your computer")
        print("❌ But your phone cannot reach it")
        print("\nThis is likely a network/firewall issue")
    else:
        print("\n❌ Backend is not accessible even from your computer")
        print("Please start the backend first")
        return
    
    provide_solutions()

if __name__ == "__main__":
    main() 