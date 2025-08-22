import requests
import json

def test_endpoints():
    base_url = "http://localhost:8000"
    
    print("Testing endpoints...")
    
    # Test root endpoint
    try:
        response = requests.get(f"{base_url}/")
        print(f"Root endpoint: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Root endpoint error: {e}")
    
    # Test auth endpoint
    try:
        response = requests.get(f"{base_url}/api/v1/auth/login")
        print(f"Auth endpoint GET: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Auth endpoint GET error: {e}")
    
    # Test auth login POST
    try:
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        response = requests.post(
            f"{base_url}/api/v1/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"Auth login POST: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Auth login POST error: {e}")
    
    # Test with wrong path
    try:
        response = requests.post(
            f"{base_url}/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"Wrong path /auth/login: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Wrong path error: {e}")

if __name__ == "__main__":
    test_endpoints()
