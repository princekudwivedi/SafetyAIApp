#!/usr/bin/env python3
"""
Test Runner Script for Backend APIs
Runs all test files and provides a comprehensive summary
"""


import asyncio
import subprocess
import sys
import os
from datetime import datetime

def print_header():
    """Print a nice header for the test runner"""
    print("=" * 80)
    print("🧪 BACKEND API TEST SUITE")
    print("=" * 80)
    print(f"🕐 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"📁 Working directory: {os.getcwd()}")
    print("=" * 80)

def print_footer():
    """Print a footer with summary"""
    print("=" * 80)
    print(f"🏁 Tests completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)

def run_test_file(test_file):
    """Run a single test file and return the result"""
    print(f"\n🚀 Running: {test_file}")
    print("-" * 60)
    
    try:
        # Run the test file using Python
        result = subprocess.run(
            [sys.executable, test_file],
            capture_output=True,
            text=True,
            timeout=300  # 5 minutes timeout
        )
        
        if result.returncode == 0:
            print("✅ Test file completed successfully")
            print("📋 Output:")
            print(result.stdout)
            return True, result.stdout
        else:
            print("❌ Test file failed")
            print("📋 Output:")
            print(result.stdout)
            print("🚨 Errors:")
            print(result.stderr)
            return False, result.stdout + "\n" + result.stderr
            
    except subprocess.TimeoutExpired:
        print("⏰ Test file timed out after 5 minutes")
        return False, "TIMEOUT"
    except Exception as e:
        print(f"💥 Error running test file: {e}")
        return False, str(e)

def main():
    """Main function to run all tests"""
    print_header()
    
    # List of test files to run
    test_files = [
        "test_auth_api.py",
        "test_profile_api.py", 
        "test_reports_api_comprehensive.py",
        "test_sites_cameras_api.py"
    ]
    
    # Check which test files exist
    existing_tests = []
    for test_file in test_files:
        if os.path.exists(test_file):
            existing_tests.append(test_file)
        else:
            print(f"⚠️  Test file not found: {test_file}")
    
    if not existing_tests:
        print("❌ No test files found!")
        return 1
    
    print(f"\n📋 Found {len(existing_tests)} test files:")
    for test_file in existing_tests:
        print(f"   • {test_file}")
    
    # Run all tests
    results = []
    total_tests = len(existing_tests)
    passed_tests = 0
    
    print(f"\n🎯 Starting test execution...")
    
    for test_file in existing_tests:
        success, output = run_test_file(test_file)
        results.append({
            'file': test_file,
            'success': success,
            'output': output
        })
        
        if success:
            passed_tests += 1
        
        print(f"\n{'✅ PASSED' if success else '❌ FAILED'}: {test_file}")
    
    # Print summary
    print("\n" + "=" * 80)
    print("📊 TEST SUMMARY")
    print("=" * 80)
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {total_tests - passed_tests}")
    print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
    
    # Print detailed results
    print("\n📋 DETAILED RESULTS:")
    for result in results:
        status = "✅ PASSED" if result['success'] else "❌ FAILED"
        print(f"{status}: {result['file']}")
    
    print_footer()
    
    # Return appropriate exit code
    if passed_tests == total_tests:
        print("\n🎉 All tests passed! Backend APIs are working correctly.")
        return 0
    else:
        print(f"\n🚨 {total_tests - passed_tests} test(s) failed. Please check the output above.")
        return 1

if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n⏹️  Test execution interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)
