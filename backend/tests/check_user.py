import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def check_user():
    try:
        # Connect to MongoDB
        client = AsyncIOMotorClient('mongodb://localhost:27017')
        db = client['safety_ai_db']
        
        print("MongoDB connection successful")
        
        # Get admin user details
        admin_user = await db.users.find_one({"username": "admin"})
        if admin_user:
            print(f"Admin user found:")
            print(f"Username: {admin_user['username']}")
            print(f"Role: {admin_user['role']}")
            print(f"Password hash: {admin_user['password_hash']}")
            print(f"Is active: {admin_user['is_active']}")
            
            # Test password verification
            test_password = "admin123"
            is_valid = pwd_context.verify(test_password, admin_user['password_hash'])
            print(f"Password '{test_password}' is valid: {is_valid}")
            
            # Test with wrong password
            wrong_password = "wrongpass"
            is_valid_wrong = pwd_context.verify(wrong_password, admin_user['password_hash'])
            print(f"Password '{wrong_password}' is valid: {is_valid_wrong}")
            
            # Hash the test password to see what it should be
            new_hash = pwd_context.hash(test_password)
            print(f"New hash for '{test_password}': {new_hash}")
            
        else:
            print("Admin user not found")
        
        client.close()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_user())
