#!/usr/bin/env python3
"""
Robust deployment verification script that handles NumPy/OpenCV compatibility issues
"""

import sys
import subprocess
import importlib

def run_command(cmd):
    """Run a command and return its output"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return -1, "", str(e)

def clear_cached_imports():
    """Clear any cached imports that might have NumPy 2.x"""
    modules_to_clear = []
    for mod_name in list(sys.modules.keys()):
        if any(keyword in mod_name.lower() for keyword in ['numpy', 'cv2', 'opencv']):
            modules_to_clear.append(mod_name)
    
    for mod_name in modules_to_clear:
        if mod_name in sys.modules:
            del sys.modules[mod_name]
    
    print(f"Cleared {len(modules_to_clear)} cached modules")

def check_imports_robust():
    """Check imports with robust error handling"""
    print("🔍 ROBUST DEPLOYMENT VERIFICATION")
    print("=" * 50)
    
    # Clear any cached imports first
    clear_cached_imports()
    
    # Check NumPy
    print("\n🔍 Checking NumPy...")
    try:
        import numpy
        print(f"✅ NumPy version: {numpy.__version__}")
        
        if not numpy.__version__.startswith('1.'):
            print(f"❌ ERROR: NumPy version {numpy.__version__} is not 1.x!")
            print("   This will cause OpenCV compatibility issues.")
            return False
        else:
            print("✅ NumPy is 1.x - compatible with OpenCV")
            
    except ImportError as e:
        print(f"❌ NumPy import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ NumPy error: {e}")
        return False
    
    # Check OpenCV
    print("\n🔍 Checking OpenCV...")
    try:
        import cv2
        print(f"✅ OpenCV version: {cv2.__version__}")
        
        # Test basic OpenCV functionality
        import numpy as np
        test_array = np.array([[1, 2, 3]], dtype=np.uint8)
        result = cv2.cvtColor(test_array, cv2.COLOR_GRAY2BGR)
        print("✅ OpenCV basic functionality works")
        
    except ImportError as e:
        print(f"❌ OpenCV import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ OpenCV functionality test failed: {e}")
        return False
    
    # Check PyTorch
    print("\n🔍 Checking PyTorch...")
    try:
        import torch
        print(f"✅ PyTorch version: {torch.__version__}")
    except ImportError as e:
        print(f"❌ PyTorch import failed: {e}")
        return False
    
    # Check Ultralytics
    print("\n🔍 Checking Ultralytics...")
    try:
        import ultralytics
        print(f"✅ Ultralytics version: {ultralytics.__version__}")
    except ImportError as e:
        print(f"❌ Ultralytics import failed: {e}")
        return False
    
    # Check AI Engine (with additional error handling)
    print("\n🔍 Checking AI Engine...")
    try:
        # Clear imports again before AI Engine test
        clear_cached_imports()
        
        from app.core.ai_engine import AIEngine
        print("✅ AI Engine import successful")
        
        # Try to create an instance
        ai_engine = AIEngine()
        print("✅ AI Engine instantiation successful")
        
    except ImportError as e:
        print(f"❌ AI Engine import failed: {e}")
        print("   This might be due to NumPy/OpenCV compatibility issues")
        return False
    except Exception as e:
        print(f"❌ AI Engine error: {e}")
        print("   This might be due to NumPy/OpenCV compatibility issues")
        return False
    
    print("\n🎉 All imports successful! Deployment should work correctly.")
    return True

if __name__ == "__main__":
    success = check_imports_robust()
    
    if success:
        print("\n✅ Robust deployment verification PASSED")
        sys.exit(0)
    else:
        print("\n❌ Robust deployment verification FAILED")
        sys.exit(1)