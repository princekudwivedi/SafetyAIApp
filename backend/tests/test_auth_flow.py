#!/usr/bin/env python3
"""
Test the complete authentication flow
"""

import requests
import json
import os

BASE_URL = os.getenv("API_BASE_URL")    

def test_auth_flow():
    """Test the complete authentication flow"""
    print("🧪 Testing Authentication Flow")
    print("=" * 50)
    
    # Step 1: Test login
    print("\n1️⃣ Testing login...")
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    
    try:
        login_response = requests.post(f"{BASE_URL}/api/v1/auth/login", json=login_data)
        print(f"   Login Status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            login_result = login_response.json()
            token = login_result.get("access_token")
            print(f"   ✅ Login successful, token received: {token[:20]}...")
            
            # Step 2: Test protected endpoint with token
            print("\n2️⃣ Testing protected endpoint...")
            headers = {"Authorization": f"Bearer {token}"}
            
            protected_response = requests.get(f"{BASE_URL}/api/v1/cameras/monitoring/status", headers=headers)
            print(f"   Protected Endpoint Status: {protected_response.status_code}")
            
            if protected_response.status_code == 200:
                cameras_data = protected_response.json()
                print(f"   ✅ Protected endpoint accessible, {len(cameras_data)} cameras returned")
                
                # Show first camera details
                if cameras_data:
                    first_camera = cameras_data[0]
                    print(f"   📹 First camera: {first_camera.get('name')} - {first_camera.get('status')}")
                    print(f"   🔗 Stream URL: {first_camera.get('stream_url')}")
                
            else:
                print(f"   ❌ Protected endpoint failed: {protected_response.text}")
                
        else:
            print(f"   ❌ Login failed: {login_response.text}")
            
    except Exception as e:
        print(f"   ❌ Error during test: {e}")
    
    print("\n" + "=" * 50)
    print("🏁 Authentication flow test completed")

if __name__ == "__main__":
    test_auth_flow()
