#!/usr/bin/env python3
"""
Test script to verify authentication middleware functionality.
This script tests various authentication scenarios including expired tokens.
"""

import requests
import json
import time
from datetime import datetime, timedelta
import jwt

# Configuration
BASE_URL = "http://localhost:8000"
SECRET_KEY = "your-secret-key-change-in-production"  # Should match your config
ALGORITHM = "HS256"

def create_test_token(username: str, expires_in_minutes: int = 30) -> str:
    """Create a test JWT token with specified expiration."""
    payload = {
        "sub": username,
        "role": "Administrator",
        "exp": datetime.utcnow() + timedelta(minutes=expires_in_minutes)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_expired_token(username: str) -> str:
    """Create an expired JWT token."""
    payload = {
        "sub": username,
        "role": "Administrator",
        "exp": datetime.utcnow() - timedelta(minutes=5)  # Expired 5 minutes ago
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def test_endpoint_with_token(endpoint: str, token: str, description: str):
    """Test an endpoint with a specific token."""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    
    try:
        response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
        print(f"✅ {description}")
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        print()
        return response.status_code
    except Exception as e:
        print(f"❌ {description} - Error: {e}")
        print()
        return None

def test_authentication_scenarios():
    """Test various authentication scenarios."""
    print("🔐 Testing Authentication Middleware")
    print("=" * 50)
    
    # Test 1: Valid token
    print("1. Testing with valid token...")
    valid_token = create_test_token("testuser", 30)
    test_endpoint_with_token("/api/v1/stats/dashboard", valid_token, "Valid token (30 min)")
    
    # Test 2: Expired token
    print("2. Testing with expired token...")
    expired_token = create_expired_token("testuser")
    test_endpoint_with_token("/api/v1/stats/dashboard", expired_token, "Expired token")
    
    # Test 3: No token
    print("3. Testing without token...")
    test_endpoint_with_token("/api/v1/stats/dashboard", None, "No token")
    
    # Test 4: Invalid token format
    print("4. Testing with invalid token format...")
    test_endpoint_with_token("/api/v1/stats/dashboard", "invalid-token", "Invalid token format")
    
    # Test 5: Public endpoint (should work without token)
    print("5. Testing public endpoint...")
    test_endpoint_with_token("/", None, "Public endpoint (root)")
    
    # Test 6: Other protected endpoints
    print("6. Testing other protected endpoints...")
    test_endpoint_with_token("/api/v1/users", valid_token, "Users endpoint with valid token")
    test_endpoint_with_token("/api/v1/sites", expired_token, "Sites endpoint with expired token")

def test_token_expiration_edge_cases():
    """Test edge cases around token expiration."""
    print("\n🕐 Testing Token Expiration Edge Cases")
    print("=" * 50)
    
    # Test token that expires in 1 second
    print("1. Testing token expiring in 1 second...")
    expiring_token = create_test_token("testuser", 0.016)  # 1 second
    test_endpoint_with_token("/api/v1/stats/dashboard", expiring_token, "Token expiring in 1 second")
    
    # Wait for token to expire
    print("   Waiting for token to expire...")
    time.sleep(2)
    
    # Test the same token after expiration
    print("2. Testing expired token after waiting...")
    test_endpoint_with_token("/api/v1/stats/dashboard", expiring_token, "Token after expiration")

def main():
    """Main test function."""
    print("🚀 Starting Authentication Middleware Tests")
    print("Make sure your FastAPI server is running on http://localhost:8000")
    print()
    
    try:
        # Test basic authentication scenarios
        test_authentication_scenarios()
        
        # Test expiration edge cases
        test_token_expiration_edge_cases()
        
        print("✅ All tests completed!")
        
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to the server.")
        print("   Make sure your FastAPI server is running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()
