import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import hashlib

# Password hashing contexts
bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def check_passwords():
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
            
            # Test password verification with bcrypt
            test_password = "admin123"
            try:
                is_valid_bcrypt = bcrypt_context.verify(test_password, admin_user['password_hash'])
                print(f"Bcrypt verification for '{test_password}': {is_valid_bcrypt}")
            except Exception as e:
                print(f"Bcrypt verification failed: {e}")
            
            # Test with SHA-256 (legacy method)
            try:
                sha256_hash = hashlib.sha256(test_password.encode()).hexdigest()
                is_valid_sha256 = sha256_hash == admin_user['password_hash']
                print(f"SHA-256 verification for '{test_password}': {is_valid_sha256}")
            except Exception as e:
                print(f"SHA-256 verification failed: {e}")
            
            # Hash the test password with bcrypt to see what it should be
            new_bcrypt_hash = bcrypt_context.hash(test_password)
            print(f"New bcrypt hash for '{test_password}': {new_bcrypt_hash}")
            
            # Check if the stored hash looks like bcrypt (should start with $2b$)
            stored_hash = admin_user['password_hash']
            if stored_hash.startswith('$2b$'):
                print("✅ Stored hash is bcrypt format")
            else:
                print("❌ Stored hash is NOT bcrypt format")
                print("This suggests the seed data wasn't updated properly")
                
        else:
            print("Admin user not found")
        
        client.close()
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_passwords())
