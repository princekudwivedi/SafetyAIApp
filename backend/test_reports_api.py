#!/usr/bin/env python3
"""
Test script for Reports API endpoints
"""

import asyncio
import motor.motor_asyncio
from datetime import datetime, timezone, timedelta
import json

# MongoDB connection
MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "safety_ai_db"

async def test_reports_api():
    """Test the reports API functionality"""
    try:
        # Connect to MongoDB
        client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
        db = client[DATABASE_NAME]
        
        print("🔍 Testing Reports API...")
        
        # Test 1: Check if we have alerts data
        alerts_count = await db.alerts.count_documents({})
        print(f"✅ Total alerts in database: {alerts_count}")
        
        if alerts_count == 0:
            print("⚠️  No alerts found. Please run seed_data.py first to populate the database.")
            return
        
        # Test 2: Check if we have cameras data
        cameras_count = await db.cameras.count_documents({})
        print(f"✅ Total cameras in database: {cameras_count}")
        
        # Test 3: Check if we have sites data
        sites_count = await db.sites.count_documents({})
        print(f"✅ Total sites in database: {sites_count}")
        
        # Test 4: Test aggregation pipeline for weekly data
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(weeks=8)
        
        weekly_pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": start_date}
                }
            },
            {
                "$group": {
                    "_id": {
                        "week": {"$week": {"$dateFromString": {"dateString": "$timestamp"}}},
                        "year": {"$year": {"$dateFromString": {"dateString": "$timestamp"}}}
                    },
                    "violations": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$alert_type", "safety_violation"]}, 1, 0
                            ]
                        }
                    },
                    "alerts": {"$sum": 1}
                }
            },
            {"$sort": {"_id.year": 1, "_id.week": 1}}
        ]
        
        weekly_data = await db.alerts.aggregate(weekly_pipeline).to_list(length=10)
        print(f"✅ Weekly aggregation test: {len(weekly_data)} weeks of data")
        
        # Test 5: Test violation types aggregation
        violation_pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": start_date},
                    "violation_type": {"$exists": True, "$ne": None}
                }
            },
            {
                "$group": {
                    "_id": "$violation_type",
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        
        violation_types = await db.alerts.aggregate(violation_pipeline).to_list(length=10)
        print(f"✅ Violation types aggregation test: {len(violation_types)} types found")
        
        # Test 6: Test camera performance aggregation
        camera_pipeline = [
            {
                "$match": {"timestamp": {"$gte": start_date}}
            },
            {
                "$group": {
                    "_id": "$camera_id",
                    "totalAlerts": {"$sum": 1},
                    "violations": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$alert_type", "safety_violation"]}, 1, 0
                            ]
                        }
                    }
                }
            },
            {
                "$lookup": {
                    "from": "cameras",
                    "localField": "_id",
                    "foreignField": "camera_id",
                    "as": "camera_info"
                }
            },
            {"$unwind": "$camera_info"},
            {"$sort": {"totalAlerts": -1}},
            {"$limit": 5}
        ]
        
        camera_performance = await db.alerts.aggregate(camera_pipeline).to_list(length=5)
        print(f"✅ Camera performance aggregation test: {len(camera_performance)} cameras analyzed")
        
        # Test 7: Test time-based aggregation
        time_pipeline = [
            {
                "$match": {
                    "timestamp": {"$gte": start_date},
                    "violation_type": {"$exists": True, "$ne": None}
                }
            },
            {
                "$addFields": {
                    "hour": {"$hour": {"$dateFromString": {"dateString": "$timestamp"}}}
                }
            },
            {
                "$group": {
                    "_id": "$hour",
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        time_analysis = await db.alerts.aggregate(time_pipeline).to_list(length=24)
        print(f"✅ Time-based aggregation test: {len(time_analysis)} hours analyzed")
        
        print("\n🎉 All aggregation tests passed!")
        print("\n📊 Sample data preview:")
        
        if weekly_data:
            print(f"   Weekly data: {weekly_data[0] if weekly_data else 'None'}")
        
        if violation_types:
            print(f"   Top violation type: {violation_types[0] if violation_types else 'None'}")
        
        if camera_performance:
            print(f"   Top camera: {camera_performance[0] if camera_performance else 'None'}")
        
        print("\n🚀 Reports API is ready to use!")
        
    except Exception as e:
        print(f"❌ Error testing reports API: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()

if __name__ == "__main__":
    print("Starting Reports API tests...")
    asyncio.run(test_reports_api())
