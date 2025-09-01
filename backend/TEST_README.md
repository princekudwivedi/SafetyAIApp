# Backend API Test Suite

This directory contains comprehensive test files for testing all backend API endpoints.

## 📋 Test Files Overview

### 1. **`test_auth_api.py`** - Authentication API Tests
- **Tests**: Login, token refresh, protected endpoints, unauthorized access
- **Endpoints**: `/api/v1/auth/token`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`
- **Features**: 
  - User authentication with valid/invalid credentials
  - JWT token validation
  - Protected endpoint access control
  - Error handling for invalid tokens

### 2. **`test_profile_api.py`** - User Profile API Tests
- **Tests**: Profile management, settings, account security, password changes
- **Endpoints**: `/api/v1/profile/*`
- **Features**:
  - Get user profile information
  - Update profile data (first_name, last_name, email)
  - Change passwords with validation
  - User settings management
  - Two-factor authentication
  - Account security information

### 3. **`test_reports_api_comprehensive.py`** - Reports API Tests
- **Tests**: All report types, data aggregation, export functionality
- **Endpoints**: `/api/v1/reports/*`
- **Features**:
  - Overview reports with safety metrics
  - Violations reports with date filtering
  - Camera performance reports
  - Trend analysis reports
  - CSV and JSON export functionality
  - Report templates
  - Site-specific filtering

### 4. **`test_sites_cameras_api.py`** - Sites & Cameras API Tests
- **Tests**: Site and camera management operations
- **Endpoints**: `/api/v1/sites/*`, `/api/v1/cameras/*`
- **Features**:
  - CRUD operations for sites
  - CRUD operations for cameras
  - Site-camera relationships
  - Authorization checks
  - Error handling

### 5. **`run_all_tests.py`** - Test Runner Script
- **Purpose**: Execute all test files and provide comprehensive summary
- **Features**:
  - Sequential test execution
  - Success/failure reporting
  - Detailed output capture
  - Overall success rate calculation

## 🚀 Quick Start

### Prerequisites
1. **Backend server running** on `http://localhost:8000`
2. **Database seeded** with test data
3. **Python 3.8+** installed
4. **Test dependencies** installed

### Installation
```bash
# Install test dependencies
pip install -r test_requirements.txt

# Or install individually
pip install httpx pytest pytest-asyncio
```

### Running Tests

#### Option 1: Run All Tests (Recommended)
```bash
python run_all_tests.py
```

#### Option 2: Run Individual Test Files
```bash
# Test authentication
python test_auth_api.py

# Test profile management
python test_profile_api.py

# Test reports
python test_reports_api_comprehensive.py

# Test sites and cameras
python test_sites_cameras_api.py
```

#### Option 3: Run with Pytest (Advanced)
```bash
# Run all tests with pytest
pytest test_*.py -v

# Run specific test file
pytest test_auth_api.py -v

# Run with coverage
pytest test_*.py --cov=app --cov-report=html
```

## 🔧 Test Configuration

### Environment Variables
- **`BASE_URL`**: Backend server URL (default: `http://localhost:8000`)
- **`API_BASE`**: API base path (default: `/api/v1`)

### Test Data
- **Default User**: `admin` / `admin123`
- **Test Sites**: Automatically created during testing
- **Test Cameras**: Automatically created during testing

## 📊 Test Results

### Success Indicators
- ✅ **PASSED**: Test completed successfully
- ❌ **FAILED**: Test failed (check output for details)
- ⚠️ **SKIPPED**: Test skipped due to missing dependencies
- 🚨 **ERROR**: Unexpected error occurred

### Output Format
```
🚀 Starting Authentication API Tests...
==================================================

🔐 Authenticating user...
✅ Authentication successful

🧪 Running: Server Health Check
✅ Server health check: 200
✅ Server Health Check: PASSED

🧪 Running: User Login Success
✅ Login successful: 200
✅ User Login Success: PASSED

📊 Test Results: 2/2 tests passed
🎉 All tests passed!
```

## 🐛 Troubleshooting

### Common Issues

#### 1. **Connection Refused**
```
❌ Server health check failed: [Errno 111] Connection refused
```
**Solution**: Ensure backend server is running on `http://localhost:8000`

#### 2. **Authentication Failed**
```
❌ Authentication failed: 401
```
**Solution**: 
- Check if database is seeded with test data
- Verify admin user exists: `admin` / `admin123`
- Check backend authentication configuration

#### 3. **Import Errors**
```
ModuleNotFoundError: No module named 'httpx'
```
**Solution**: Install test dependencies: `pip install -r test_requirements.txt`

#### 4. **Timeout Errors**
```
⏰ Test file timed out after 5 minutes
```
**Solution**: 
- Check backend server performance
- Increase timeout in `run_all_tests.py` if needed
- Verify database queries are optimized

### Debug Mode
For detailed debugging, modify test files to include more verbose output:
```python
# Add debug logging
print(f"🔍 Debug: Request URL: {url}")
print(f"🔍 Debug: Request Headers: {headers}")
print(f"🔍 Debug: Response Status: {response.status_code}")
print(f"🔍 Debug: Response Body: {response.text}")
```

## 📈 Performance Testing

### Load Testing
For performance testing, you can modify test files to:
- Run multiple concurrent requests
- Measure response times
- Test rate limiting
- Monitor memory usage

### Example Load Test
```python
async def test_load_performance(self):
    """Test API performance under load"""
    import time
    
    start_time = time.time()
    concurrent_requests = 10
    
    # Run concurrent requests
    tasks = [self.test_get_profile() for _ in range(concurrent_requests)]
    results = await asyncio.gather(*tasks)
    
    end_time = time.time()
    duration = end_time - start_time
    
    print(f"⏱️  Load test completed in {duration:.2f} seconds")
    print(f"📊 Success rate: {sum(results)}/{len(results)}")
```

## 🔒 Security Testing

### Security Test Cases
- **Authentication bypass attempts**
- **SQL injection prevention**
- **XSS protection**
- **CSRF token validation**
- **Rate limiting enforcement**

### Example Security Test
```python
async def test_sql_injection_prevention(self):
    """Test SQL injection prevention"""
    malicious_input = "'; DROP TABLE users; --"
    
    response = await self.make_request_with_input(malicious_input)
    
    # Should not crash or expose data
    assert response.status_code in [400, 422, 500]
    assert "DROP TABLE" not in response.text
```

## 📝 Adding New Tests

### Test File Structure
```python
#!/usr/bin/env python3
"""
Test file for [API_NAME] API endpoints
"""

import asyncio
import httpx
import sys
import os

BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

class Test[API_NAME]API:
    def __init__(self):
        self.access_token = None
        self.test_user = {"username": "admin", "password": "admin123"}
    
    async def authenticate_user(self):
        # Authentication logic
        pass
    
    async def test_endpoint_name(self):
        # Test logic
        pass
    
    async def run_all_tests(self):
        # Test execution logic
        pass

async def main():
    tester = Test[API_NAME]API()
    success = await tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
```

### Test Naming Convention
- **Test methods**: `test_[functionality]_[scenario]`
- **Test files**: `test_[api_name]_api.py`
- **Test classes**: `Test[API_NAME]API`

## 🤝 Contributing

### Adding Tests
1. **Create test file** following the structure above
2. **Add comprehensive test cases** covering:
   - Happy path scenarios
   - Error conditions
   - Edge cases
   - Security scenarios
3. **Update `run_all_tests.py`** to include new test file
4. **Test locally** before committing
5. **Document** any new test requirements

### Test Quality Standards
- **Coverage**: Test all public endpoints
- **Validation**: Verify response formats and status codes
- **Error Handling**: Test error scenarios and edge cases
- **Performance**: Ensure tests complete within reasonable time
- **Documentation**: Clear test descriptions and expected outcomes

## 📚 Additional Resources

### Testing Best Practices
- [FastAPI Testing Guide](https://fastapi.tiangolo.com/tutorial/testing/)
- [Pytest Documentation](https://docs.pytest.org/)
- [Async Testing Patterns](https://pytest-asyncio.readthedocs.io/)

### API Testing Tools
- **httpx**: Modern async HTTP client
- **pytest**: Testing framework
- **pytest-asyncio**: Async testing support
- **pytest-cov**: Coverage reporting

---

**Happy Testing! 🧪✨**
