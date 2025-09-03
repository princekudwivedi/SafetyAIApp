from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    sync_client: MongoClient = None

db = Database()

async def connect_to_mongo():
    """Create database connection."""
    try:
        # Enhanced connection with SSL handling for MongoDB Atlas
        connection_kwargs = {}
        
        # If using MongoDB Atlas (mongodb+srv://), add SSL parameters
        if settings.MONGODB_URL.startswith("mongodb+srv://"):
            connection_kwargs.update({
                "tls": True,
                "tlsAllowInvalidCertificates": True,
                "tlsAllowInvalidHostnames": True,
                "retryWrites": True,
                "w": "majority",
                "serverSelectionTimeoutMS": 30000,
                "connectTimeoutMS": 30000,
                "socketTimeoutMS": 30000
            })
        
        db.client = AsyncIOMotorClient(settings.MONGODB_URL, **connection_kwargs)
        db.sync_client = MongoClient(settings.MONGODB_URL, **connection_kwargs)
        
        # Test the connection
        await db.client.admin.command('ping')
        logger.info("Connected to MongoDB successfully.")
    except Exception as e:
        logger.error(f"Could not connect to MongoDB: {e}")
        raise e

async def close_mongo_connection():
    """Close database connection."""
    try:
        if db.client:
            db.client.close()
        if db.sync_client:
            db.sync_client.close()
        logger.info("Closed MongoDB connection.")
    except Exception as e:
        logger.error(f"Error closing MongoDB connection: {e}")

async def init_db():
    """Initialize database connection and create collections."""
    await connect_to_mongo()
    
    # Create collections if they don't exist
    database = db.client[settings.DATABASE_NAME]
    
    # Create indexes for better performance
    try:
        # Users collection
        await database.users.create_index("username", unique=True)
        await database.users.create_index("email", unique=True)
        
        # Alerts collection
        await database.alerts.create_index("timestamp")
        await database.alerts.create_index("status")
        await database.alerts.create_index("violation_type")
        
        # Cameras collection
        await database.cameras.create_index("site_id")
        await database.cameras.create_index("status")
        
        # Sites collection
        await database.sites.create_index("site_name")
        
        # Reports collection
        await database.reports.create_index("generated_at")
        await database.reports.create_index("report_type")
        await database.reports.create_index("generated_by")
        
        # Zones collection
        await database.zones.create_index("site_id")
        await database.zones.create_index("zone_type")
        await database.zones.create_index("status")
        
        # Notifications collection
        await database.notifications.create_index("recipient_id")
        await database.notifications.create_index("status")
        await database.notifications.create_index("created_at")
        
        # Audit logs collection
        await database.audit_logs.create_index("timestamp")
        await database.audit_logs.create_index("user_id")
        await database.audit_logs.create_index("action")
        await database.audit_logs.create_index("resource")
        
        # System events collection
        await database.system_events.create_index("timestamp")
        await database.system_events.create_index("event_type")
        await database.system_events.create_index("severity")
        
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")

def get_database():
    """Get database instance."""
    if not db.client:
        raise RuntimeError("Database not initialized. Please ensure the application has started properly.")
    return db.client[settings.DATABASE_NAME]

def get_sync_database():
    """Get synchronous database instance."""
    return db.sync_client[settings.DATABASE_NAME]
