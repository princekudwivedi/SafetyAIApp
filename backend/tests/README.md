# Test and Utility Files

This folder contains various test scripts and utility files for the Safety AI Application backend.

## Test Files

### Authentication Tests
- **`test_auth.py`** - Tests the authentication system with admin credentials
- **`test_login.py`** - Tests the login endpoint functionality
- **`test_endpoint.py`** - General endpoint testing utilities

### Data Verification Scripts
- **`check_user.py`** - Verifies user data in the database and tests password verification
- **`check_password.py`** - Tests password hashing and verification methods
- **`verify_data.py`** - Comprehensive data verification for the entire database

## Usage

These files can be run individually to test specific functionality:

```bash
# Test authentication
python tests/test_auth.py

# Check user data
python tests/check_user.py

# Verify password functionality
python tests/check_password.py

# Verify all data
python tests/verify_data.py

# Test login endpoint
python tests/test_login.py

# Test general endpoints
python tests/test_endpoint.py
```

## Purpose

These files serve as:
- **Development tools** for testing API endpoints
- **Debugging utilities** for database and authentication issues
- **Reference implementations** for understanding how to interact with the API
- **Quality assurance** tools for verifying data integrity

## Notes

- Most scripts require a running MongoDB instance
- Authentication tests require the backend application to be running
- These are development/testing tools and should not be used in production
- Some scripts may need to be updated if the API structure changes
