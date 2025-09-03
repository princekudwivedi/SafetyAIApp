from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from app.core.config import settings
import logging
import os

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    sync_client: MongoClient = None

db = Database()

async def connect_to_mongo():
    """Create database connection."""
    try:
        # Check if MONGODB_URL is set
        if not settings.MONGODB_URL:
            raise ValueError("MONGODB_URL environment variable is not set")
        
        # Clean the connection string to remove invalid parameters
        mongodb_url = settings.MONGODB_URL
        logger.info(f"Connecting to MongoDB with URL: {mongodb_url[:50]}...")
        
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
            # Check if we should use alternative connection method
            use_alternative_ssl = os.getenv("USE_ALTERNATIVE_SSL", "false").lower() == "true"
            
            if use_alternative_ssl:
                logger.info("Using alternative SSL configuration for deployment")
                connection_kwargs.update({
                    "ssl": True,
                    "ssl_cert_reqs": None,
                    "ssl_match_hostname": False,
                    "retryWrites": True,
                    "w": "majority",
                    "serverSelectionTimeoutMS": 30000,
                    "connectTimeoutMS": 30000,
                    "socketTimeoutMS": 30000,
                    "maxPoolSize": 5,
                    "minPoolSize": 1
                })
            else:
                # Standard configuration
                connection_kwargs.update({
                    "tls": True,
                    "tlsAllowInvalidCertificates": True,
                    "tlsAllowInvalidHostnames": True,
                    "retryWrites": True,
                    "w": "majority",
                    "serverSelectionTimeoutMS": 60000,
                    "connectTimeoutMS": 60000,
                    "socketTimeoutMS": 60000,
                    "maxPoolSize": 10,
                    "minPoolSize": 1,
                    "maxIdleTimeMS": 30000,
                    "heartbeatFrequencyMS": 10000
                })
        
        # Try multiple connection configurations for deployment compatibility
        connection_attempts = [
            # Attempt 1: Standard configuration
            connection_kwargs,
            # Attempt 2: More aggressive SSL bypass
            {
                "ssl": True,
                "ssl_cert_reqs": None,
                "ssl_match_hostname": False,
                "retryWrites": True,
                "w": "majority",
                "serverSelectionTimeoutMS": 30000,
                "connectTimeoutMS": 30000,
                "socketTimeoutMS": 30000
            },
            # Attempt 3: Minimal SSL
            {
                "ssl": True,
                "retryWrites": True,
                "w": "majority",
                "serverSelectionTimeoutMS": 20000,
                "connectTimeoutMS": 20000,
                "socketTimeoutMS": 20000
            }
        ]
        
        last_error = None
        for i, config in enumerate(connection_attempts, 1):
            try:
                logger.info(f"Connection attempt {i}/{len(connection_attempts)} with config: {list(config.keys())}")
                
                db.client = AsyncIOMotorClient(mongodb_url, **config)
                db.sync_client = MongoClient(mongodb_url, **config)
                
                # Test the connection
                await db.client.admin.command('ping')
                logger.info(f"Connected to MongoDB successfully with attempt {i}")
                return  # Success, exit the function
                
            except Exception as e:
                last_error = e
                logger.warning(f"Connection attempt {i} failed: {str(e)[:100]}...")
                
                # Close any partial connections
                try:
                    if db.client:
                        db.client.close()
                    if db.sync_client:
                        db.sync_client.close()
                except:
                    pass
                
                # Continue to next attempt
                continue
        
        # If all attempts failed, raise the last error
        logger.error(f"All connection attempts failed. Last error: {last_error}")
        raise last_error
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
    try:
        logger.info("Starting database initialization...")
        
        # Check environment variables first
        if not settings.MONGODB_URL:
            error_msg = "MONGODB_URL environment variable is not set. Please set it in your deployment environment."
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        if not settings.DATABASE_NAME:
            error_msg = "DATABASE_NAME environment variable is not set. Please set it in your deployment environment."
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        logger.info(f"Environment check passed - MONGODB_URL: {'SET' if settings.MONGODB_URL else 'NOT SET'}, DATABASE_NAME: {settings.DATABASE_NAME}")
        
        await connect_to_mongo()
        logger.info("Database connection established successfully")
        
        # Create collections if they don't exist
        database = db.client[settings.DATABASE_NAME]
        logger.info(f"Using database: {settings.DATABASE_NAME}")
    except Exception as e:
        logger.error(f"Failed to establish database connection: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error details: {str(e)}")
        raise
    
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
