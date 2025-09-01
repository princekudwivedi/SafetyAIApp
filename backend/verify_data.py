#!/usr/bin/env python3
"""
Data verification script for Safety AI Application
Verifies that seeded data is accessible and properly structured
"""

import asyncio
import motor.motor_asyncio
from datetime import datetime
import os

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME")

async def verify_data():
    """Verify that seeded data is accessible and properly structured"""
    try:
        # Connect to MongoDB
        client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
        db = client[DATABASE_NAME]
        
        print("🔍 Verifying seeded data...")
        print("=" * 50)
        
        # Check collections
        collections = await db.list_collection_names()
        print(f"📚 Collections found: {collections}")
        print()
        
        # Verify sites
        sites = await db.sites.find({}).to_list(length=10)
        print(f"🏗️  Sites ({len(sites)}):")
        for site in sites:
            print(f"  - {site['site_name']} ({site['site_id']}) - {site['location']}")
        print()
        
        # Verify cameras
        cameras = await db.cameras.find({}).to_list(length=10)
        print(f"📹 Cameras ({len(cameras)}):")
        for camera in cameras:
            print(f"  - {camera['camera_name']} ({camera['camera_id']}) - {camera['status']}")
        print()
        
        # Verify users (without passwords)
        users = await db.users.find({}, {"password_hash": 0}).to_list(length=10)
        print(f"👥 Users ({len(users)}):")
        for user in users:
            print(f"  - {user['username']} ({user['role']}) - {user['full_name']}")
        print()
        
        # Verify zones
        zones = await db.zones.find({}).to_list(length=10)
        print(f"🚧 Zones ({len(zones)}):")
        for zone in zones:
            print(f"  - {zone['zone_name']} ({zone['zone_type']}) - {zone['status']}")
        print()
        
        # Verify safety rules
        rules = await db.safety_rules.find({}).to_list(length=10)
        print(f"📋 Safety Rules ({len(rules)}):")
        for rule in rules:
            print(f"  - {rule['rule_name']} ({rule['severity_level']}) - {rule['violation_type']}")
        print()
        
        # Verify alerts
        alert_count = await db.alerts.count_documents({})
        recent_alerts = await db.alerts.find({}).sort("timestamp", -1).limit(5).to_list(length=5)
        print(f"🚨 Alerts ({alert_count} total):")
        for alert in recent_alerts:
            print(f"  - {alert['violation_type']} ({alert['severity_level']}) - {alert['status']}")
        print()
        
        # Verify statistics
        stats_count = await db.statistics.count_documents({})
        print(f"📊 Statistics ({stats_count} records)")
        print()
        
        # Test some queries
        print("🧪 Testing queries...")
        
        # Test dashboard stats query
        try:
            from app.api.v1.endpoints.stats import get_dashboard_stats
            from app.core.database import get_database
            
            # Mock the database dependency
            async def mock_get_db():
                return db
            
            # Test the dashboard stats function
            dashboard_data = await get_dashboard_stats(db)
            print(f"✅ Dashboard stats query successful - {dashboard_data['total_alerts']} total alerts")
        except Exception as e:
            print(f"❌ Dashboard stats query failed: {e}")
        
        # Test alerts query
        try:
            from app.api.v1.endpoints.alerts import get_alerts
            from app.models.user import User, UserRole
            
            # Mock user for testing
            mock_user = User(
                username="test",
                email="test@test.com",
                role=UserRole.ADMINISTRATOR
            )
            
            # Test the alerts function
            alerts_data = await get_alerts(db=db, current_user=mock_user)
            print(f"✅ Alerts query successful - {len(alerts_data)} alerts returned")
        except Exception as e:
            print(f"❌ Alerts query failed: {e}")
        
        print()
        print("🎉 Data verification completed!")
        
    except Exception as e:
        print(f"❌ Error during verification: {e}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    print("Starting data verification...")
    asyncio.run(verify_data())
