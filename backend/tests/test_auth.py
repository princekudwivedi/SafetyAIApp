import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def test_auth():
    try:
        # Connect to MongoDB
        client = AsyncIOMotorClient('mongodb://localhost:27017')
        db = client['safety_ai_db']
        
        print("MongoDB connection successful")
        
        # Check if users collection exists and has users
        users_count = await db.users.count_documents({})
        print(f"Total users in database: {users_count}")
        
        if users_count == 0:
            print("No users found. Creating test user...")
            
            # Create a test user
            test_user = {
                "username": "admin",
                "email": "admin@safetyai.com",
                "role": "Administrator",
                "is_active": True,
                "password_hash": pwd_context.hash("admin123"),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            result = await db.users.insert_one(test_user)
            print(f"Test user created with ID: {result.inserted_id}")
            print("Username: admin, Password: admin123")
        else:
            # List existing users
            users = await db.users.find({}, {"username": 1, "role": 1, "is_active": 1}).to_list(length=10)
            print("Existing users:")
            for user in users:
                print(f"- {user['username']} ({user['role']}) - Active: {user['is_active']}")
        
        client.close()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_auth())
