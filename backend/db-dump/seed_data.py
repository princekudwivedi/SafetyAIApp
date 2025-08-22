#!/usr/bin/env python3
"""
Seed data script for Safety AI Application
Populates MongoDB with dummy data for development and testing
"""

import asyncio
import motor.motor_asyncio
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import random
import json
import hashlib

# MongoDB connection
MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "safety_ai_db"

# Helper function to hash passwords
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.hash(password)

# Sample data
SITES_DATA = [
    {
        "site_id": "SITE_001",
        "site_name": "Downtown Construction Project",
        "location": "123 Main Street, Downtown",
        "contact_person": "John Smith",
        "contact_email": "john.smith@construction.com",
        "contact_phone": "+1-555-0101",
        "is_active": True
    },
    {
        "site_id": "SITE_002",
        "site_name": "Highway Bridge Construction",
        "location": "456 Highway 101, Suburbia",
        "contact_person": "Sarah Johnson",
        "contact_email": "sarah.johnson@bridge.com",
        "contact_phone": "+1-555-0102",
        "is_active": True
    },
    {
        "site_id": "SITE_003",
        "site_name": "Shopping Mall Renovation",
        "location": "789 Commerce Blvd, Retail District",
        "contact_person": "Mike Davis",
        "contact_email": "mike.davis@mall.com",
        "contact_phone": "+1-555-0103",
        "is_active": True
    }
]

CAMERAS_DATA = [
    {
        "camera_id": "CAM_001",
        "site_id": "SITE_001",
        "camera_name": "Main Entrance Camera",
        "stream_url": "rtsp://rtsp-test-server.viomic.com:554/stream",
        "status": "Active",
        "installation_date": datetime.now(timezone.utc) - timedelta(days=90),
        "settings": {
            "resolution": "1920x1080",
            "fps": 30,
            "bitrate": "4000k",
            "night_vision": True,
            "motion_detection": True
        },
        "location_description": "Main entrance monitoring construction site access"
    },
    {
        "camera_id": "CAM_002",
        "site_id": "SITE_001",
        "camera_name": "Construction Zone A",
        "stream_url": "rtsp://rtsp-test-server.viomic.com:554/stream",
        "status": "Active",
        "installation_date": datetime.now(timezone.utc) - timedelta(days=75),
        "settings": {
            "resolution": "1920x1080",
            "fps": 30,
            "bitrate": "4000k",
            "night_vision": True,
            "motion_detection": True
        },
        "location_description": "Zone A - Foundation work area monitoring"
    },
    {
        "camera_id": "CAM_003",
        "site_id": "SITE_001",
        "camera_name": "Construction Zone B",
        "stream_url": "rtsp://rtsp-test-server.viomic.com:554/stream",
        "status": "Active",
        "installation_date": datetime.now(timezone.utc) - timedelta(days=60),
        "settings": {
            "resolution": "1920x1080",
            "fps": 30,
            "bitrate": "4000k",
            "night_vision": True,
            "motion_detection": True
        },
        "location_description": "Zone B - Structural work area monitoring"
    },
    {
        "camera_id": "CAM_004",
        "site_id": "SITE_002",
        "camera_name": "Bridge Foundation",
        "stream_url": "rtsp://rtsp-test-server.viomic.com:554/stream",
        "status": "Active",
        "installation_date": datetime.now(timezone.utc) - timedelta(days=45),
        "settings": {
            "resolution": "1920x1080",
            "fps": 30,
            "bitrate": "4000k",
            "night_vision": True,
            "motion_detection": True
        },
        "location_description": "Bridge foundation excavation and construction monitoring"
    },
    {
        "camera_id": "CAM_005",
        "site_id": "SITE_003",
        "camera_name": "Mall Entrance",
        "stream_url": "rtsp://rtsp-test-server.viomic.com:554/stream",
        "status": "Active",
        "installation_date": datetime.now(timezone.utc) - timedelta(days=30),
        "settings": {
            "resolution": "1920x1080",
            "fps": 30,
            "bitrate": "4000k",
            "night_vision": True,
            "motion_detection": True
        },
        "location_description": "Mall entrance renovation monitoring"
    }
]

USERS_DATA = [
    {
        "username": "admin",
        "email": "admin@safetyai.com",
        "full_name": "System Administrator",
        "role": "Administrator",
        "password_hash": hash_password("admin123"),
        "is_active": True,
        "permissions": ["read", "write", "delete", "admin"],
        "site_id": None  # Admin can access all sites
    },
    {
        "username": "supervisor",
        "email": "supervisor@safetyai.com",
        "full_name": "Site Supervisor",
        "role": "Supervisor",
        "password_hash": hash_password("supervisor123"),
        "is_active": True,
        "permissions": ["read", "write"],
        "site_id": "SITE_001"
    },
    {
        "username": "safety_officer",
        "email": "safety@safetyai.com",
        "full_name": "Safety Officer",
        "role": "SafetyOfficer",
        "password_hash": hash_password("safety123"),
        "is_active": True,
        "permissions": ["read", "write"],
        "site_id": "SITE_001"
    },
    {
        "username": "operator",
        "email": "operator@safetyai.com",
        "full_name": "System Operator",
        "role": "Operator",
        "password_hash": hash_password("operator123"),
        "is_active": True,
        "permissions": ["read"],
        "site_id": "SITE_002"
    }
]

ZONES_DATA = [
    {
        "zone_id": "ZONE_001",
        "zone_name": "Foundation Work Area",
        "zone_type": "DANGER",
        "site_id": "SITE_001",
        "description": "High-risk foundation excavation and construction zone",
        "status": "ACTIVE",
        "coordinates": [[100, 100], [300, 100], [300, 300], [100, 300]],
        "center_point": [200, 200],
        "radius": None,
        "max_occupancy": 15,
        "restricted_roles": ["Operator"],
        "safety_rules": ["RULE_001", "RULE_002"]
    },
    {
        "zone_id": "ZONE_002",
        "zone_name": "Structural Assembly Area",
        "zone_type": "WORK",
        "site_id": "SITE_001",
        "description": "Steel structure assembly and welding zone",
        "status": "ACTIVE",
        "coordinates": [[350, 100], [550, 100], [550, 300], [350, 300]],
        "center_point": [450, 200],
        "radius": None,
        "max_occupancy": 20,
        "restricted_roles": [],
        "safety_rules": ["RULE_003", "RULE_004"]
    },
    {
        "zone_id": "ZONE_003",
        "zone_name": "Equipment Storage",
        "zone_type": "STORAGE",
        "site_id": "SITE_001",
        "description": "Heavy equipment and machinery storage area",
        "status": "ACTIVE",
        "coordinates": [[100, 350], [300, 350], [300, 450], [100, 450]],
        "center_point": [200, 400],
        "radius": None,
        "max_occupancy": 5,
        "restricted_roles": ["Operator"],
        "safety_rules": ["RULE_005"]
    },
    {
        "zone_id": "ZONE_004",
        "zone_name": "Bridge Foundation Zone",
        "zone_type": "DANGER",
        "site_id": "SITE_002",
        "description": "Bridge foundation construction and excavation",
        "status": "ACTIVE",
        "coordinates": [[50, 50], [250, 50], [250, 250], [50, 250]],
        "center_point": [150, 150],
        "radius": None,
        "max_occupancy": 10,
        "restricted_roles": ["Operator"],
        "safety_rules": ["RULE_001", "RULE_006"]
    },
    {
        "zone_id": "ZONE_005",
        "zone_name": "Mall Entrance Zone",
        "zone_type": "ENTRANCE",
        "site_id": "SITE_003",
        "description": "Mall entrance renovation work area",
        "status": "ACTIVE",
        "coordinates": [[75, 75], [225, 75], [225, 225], [75, 225]],
        "center_point": [150, 150],
        "radius": None,
        "max_occupancy": 8,
        "restricted_roles": [],
        "safety_rules": ["RULE_007"]
    }
]

SAFETY_RULES_DATA = [
    {
        "rule_id": "RULE_001",
        "rule_name": "Hard Hat Requirement",
        "violation_type": "No Hard Hat",
        "description": "All personnel must wear approved hard hats in construction zones",
        "is_active": True,
        "parameters": {
            "detection_confidence": 0.8,
            "min_face_visibility": 0.6
        },
        "severity_level": "High",
        "applicable_zones": ["ZONE_001", "ZONE_002", "ZONE_004"]
    },
    {
        "rule_id": "RULE_002",
        "rule_name": "Safety Vest Requirement",
        "violation_type": "No Safety Vest",
        "description": "High-visibility safety vests mandatory in all work areas",
        "is_active": True,
        "parameters": {
            "detection_confidence": 0.75,
            "min_visibility": 0.7
        },
        "severity_level": "Medium",
        "applicable_zones": ["ZONE_001", "ZONE_002", "ZONE_003", "ZONE_004", "ZONE_005"]
    },
    {
        "rule_id": "RULE_003",
        "rule_name": "Safety Goggles in Welding Areas",
        "violation_type": "No Safety Goggles",
        "description": "Eye protection required in welding and cutting operations",
        "is_active": True,
        "parameters": {
            "detection_confidence": 0.85,
            "welding_detection": True
        },
        "severity_level": "High",
        "applicable_zones": ["ZONE_002"]
    },
    {
        "rule_id": "RULE_004",
        "rule_name": "Fall Protection in Elevated Areas",
        "violation_type": "No Fall Protection",
        "description": "Harness and fall protection required above 6 feet",
        "is_active": True,
        "parameters": {
            "detection_confidence": 0.8,
            "height_threshold": 6.0
        },
        "severity_level": "High",
        "applicable_zones": ["ZONE_002", "ZONE_004"]
    },
    {
        "rule_id": "RULE_005",
        "rule_name": "Equipment Zone Access Control",
        "violation_type": "Unsafe Proximity",
        "description": "Maintain safe distance from heavy equipment",
        "is_active": True,
        "parameters": {
            "detection_confidence": 0.7,
            "min_distance": 3.0
        },
        "severity_level": "Medium",
        "applicable_zones": ["ZONE_003"]
    },
    {
        "rule_id": "RULE_006",
        "rule_name": "Excavation Safety",
        "violation_type": "Unsafe Proximity",
        "description": "Maintain safe distance from excavation edges",
        "is_active": True,
        "parameters": {
            "detection_confidence": 0.75,
            "min_distance": 2.0
        },
        "severity_level": "High",
        "applicable_zones": ["ZONE_001", "ZONE_004"]
    },
    {
        "rule_id": "RULE_007",
        "rule_name": "Public Area Safety",
        "violation_type": "Blocked Exit",
        "description": "Ensure emergency exits remain unobstructed",
        "is_active": True,
        "parameters": {
            "detection_confidence": 0.8,
            "exit_clearance": 1.0
        },
        "severity_level": "Medium",
        "applicable_zones": ["ZONE_005"]
    }
]

# Generate alerts data
def generate_alerts_data():
    """Generate realistic alert data for the past 30 days"""
    alerts = []
    violation_types = [
        "No Hard Hat", "No Safety Vest", "No Safety Goggles", 
        "No Safety Gloves", "No Fall Protection", "Unsafe Proximity",
        "Blocked Exit", "Fire Hazard", "Spill", "Unattended Object"
    ]
    severity_levels = ["High", "Medium", "Low"]
    statuses = ["New", "In Progress", "Resolved", "Dismissed"]
    
    for i in range(150):  # Generate 150 alerts
        # Random date within last 30 days
        days_ago = random.randint(0, 30)
        hours_ago = random.randint(0, 23)
        minutes_ago = random.randint(0, 59)
        
        timestamp = datetime.now(timezone.utc) - timedelta(
            days=days_ago, hours=hours_ago, minutes=minutes_ago
        )
        
        camera = random.choice(CAMERAS_DATA)
        violation_type = random.choice(violation_types)
        severity = random.choice(severity_levels)
        status = random.choice(statuses)
        
        # Generate bounding box coordinates
        x1 = random.randint(100, 800)
        y1 = random.randint(100, 600)
        x2 = x1 + random.randint(50, 200)
        y2 = y1 + random.randint(50, 200)
        
        alert = {
            "alert_id": f"AL-{timestamp.strftime('%Y%m%d')}-{random.randint(1000, 9999)}",
            "timestamp": timestamp,
            "violation_type": violation_type,
            "severity_level": severity,
            "description": f"{violation_type} detected in {camera['location_description']}",
            "confidence_score": round(random.uniform(0.7, 0.98), 2),
            "location_id": camera["site_id"],
            "camera_id": camera["camera_id"],
            "primary_object": {
                "object_type": "Worker",
                "object_id": f"OBJ_{random.randint(1000, 9999)}",
                "bounding_box": [x1, y1, x2, y2],
                "confidence": round(random.uniform(0.8, 0.95), 2)
            },
            "snapshot_url": f"/snapshots/{camera['camera_id']}/{timestamp.strftime('%Y%m%d_%H%M%S')}.jpg",
            "status": status,
            "assigned_to": random.choice(USERS_DATA)["username"] if status in ["In Progress", "Resolved"] else None,
            "resolution_notes": f"Alert {status.lower()} by safety team" if status in ["Resolved", "Dismissed"] else None
        }
        alerts.append(alert)
    
    return alerts

# Generate statistics data
def generate_stats_data():
    """Generate statistics data for the past 8 weeks"""
    stats = []
    
    for week in range(8):
        week_start = datetime.now(timezone.utc) - timedelta(weeks=7-week)
        week_end = week_start + timedelta(days=7)
        
        # Generate realistic weekly stats
        total_violations = random.randint(20, 80)
        total_alerts = random.randint(25, 90)
        safety_score = random.randint(75, 95)
        
        # Calculate daily breakdown
        daily_violations = []
        daily_alerts = []
        
        for day in range(7):
            day_violations = random.randint(2, 15)
            day_alerts = random.randint(3, 18)
            daily_violations.append(day_violations)
            daily_alerts.append(day_alerts)
        
        week_stats = {
            "week_start": week_start,
            "week_end": week_end,
            "total_violations": total_violations,
            "total_alerts": total_alerts,
            "safety_score": safety_score,
            "daily_violations": daily_violations,
            "daily_alerts": daily_alerts,
            "violation_types": {
                "No Hard Hat": random.randint(5, 20),
                "No Safety Vest": random.randint(3, 15),
                "No Safety Goggles": random.randint(2, 10),
                "No Safety Gloves": random.randint(2, 8),
                "No Fall Protection": random.randint(1, 5),
                "Unsafe Proximity": random.randint(3, 12),
                "Blocked Exit": random.randint(1, 4),
                "Fire Hazard": random.randint(0, 2),
                "Spill": random.randint(1, 3),
                "Unattended Object": random.randint(1, 3)
            }
        }
        stats.append(week_stats)
    
    return stats

async def seed_database():
    """Seed the database with dummy data"""
    try:
        # Connect to MongoDB
        client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
        db = client[DATABASE_NAME]
        
        print("Connected to MongoDB")
        
        # Clear existing data
        print("Clearing existing data...")
        await db.sites.delete_many({})
        await db.cameras.delete_many({})
        await db.users.delete_many({})
        await db.zones.delete_many({})
        await db.safety_rules.delete_many({})
        await db.alerts.delete_many({})
        await db.statistics.delete_many({})
        
        # Insert sites
        print("Inserting sites...")
        sites_result = await db.sites.insert_many(SITES_DATA)
        print(f"Inserted {len(sites_result.inserted_ids)} sites")
        
        # Insert cameras
        print("Inserting cameras...")
        cameras_result = await db.cameras.insert_many(CAMERAS_DATA)
        print(f"Inserted {len(cameras_result.inserted_ids)} cameras")
        
        # Insert users
        print("Inserting users...")
        users_result = await db.users.insert_many(USERS_DATA)
        print(f"Inserted {len(users_result.inserted_ids)} users")
        
        # Insert zones
        print("Inserting zones...")
        zones_result = await db.zones.insert_many(ZONES_DATA)
        print(f"Inserted {len(zones_result.inserted_ids)} zones")
        
        # Insert safety rules
        print("Inserting safety rules...")
        safety_rules_result = await db.safety_rules.insert_many(SAFETY_RULES_DATA)
        print(f"Inserted {len(safety_rules_result.inserted_ids)} safety rules")
        
        # Generate and insert alerts
        print("Generating alerts...")
        alerts_data = generate_alerts_data()
        alerts_result = await db.alerts.insert_many(alerts_data)
        print(f"Inserted {len(alerts_result.inserted_ids)} alerts")
        
        # Generate and insert statistics
        print("Generating statistics...")
        stats_data = generate_stats_data()
        stats_result = await db.statistics.insert_many(stats_data)
        print(f"Inserted {len(stats_result.inserted_ids)} statistics records")
        
        # Create indexes for better performance
        print("Creating indexes...")
        try:
            await db.alerts.create_index("timestamp")
            await db.alerts.create_index("camera_id")
            await db.alerts.create_index("status")
            await db.cameras.create_index("site_id")
            await db.statistics.create_index("week_start")
            await db.zones.create_index("site_id")
            await db.safety_rules.create_index("violation_type")
            await db.users.create_index("username")
            await db.users.create_index("email")
            print("All indexes created successfully")
        except Exception as e:
            print(f"Some indexes already exist (this is normal): {e}")
            print("Continuing with seeding...")
        
        print("Database seeding completed successfully!")
        print(f"\nSummary:")
        print(f"- Sites: {len(SITES_DATA)}")
        print(f"- Cameras: {len(CAMERAS_DATA)}")
        print(f"- Users: {len(USERS_DATA)}")
        print(f"- Zones: {len(ZONES_DATA)}")
        print(f"- Safety Rules: {len(SAFETY_RULES_DATA)}")
        print(f"- Alerts: {len(alerts_data)}")
        print(f"- Statistics: {len(stats_data)}")
        
        # Print sample data for verification
        print(f"\nSample data verification:")
        site_count = await db.sites.count_documents({})
        camera_count = await db.cameras.count_documents({})
        user_count = await db.users.count_documents({})
        zone_count = await db.zones.count_documents({})
        rule_count = await db.safety_rules.count_documents({})
        alert_count = await db.alerts.count_documents({})
        print(f"- Sites in DB: {site_count}")
        print(f"- Cameras in DB: {camera_count}")
        print(f"- Users in DB: {user_count}")
        print(f"- Zones in DB: {zone_count}")
        print(f"- Safety Rules in DB: {rule_count}")
        print(f"- Alerts in DB: {alert_count}")
        
        # Print login credentials for testing
        print(f"\n🔐 Login Credentials for Testing:")
        print(f"- Admin: admin / admin123")
        print(f"- Supervisor: supervisor / supervisor123")
        print(f"- Safety Officer: safety / safety123")
        print(f"- Operator: operator / operator123")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    print("Starting database seeding...")
    asyncio.run(seed_database())
