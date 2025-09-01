#!/usr/bin/env python3
"""
Comprehensive test file for Reports API endpoints
Tests all report types, data aggregation, and export functionality
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

class TestReportsAPI:
    """Test class for Reports API endpoints"""
    
    def __init__(self):
        self.access_token = None
        self.test_user = {
            "username": "admin",
            "password": "admin123"
        }
        self.test_site_id = None
    
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
    
    async def get_test_site_id(self):
        """Get a test site ID for filtering reports"""
        if not self.access_token:
            return None
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                
                response = await client.get(
                    f"{API_BASE}/sites",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data and len(data) > 0:
                        self.test_site_id = data[0].get("id")
                        print(f"✅ Got test site ID: {self.test_site_id}")
                        return True
                
                print("ℹ️  No sites available for testing")
                return False
                    
        except Exception as e:
            print(f"❌ Error getting site ID: {e}")
            return False
    
    async def test_get_overview_report(self):
        """Test getting overview report"""
        if not self.access_token:
            print("ℹ️  Overview report test skipped - no access token")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                
                params = {}
                if self.test_site_id:
                    params["site_id"] = self.test_site_id
                
                response = await client.get(
                    f"{API_BASE}/reports/overview",
                    headers=headers,
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Overview report successful: {response.status_code}")
                    print(f"   Total Alerts: {data.get('totalAlerts', 'N/A')}")
                    print(f"   Total Violations: {data.get('totalViolations', 'N/A')}")
                    print(f"   Safety Score: {data.get('safetyScore', 'N/A')}")
                    return True
                else:
                    print(f"❌ Overview report failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Overview report test failed: {e}")
            return False
    
    async def test_get_violations_report(self):
        """Test getting violations report"""
        if not self.access_token:
            print("ℹ️  Violations report test skipped - no access token")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                
                params = {
                    "start_date": (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d"),
                    "end_date": datetime.now().strftime("%Y-%m-%d")
                }
                if self.test_site_id:
                    params["site_id"] = self.test_site_id
                
                response = await client.get(
                    f"{API_BASE}/reports/violations",
                    headers=headers,
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Violations report successful: {response.status_code}")
                    print(f"   Total Violations: {data.get('totalViolations', 'N/A')}")
                    print(f"   Violation Types: {len(data.get('violationTypes', []))}")
                    return True
                else:
                    print(f"❌ Violations report failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Violations report test failed: {e}")
            return False
    
    async def test_get_cameras_report(self):
        """Test getting cameras performance report"""
        if not self.access_token:
            print("ℹ️  Cameras report test skipped - no access token")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                
                params = {}
                if self.test_site_id:
                    params["site_id"] = self.test_site_id
                
                response = await client.get(
                    f"{API_BASE}/reports/cameras",
                    headers=headers,
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Cameras report successful: {response.status_code}")
                    print(f"   Total Cameras: {data.get('totalCameras', 'N/A')}")
                    print(f"   Average Uptime: {data.get('averageUptime', 'N/A')}%")
                    return True
                else:
                    print(f"❌ Cameras report failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Cameras report test failed: {e}")
            return False
    
    async def test_get_trends_report(self):
        """Test getting trends report"""
        if not self.access_token:
            print("ℹ️  Trends report test skipped - no access token")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                
                params = {
                    "period": "weekly",
                    "start_date": (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d"),
                    "end_date": datetime.now().strftime("%Y-%m-%d")
                }
                if self.test_site_id:
                    params["site_id"] = self.test_site_id
                
                response = await client.get(
                    f"{API_BASE}/reports/trends",
                    headers=headers,
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Trends report successful: {response.status_code}")
                    print(f"   Period: {data.get('period', 'N/A')}")
                    print(f"   Data Points: {len(data.get('data', []))}")
                    return True
                else:
                    print(f"❌ Trends report failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Trends report test failed: {e}")
            return False
    
    async def test_export_report_csv(self):
        """Test exporting report as CSV"""
        if not self.access_token:
            print("ℹ️  CSV export test skipped - no access token")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                
                params = {
                    "format": "csv",
                    "report_type": "overview"
                }
                if self.test_site_id:
                    params["site_id"] = self.test_site_id
                
                response = await client.get(
                    f"{API_BASE}/reports/export",
                    headers=headers,
                    params=params
                )
                
                if response.status_code == 200:
                    content_type = response.headers.get("content-type", "")
                    if "text/csv" in content_type or "application/csv" in content_type:
                        print(f"✅ CSV export successful: {response.status_code}")
                        print(f"   Content-Type: {content_type}")
                        print(f"   File Size: {len(response.content)} bytes")
                        return True
                    else:
                        print(f"❌ CSV export failed - wrong content type: {content_type}")
                        return False
                else:
                    print(f"❌ CSV export failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ CSV export test failed: {e}")
            return False
    
    async def test_export_report_json(self):
        """Test exporting report as JSON"""
        if not self.access_token:
            print("ℹ️  JSON export test skipped - no access token")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                
                params = {
                    "format": "json",
                    "report_type": "overview"
                }
                if self.test_site_id:
                    params["site_id"] = self.test_site_id
                
                response = await client.get(
                    f"{API_BASE}/reports/export",
                    headers=headers,
                    params=params
                )
                
                if response.status_code == 200:
                    content_type = response.headers.get("content-type", "")
                    if "application/json" in content_type:
                        print(f"✅ JSON export successful: {response.status_code}")
                        print(f"   Content-Type: {content_type}")
                        print(f"   File Size: {len(response.content)} bytes")
                        return True
                    else:
                        print(f"❌ JSON export failed - wrong content type: {content_type}")
                        return False
                else:
                    print(f"❌ JSON export failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ JSON export test failed: {e}")
            return False
    
    async def test_get_report_templates(self):
        """Test getting report templates"""
        if not self.access_token:
            print("ℹ️  Report templates test skipped - no access token")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                
                response = await client.get(
                    f"{API_BASE}/reports/templates",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ Report templates successful: {response.status_code}")
                    print(f"   Available Templates: {len(data.get('templates', []))}")
                    return True
                else:
                    print(f"❌ Report templates failed: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Report templates test failed: {e}")
            return False
    
    async def test_reports_unauthorized_access(self):
        """Test accessing reports without authentication"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{API_BASE}/reports/overview")
                
                if response.status_code == 401:
                    print(f"✅ Unauthorized reports access handled correctly: {response.status_code}")
                    return True
                else:
                    print(f"❌ Unauthorized reports access not handled correctly: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"❌ Unauthorized reports test failed: {e}")
            return False
    
    async def test_reports_invalid_parameters(self):
        """Test reports with invalid parameters"""
        if not self.access_token:
            print("ℹ️  Invalid parameters test skipped - no access token")
            return True
            
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                
                # Test with invalid date format
                params = {
                    "start_date": "invalid-date",
                    "end_date": "invalid-date"
                }
                
                response = await client.get(
                    f"{API_BASE}/reports/violations",
                    headers=headers,
                    params=params
                )
                
                if response.status_code in [400, 422]:  # Bad request or validation error
                    print(f"✅ Invalid parameters handled correctly: {response.status_code}")
                    return True
                else:
                    print(f"❌ Invalid parameters not handled correctly: {response.status_code}")
                    return False
                    
        except Exception as e:
            print(f"❌ Invalid parameters test failed: {e}")
            return False
    
    async def run_all_tests(self):
        """Run all reports API tests"""
        print("🚀 Starting Reports API Tests...")
        print("=" * 50)
        
        # First authenticate
        print("\n🔐 Authenticating user...")
        if not await self.authenticate_user():
            print("❌ Authentication failed, skipping dependent tests")
            return False
        
        # Get test site ID
        print("\n🏗️  Getting test site ID...")
        await self.get_test_site_id()
        
        tests = [
            ("Get Overview Report", self.test_get_overview_report),
            ("Get Violations Report", self.test_get_violations_report),
            ("Get Cameras Report", self.test_get_cameras_report),
            ("Get Trends Report", self.test_get_trends_report),
            ("Export Report CSV", self.test_export_report_csv),
            ("Export Report JSON", self.test_export_report_json),
            ("Get Report Templates", self.test_get_report_templates),
            ("Reports Unauthorized Access", self.test_reports_unauthorized_access),
            ("Reports Invalid Parameters", self.test_reports_invalid_parameters),
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
    tester = TestReportsAPI()
    success = await tester.run_all_tests()
    
    if success:
        print("\n🎯 Reports API is working correctly!")
        return 0
    else:
        print("\n🚨 Reports API has issues that need attention!")
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
