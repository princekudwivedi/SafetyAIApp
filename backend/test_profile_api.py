#!/usr/bin/env python3
"""
Test file for Profile API endpoints
Tests user profile, settings, and account security functionality
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

class TestProfileAPI:
    """Test class for Profile API endpoints"""
    
    def __init__(self):
        self.access_token = None
        self.test_user = {
            "username": "admin",
            "password": "admin123"
        }
        self.test_profile_data = {
            "first_name": "Updated",
            "last_name": "Admin",
            "email": "updated.admin@example.com"
        }
    
    async def authenticate_user(self):
        """Authenticate user and get access token"""
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
                    print(f"✅ Authentication successful: {self.access_token[:20]}...")
                    return True
                else:
                    print(f"❌ Authentication failed: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"❌ Authentication error: {e}")
            return False
    
    async def test_get_user_profile(self):
        """Test getting user profile with valid token"""
        if not self.access_token:
            print("ℹ️  Get profile test skipped - no access token")
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
                    print(f"✅ Get profile successful: {response.status_code}")
                    print(f"   Username: {data.get('username')}")
                    print(f"   Email: {data.get('email')}")
                    print(f"   Role: {data.get('role')}")
                    return True
                else:
                    print(f"❌ Get profile failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Get profile test failed: {e}")
            return False
    
    async def test_get_user_profile_unauthorized(self):
        """Test getting user profile without token"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{API_BASE}/profile/profile")
                
                if response.status_code == 401:
                    print(f"✅ Unauthorized profile access handled correctly: {response.status_code}")
                    return True
                else:
                    print(f"❌ Unauthorized profile access not handled correctly: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"❌ Unauthorized profile test failed: {e}")
            return False
    
    async def test_update_user_profile(self):
        """Test updating user profile"""
        if not self.access_token:
            print("ℹ️  Update profile test skipped - no access token")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                
                response = await client.put(
                    f"{API_BASE}/profile/profile",
                    json=self.test_profile_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Update profile successful: {response.status_code}")
                    print(f"   Updated first_name: {data.get('firstName')}")
                    print(f"   Updated last_name: {data.get('lastName')}")
                    return True
                else:
                    print(f"❌ Update profile failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Update profile test failed: {e}")
            return False
    
    async def test_update_user_profile_invalid_data(self):
        """Test updating user profile with invalid data"""
        if not self.access_token:
            print("ℹ️  Invalid profile update test skipped - no access token")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                
                # Test with invalid email format
                invalid_data = {"email": "invalid-email"}
                
                response = await client.put(
                    f"{API_BASE}/profile/profile",
                    json=invalid_data,
                    headers=headers
                )
                
                if response.status_code == 422:  # Validation error
                    print(f"✅ Invalid profile data handled correctly: {response.status_code}")
                    return True
                else:
                    print(f"❌ Invalid profile data not handled correctly: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"❌ Invalid profile data test failed: {e}")
            return False
    
    async def test_change_password(self):
        """Test changing user password"""
        if not self.access_token:
            print("ℹ️  Change password test skipped - no access token")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                
                password_data = {
                    "currentPassword": "admin123",
                    "newPassword": "NewPass123!",
                    "confirmPassword": "NewPass123!"
                }
                
                response = await client.put(
                    f"{API_BASE}/profile/password",
                    json=password_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Change password successful: {response.status_code}")
                    print(f"   Message: {data.get('message')}")
                    return True
                else:
                    print(f"❌ Change password failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Change password test failed: {e}")
            return False
    
    async def test_change_password_mismatch(self):
        """Test changing password with mismatched confirmation"""
        if not self.access_token:
            print("ℹ️  Password mismatch test skipped - no access token")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                
                password_data = {
                    "currentPassword": "admin123",
                    "newPassword": "NewPass123!",
                    "confirmPassword": "DifferentPass123!"
                }
                
                response = await client.put(
                    f"{API_BASE}/profile/password",
                    json=password_data,
                    headers=headers
                )
                
                if response.status_code == 400:  # Bad request
                    print(f"✅ Password mismatch handled correctly: {response.status_code}")
                    return True
                else:
                    print(f"❌ Password mismatch not handled correctly: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"❌ Password mismatch test failed: {e}")
            return False
    
    async def test_get_user_settings(self):
        """Test getting user settings"""
        if not self.access_token:
            print("ℹ️  Get settings test skipped - no access token")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                
                response = await client.get(
                    f"{API_BASE}/profile/settings",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Get settings successful: {response.status_code}")
                    print(f"   Notifications: {data.get('notifications')}")
                    print(f"   Preferences: {data.get('preferences')}")
                    return True
                else:
                    print(f"❌ Get settings failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Get settings test failed: {e}")
            return False
    
    async def test_update_user_settings(self):
        """Test updating user settings"""
        if not self.access_token:
            print("ℹ️  Update settings test skipped - no access token")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                
                settings_data = {
                    "notifications": {
                        "email": True,
                        "push": False,
                        "sms": False
                    },
                    "preferences": {
                        "language": "en",
                        "timezone": "UTC",
                        "theme": "light"
                    }
                }
                
                response = await client.put(
                    f"{API_BASE}/profile/settings",
                    json=settings_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Update settings successful: {response.status_code}")
                    print(f"   Message: {data.get('message')}")
                    return True
                else:
                    print(f"❌ Update settings failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Update settings test failed: {e}")
            return False
    
    async def test_get_account_security(self):
        """Test getting account security information"""
        if not self.access_token:
            print("ℹ️  Get security test skipped - no access token")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                
                response = await client.get(
                    f"{API_BASE}/profile/security",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Get security successful: {response.status_code}")
                    print(f"   Account Status: {data.get('accountStatus')}")
                    print(f"   2FA Enabled: {data.get('twoFactorAuth', {}).get('enabled')}")
                    return True
                else:
                    print(f"❌ Get security failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Get security test failed: {e}")
            return False
    
    async def test_enable_two_factor_auth(self):
        """Test enabling two-factor authentication"""
        if not self.access_token:
            print("ℹ️  Enable 2FA test skipped - no access token")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                
                response = await client.post(
                    f"{API_BASE}/profile/security/enable-2fa",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Enable 2FA successful: {response.status_code}")
                    print(f"   Message: {data.get('message')}")
                    return True
                else:
                    print(f"❌ Enable 2FA failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Enable 2FA test failed: {e}")
            return False
    
    async def test_disable_two_factor_auth(self):
        """Test disabling two-factor authentication"""
        if not self.access_token:
            print("ℹ️  Disable 2FA test skipped - no access token")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                
                response = await client.post(
                    f"{API_BASE}/profile/security/disable-2fa",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Disable 2FA successful: {response.status_code}")
                    print(f"   Message: {data.get('message')}")
                    return True
                else:
                    print(f"❌ Disable 2FA failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Disable 2FA test failed: {e}")
            return False
    
    async def run_all_tests(self):
        """Run all profile API tests"""
        print("🚀 Starting Profile API Tests...")
        print("=" * 50)
        
        # First authenticate
        print("\n🔐 Authenticating user...")
        if not await self.authenticate_user():
            print("❌ Authentication failed, skipping dependent tests")
            return False
        
        tests = [
            ("Get User Profile", self.test_get_user_profile),
            ("Get User Profile Unauthorized", self.test_get_user_profile_unauthorized),
            ("Update User Profile", self.test_update_user_profile),
            ("Update User Profile Invalid Data", self.test_update_user_profile_invalid_data),
            ("Change Password", self.test_change_password),
            ("Change Password Mismatch", self.test_change_password_mismatch),
            ("Get User Settings", self.test_get_user_settings),
            ("Update User Settings", self.test_update_user_settings),
            ("Get Account Security", self.test_get_account_security),
            ("Enable Two-Factor Auth", self.test_enable_two_factor_auth),
            ("Disable Two-Factor Auth", self.test_disable_two_factor_auth),
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
    tester = TestProfileAPI()
    success = await tester.run_all_tests()
    
    if success:
        print("\n🎯 Profile API is working correctly!")
        return 0
    else:
        print("\n🚨 Profile API has issues that need attention!")
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
