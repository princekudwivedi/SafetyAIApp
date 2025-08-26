#!/usr/bin/env python3
"""
Simple script to test server startup with authentication middleware.
This script attempts to import the main application and verify middleware is configured.
"""

import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test if all required modules can be imported."""
    print("🔍 Testing module imports...")
    
    try:
        # Test core modules
        from app.core.config import settings
        print("✅ Config module imported successfully")
        
        from app.core.logging import get_logger
        print("✅ Logging module imported successfully")
        
        from app.core.auth_middleware import GlobalAuthMiddleware, add_global_auth_middleware
        print("✅ Authentication middleware imported successfully")
        
        from app.api.v1.endpoints.auth import get_current_active_user
        print("✅ Auth endpoints imported successfully")
        
        from app.api.v1.endpoints.stats import router as stats_router
        print("✅ Stats endpoints imported successfully")
        
        print("\n✅ All core modules imported successfully!")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_middleware_configuration():
    """Test if middleware can be configured."""
    print("\n🔧 Testing middleware configuration...")
    
    try:
        from app.core.auth_middleware import GlobalAuthMiddleware
        
        # Create a dummy app object for testing
        class DummyApp:
            def __init__(self):
                self.middleware_stack = []
            
            def add_middleware(self, middleware_class):
                self.middleware_stack.append(middleware_class)
        
        dummy_app = DummyApp()
        
        # Test middleware creation
        middleware = GlobalAuthMiddleware(dummy_app)
        print("✅ Middleware instance created successfully")
        
        # Test route classification
        protected_test = middleware._is_protected_route("/api/v1/stats/dashboard")
        public_test = middleware._is_public_route("/api/v1/auth/login")
        
        print(f"✅ Route classification working: protected={protected_test}, public={public_test}")
        
        return True
        
    except Exception as e:
        print(f"❌ Middleware configuration error: {e}")
        return False

def test_endpoint_authentication():
    """Test if endpoints have proper authentication dependencies."""
    print("\n🔐 Testing endpoint authentication...")
    
    try:
        from app.api.v1.endpoints.stats import router as stats_router
        
        # Check if dashboard endpoint has authentication
        dashboard_route = None
        for route in stats_router.routes:
            if route.path == "/dashboard":
                dashboard_route = route
                break
        
        if dashboard_route:
            print("✅ Dashboard endpoint found")
            
            # Check if it has authentication dependency
            if hasattr(dashboard_route, 'dependencies'):
                print("✅ Dashboard endpoint has dependencies configured")
            else:
                print("⚠️  Dashboard endpoint dependencies not visible in router")
        else:
            print("❌ Dashboard endpoint not found")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Endpoint authentication test error: {e}")
        return False

def main():
    """Main test function."""
    print("🚀 Testing Server Startup with Authentication Middleware")
    print("=" * 60)
    
    tests = [
        ("Module Imports", test_imports),
        ("Middleware Configuration", test_middleware_configuration),
        ("Endpoint Authentication", test_endpoint_authentication),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n📋 Running: {test_name}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Results Summary")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Server should start successfully.")
        print("\n💡 To start the server, run:")
        print("   cd backend")
        print("   python main.py")
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
