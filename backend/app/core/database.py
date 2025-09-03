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
        # Clean the connection string to remove invalid parameters
        mongodb_url = settings.MONGODB_URL
        
        # Remove invalid ssl_cert_reqs parameter if present
        if "ssl_cert_reqs=" in mongodb_url:
            import re
            mongodb_url = re.sub(r'[?&]ssl_cert_reqs=[^&]*', '', mongodb_url)
            # Clean up any double ? or & characters
            mongodb_url = re.sub(r'\?&', '?', mongodb_url)
            mongodb_url = re.sub(r'&&', '&', mongodb_url)
            mongodb_url = mongodb_url.rstrip('?&')
            logger.info("Cleaned MongoDB URL to remove invalid ssl_cert_reqs parameter")
        
        # Enhanced connection with SSL handling for MongoDB Atlas
        connection_kwargs = {}
        
        # If using MongoDB Atlas (mongodb+srv://), add SSL parameters
        if mongodb_url.startswith("mongodb+srv://"):
            connection_kwargs.update({
                "tls": True,
                "tlsAllowInvalidCertificates": True,
                "tlsAllowInvalidHostnames": True,
                "retryWrites": True,
                "w": "majority",
                "serverSelectionTimeoutMS": 60000,  # Increased timeout
                "connectTimeoutMS": 60000,  # Increased timeout
                "socketTimeoutMS": 60000,  # Increased timeout
                "maxPoolSize": 10,
                "minPoolSize": 1,
                "maxIdleTimeMS": 30000,
                "heartbeatFrequencyMS": 10000
            })
        
        db.client = AsyncIOMotorClient(mongodb_url, **connection_kwargs)
        db.sync_client = MongoClient(mongodb_url, **connection_kwargs)
        
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
    
    # Create indexes for better performance with retry logic
    max_retries = 3
    retry_delay = 2  # seconds
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Initializing database indexes (attempt {attempt + 1}/{max_retries})")
            
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
            return  # Success, exit the retry loop
            
        except Exception as e:
            logger.warning(f"Database initialization attempt {attempt + 1} failed: {e}")
            
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_delay} seconds...")
                import asyncio
                await asyncio.sleep(retry_delay)
                
                # Reconnect to MongoDB before retry
                try:
                    await connect_to_mongo()
                    database = db.client[settings.DATABASE_NAME]
                except Exception as reconnect_error:
                    logger.error(f"Failed to reconnect to MongoDB: {reconnect_error}")
            else:
                logger.error(f"Database initialization failed after {max_retries} attempts: {e}")
                # Don't raise the exception, just log it to allow the app to continue
                logger.warning("Application will continue without database indexes. Some features may be slower.")

def get_database():
    """Get database instance."""
    if not db.client:
        raise RuntimeError("Database not initialized. Please ensure the application has started properly.")
    return db.client[settings.DATABASE_NAME]

def get_sync_database():
    """Get synchronous database instance."""
    return db.sync_client[settings.DATABASE_NAME]
