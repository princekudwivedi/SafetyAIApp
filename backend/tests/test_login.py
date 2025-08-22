import requests
import json

def test_login():
    try:
        # Test login with admin credentials
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        response = requests.post(
            "http://localhost:8000/api/v1/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ Login successful!")
            print(f"Access Token: {data.get('access_token', 'N/A')[:50]}...")
            print(f"Token Type: {data.get('token_type', 'N/A')}")
            
            # Test the token by calling a protected endpoint
            token = data.get('access_token')
            if token:
                print(f"\n🔒 Testing protected endpoint...")
                headers = {"Authorization": f"Bearer {token}"}
                protected_response = requests.get(
                    "http://localhost:8000/api/v1/cameras/monitoring/status",
                    headers=headers
                )
                print(f"Protected endpoint status: {protected_response.status_code}")
                print(f"Protected endpoint response: {protected_response.text[:200]}...")
        else:
            print(f"\n❌ Login failed!")
            
    except Exception as e:
        print(f"Error testing login: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_login()
