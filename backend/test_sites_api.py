#!/usr/bin/env python3
"""
Test script for Sites API endpoints
"""

import asyncio
import aiohttp
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

# Test credentials (you may need to adjust these based on your seed data)
TEST_CREDENTIALS = {
    "username": "admin@example.com",
    "password": "admin123"
}

async def get_auth_token(session):
    """Get authentication token"""
    auth_url = f"{API_BASE}/auth/login"
    auth_data = {
        "username": TEST_CREDENTIALS["username"],
        "password": TEST_CREDENTIALS["password"]
    }
    
    async with session.post(auth_url, json=auth_data) as response:
        if response.status == 200:
            data = await response.json()
            return data.get("access_token")
        else:
            print(f"Authentication failed: {response.status}")
            return None

async def test_get_sites(session, token):
    """Test GET /sites endpoint"""
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{API_BASE}/sites/"
    
    print("\n=== Testing GET /sites ===")
    async with session.get(url, headers=headers) as response:
        print(f"Status: {response.status}")
        if response.status == 200:
            sites = await response.json()
            print(f"Found {len(sites)} sites:")
            for site in sites:
                print(f"  - {site['site_name']} ({site['site_id']}) - Status: {site['status']}")
        else:
            print(f"Error: {await response.text()}")

async def test_get_site_by_id(session, token):
    """Test GET /sites/{site_id} endpoint"""
    headers = {"Authorization": f"Bearer {token}"}
    site_id = "SITE_001"
    url = f"{API_BASE}/sites/{site_id}"
    
    print(f"\n=== Testing GET /sites/{site_id} ===")
    async with session.get(url, headers=headers) as response:
        print(f"Status: {response.status}")
        if response.status == 200:
            site = await response.json()
            print(f"Site: {site['site_name']}")
            print(f"Location: {site['location']}")
            print(f"Contact: {site['contact_person']}")
            print(f"Status: {site['status']}")
            print(f"Cameras: {site['camera_count']}")
            print(f"Workers: {site['worker_count']}")
            print(f"Alerts: {site['active_alerts']}")
        else:
            print(f"Error: {await response.text()}")

async def test_create_site(session, token):
    """Test POST /sites endpoint"""
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{API_BASE}/sites/"
    
    new_site = {
        "site_name": "Test Construction Site",
        "location": "999 Test Street, Test City",
        "contact_person": "Test Contact",
        "contact_email": "test@example.com",
        "contact_phone": "+1-555-9999",
        "status": "active",
        "worker_count": 15
    }
    
    print("\n=== Testing POST /sites ===")
    async with session.post(url, json=new_site, headers=headers) as response:
        print(f"Status: {response.status}")
        if response.status == 200:
            site = await response.json()
            print(f"Created site: {site['site_name']} ({site['site_id']})")
            return site['site_id']
        else:
            print(f"Error: {await response.text()}")
            return None

async def test_update_site(session, token, site_id):
    """Test PUT /sites/{site_id} endpoint"""
    if not site_id:
        print("No site ID to update")
        return
        
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{API_BASE}/sites/{site_id}"
    
    update_data = {
        "worker_count": 20,
        "status": "maintenance"
    }
    
    print(f"\n=== Testing PUT /sites/{site_id} ===")
    async with session.put(url, json=update_data, headers=headers) as response:
        print(f"Status: {response.status}")
        if response.status == 200:
            site = await response.json()
            print(f"Updated site: {site['site_name']}")
            print(f"New worker count: {site['worker_count']}")
            print(f"New status: {site['status']}")
        else:
            print(f"Error: {await response.text()}")

async def test_delete_site(session, token, site_id):
    """Test DELETE /sites/{site_id} endpoint"""
    if not site_id:
        print("No site ID to delete")
        return
        
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{API_BASE}/sites/{site_id}"
    
    print(f"\n=== Testing DELETE /sites/{site_id} ===")
    async with session.delete(url, headers=headers) as response:
        print(f"Status: {response.status}")
        if response.status == 200:
            result = await response.json()
            print(f"Delete result: {result}")
        else:
            print(f"Error: {await response.text()}")

async def test_site_stats(session, token):
    """Test site statistics calculation"""
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{API_BASE}/sites/"
    
    print("\n=== Testing Site Statistics ===")
    async with session.get(url, headers=headers) as response:
        if response.status == 200:
            sites = await response.json()
            
            total_sites = len(sites)
            active_sites = len([s for s in sites if s['status'] == 'active'])
            total_workers = sum(s['worker_count'] for s in sites)
            total_cameras = sum(s['camera_count'] for s in sites)
            total_alerts = sum(s['active_alerts'] for s in sites)
            
            print(f"Total Sites: {total_sites}")
            print(f"Active Sites: {active_sites}")
            print(f"Total Workers: {total_workers}")
            print(f"Total Cameras: {total_cameras}")
            print(f"Total Alerts: {total_alerts}")

async def main():
    """Main test function"""
    print("🚀 Starting Sites API Tests")
    print(f"Testing against: {BASE_URL}")
    
    async with aiohttp.ClientSession() as session:
        # Get authentication token
        token = await get_auth_token(session)
        if not token:
            print("❌ Authentication failed. Please check credentials.")
            return
        
        print("✅ Authentication successful")
        
        # Run tests
        await test_get_sites(session, token)
        await test_get_site_by_id(session, token)
        await test_site_stats(session, token)
        
        # Test CRUD operations
        new_site_id = await test_create_site(session, token)
        if new_site_id:
            await test_update_site(session, token, new_site_id)
            # Uncomment the line below to test deletion
            # await test_delete_site(session, token, new_site_id)
        
        print("\n✅ All tests completed!")

if __name__ == "__main__":
    asyncio.run(main())
