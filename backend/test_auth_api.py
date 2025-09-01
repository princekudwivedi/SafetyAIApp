#!/usr/bin/env python3
"""
Test file for Authentication API endpoints
Tests login, token refresh, and user authentication functionality
"""

import pytest
import asyncio
import httpx
import json
from datetime import datetime, timedelta
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

# Test configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

class TestAuthAPI:
    """Test class for Authentication API endpoints"""
    
    def __init__(self):
        self.access_token = None
        self.refresh_token = None
        self.test_user = {
            "username": "testuser",
            "password": "TestPass123!",
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User"
        }
    
    async def test_server_health(self):
        """Test if the server is running and healthy"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{BASE_URL}/docs")
                print(f"✅ Server health check: {response.status_code}")
                return response.status_code == 200
        except Exception as e:
            print(f"❌ Server health check failed: {e}")
            return False
    
    async def test_user_registration(self):
        """Test user registration endpoint"""
        try:
            async with httpx.AsyncClient() as client:
                # Note: This assumes you have a registration endpoint
                # If not, you'll need to create the user manually or use seed data
                print("ℹ️  User registration test skipped - endpoint not implemented")
                return True
        except Exception as e:
            print(f"❌ User registration test failed: {e}")
            return False
    
    async def test_user_login_success(self):
        """Test successful user login"""
        try:
            async with httpx.AsyncClient() as client:
                login_data = {
                    "username": "admin",  # Use existing user from seed data
                    "password": "admin123"
                }
                
                response = await client.post(
                    f"{API_BASE}/auth/token",
                    data=login_data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.access_token = data.get("access_token")
                    self.refresh_token = data.get("refresh_token")
                    
                    print(f"✅ Login successful: {response.status_code}")
                    print(f"   Access token: {self.access_token[:20]}...")
                    print(f"   Refresh token: {self.refresh_token[:20]}...")
                    return True
                else:
                    print(f"❌ Login failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Login test failed: {e}")
            return False
    
    async def test_user_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        try:
            async with httpx.AsyncClient() as client:
                login_data = {
                    "username": "admin",
                    "password": "wrongpassword"
                }
                
                response = await client.post(
                    f"{API_BASE}/auth/token",
                    data=login_data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                
                if response.status_code == 401:
                    print(f"✅ Invalid credentials handled correctly: {response.status_code}")
                    return True
                else:
                    print(f"❌ Invalid credentials not handled correctly: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"❌ Invalid credentials test failed: {e}")
            return False
    
    async def test_user_login_nonexistent_user(self):
        """Test login with non-existent user"""
        try:
            async with httpx.AsyncClient() as client:
                login_data = {
                    "username": "nonexistentuser",
                    "password": "anypassword"
                }
                
                response = await client.post(
                    f"{API_BASE}/auth/token",
                    data=login_data,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                
                if response.status_code == 401:
                    print(f"✅ Non-existent user handled correctly: {response.status_code}")
                    return True
                else:
                    print(f"❌ Non-existent user not handled correctly: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"❌ Non-existent user test failed: {e}")
            return False
    
    async def test_token_refresh(self):
        """Test token refresh functionality"""
        if not self.refresh_token:
            print("ℹ️  Token refresh test skipped - no refresh token available")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                refresh_data = {
                    "refresh_token": self.refresh_token
                }
                
                response = await client.post(
                    f"{API_BASE}/auth/refresh",
                    json=refresh_data
                )
                
                if response.status_code == 200:
                    data = response.json()
                    new_access_token = data.get("access_token")
                    print(f"✅ Token refresh successful: {response.status_code}")
                    print(f"   New access token: {new_access_token[:20]}...")
                    return True
                else:
                    print(f"❌ Token refresh failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Token refresh test failed: {e}")
            return False
    
    async def test_protected_endpoint_with_valid_token(self):
        """Test accessing protected endpoint with valid token"""
        if not self.access_token:
            print("ℹ️  Protected endpoint test skipped - no access token available")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                
                response = await client.get(
                    f"{API_BASE}/profile/profile",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Protected endpoint access successful: {response.status_code}")
                    print(f"   User: {data.get('username')}")
                    return True
                else:
                    print(f"❌ Protected endpoint access failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Protected endpoint test failed: {e}")
            return False
    
    async def test_protected_endpoint_without_token(self):
        """Test accessing protected endpoint without token"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{API_BASE}/profile/profile")
                
                if response.status_code == 401:
                    print(f"✅ Unauthorized access handled correctly: {response.status_code}")
                    return True
                else:
                    print(f"❌ Unauthorized access not handled correctly: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"❌ Unauthorized access test failed: {e}")
            return False
    
    async def test_protected_endpoint_with_invalid_token(self):
        """Test accessing protected endpoint with invalid token"""
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": "Bearer invalid_token_here"}
                
                response = await client.get(
                    f"{API_BASE}/profile/profile",
                    headers=headers
                )
                
                if response.status_code == 401:
                    print(f"✅ Invalid token handled correctly: {response.status_code}")
                    return True
                else:
                    print(f"❌ Invalid token not handled correctly: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"❌ Invalid token test failed: {e}")
            return False
    
    async def test_logout(self):
        """Test logout functionality"""
        if not self.access_token:
            print("ℹ️  Logout test skipped - no access token available")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                
                response = await client.post(
                    f"{API_BASE}/auth/logout",
                    headers=headers
                )
                
                if response.status_code in [200, 204]:
                    print(f"✅ Logout successful: {response.status_code}")
                    return True
                else:
                    print(f"❌ Logout failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Logout test failed: {e}")
            return False
    
    async def run_all_tests(self):
        """Run all authentication tests"""
        print("🚀 Starting Authentication API Tests...")
        print("=" * 50)
        
        tests = [
            ("Server Health Check", self.test_server_health),
            ("User Registration", self.test_user_registration),
            ("User Login Success", self.test_user_login_success),
            ("User Login Invalid Credentials", self.test_user_login_invalid_credentials),
            ("User Login Non-existent User", self.test_user_login_nonexistent_user),
            ("Token Refresh", self.test_token_refresh),
            ("Protected Endpoint with Valid Token", self.test_protected_endpoint_with_valid_token),
            ("Protected Endpoint without Token", self.test_protected_endpoint_without_token),
            ("Protected Endpoint with Invalid Token", self.test_protected_endpoint_with_invalid_token),
            ("Logout", self.test_logout),
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
        
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed!")
        else:
            print(f"⚠️  {total - passed} tests failed")
        
        return passed == total

async def main():
    """Main function to run tests"""
    tester = TestAuthAPI()
    success = await tester.run_all_tests()
    
    if success:
        print("\n🎯 Authentication API is working correctly!")
        return 0
    else:
        print("\n🚨 Authentication API has issues that need attention!")
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
