#!/usr/bin/env python3
"""
Test file for Sites and Cameras API endpoints
"""

import asyncio
import httpx
import sys
import os

BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

class TestSitesCamerasAPI:
    def __init__(self):
        self.access_token = None
        self.test_user = {"username": "admin", "password": "admin123"}
    
    async def authenticate_user(self):
        try:
            async with httpx.AsyncClient() as client:
                login_data = {
                    "username": self.test_user["username"],
                    "password": self.test_user["password"]
                }
                
                response = await client.post(
                    f"{API_BASE}/auth/token",
                    data=login_data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.access_token = data.get("access_token")
                    print(f"✅ Authentication successful")
                    return True
                else:
                    print(f"❌ Authentication failed: {response.status_code}")
                    return False
        except Exception as e:
            print(f"❌ Authentication error: {e}")
            return False
    
    async def test_get_sites(self):
        if not self.access_token:
            print("ℹ️  Get sites test skipped - no access token")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                response = await client.get(f"{API_BASE}/sites", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Get sites successful: {len(data)} sites found")
                    return True
                else:
                    print(f"❌ Get sites failed: {response.status_code}")
                    return False
        except Exception as e:
            print(f"❌ Get sites test failed: {e}")
            return False
    
    async def test_get_cameras(self):
        if not self.access_token:
            print("ℹ️  Get cameras test skipped - no access token")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                response = await client.get(f"{API_BASE}/cameras", headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Get cameras successful: {len(data)} cameras found")
                    return True
                else:
                    print(f"❌ Get cameras failed: {response.status_code}")
                    return False
        except Exception as e:
            print(f"❌ Get cameras test failed: {e}")
            return False
    
    async def test_unauthorized_access(self):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{API_BASE}/sites")
                if response.status_code == 401:
                    print(f"✅ Unauthorized access handled correctly")
                    return True
                else:
                    print(f"❌ Unauthorized access not handled correctly")
                    return False
        except Exception as e:
            print(f"❌ Unauthorized access test failed: {e}")
            return False
    
    async def run_all_tests(self):
        print("🚀 Starting Sites and Cameras API Tests...")
        print("=" * 50)
        
        if not await self.authenticate_user():
            print("❌ Authentication failed, skipping dependent tests")
            return False
        
        tests = [
            ("Get Sites", self.test_get_sites),
            ("Get Cameras", self.test_get_cameras),
            ("Unauthorized Access", self.test_unauthorized_access),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n🧪 Running: {test_name}")
            try:
                result = await test_func()
                if result:
                    passed += 1
                    print(f"✅ {test_name}: PASSED")
                else:
                    print(f"❌ {test_name}: FAILED")
            except Exception as e:
                print(f"❌ {test_name}: ERROR - {e}")
        
        print(f"\n📊 Test Results: {passed}/{total} tests passed")
        return passed == total

async def main():
    tester = TestSitesCamerasAPI()
    success = await tester.run_all_tests()
    
    if success:
        print("\n🎯 Sites and Cameras API is working correctly!")
        return 0
    else:
        print("\n🚨 Sites and Cameras API has issues!")
        return 1

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n⏹️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)
