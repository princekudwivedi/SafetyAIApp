#!/usr/bin/env python3
"""
Debug deployment script to identify NumPy/OpenCV issues
Run this during deployment to get detailed information
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

def debug_environment():
    """Debug the current environment"""
    print("🔍 DEPLOYMENT DEBUG INFORMATION")
    print("=" * 50)
    
    # Check Python version
    print(f"Python version: {sys.version}")
    
    # Check pip list
    print("\n📦 Installed packages:")
    returncode, stdout, stderr = run_command("pip list | grep -E '(numpy|opencv|torch)'")
    if returncode == 0:
        print(stdout)
    else:
        print("Could not get package list")
    
    # Check NumPy installation
    print("\n🔍 NumPy Analysis:")
    try:
        import numpy
        print(f"✅ NumPy version: {numpy.__version__}")
        print(f"✅ NumPy location: {numpy.__file__}")
        
        # Check if it's 1.x or 2.x
        if numpy.__version__.startswith('1.'):
            print("✅ NumPy is 1.x - should be compatible with OpenCV")
        else:
            print(f"❌ NumPy is {numpy.__version__} - NOT 1.x! This will cause OpenCV issues")
            
    except ImportError as e:
        print(f"❌ NumPy import failed: {e}")
    
    # Check OpenCV installation
    print("\n🔍 OpenCV Analysis:")
    try:
        import cv2
        print(f"✅ OpenCV version: {cv2.__version__}")
        print(f"✅ OpenCV location: {cv2.__file__}")
        
        # Try to use OpenCV
        import numpy as np
        test_array = np.array([1, 2, 3])
        result = cv2.cvtColor(test_array.reshape(1, 3, 1), cv2.COLOR_GRAY2BGR)
        print("✅ OpenCV basic functionality works")
        
    except ImportError as e:
        print(f"❌ OpenCV import failed: {e}")
    except Exception as e:
        print(f"❌ OpenCV functionality test failed: {e}")
    
    # Check PyTorch
    print("\n🔍 PyTorch Analysis:")
    try:
        import torch
        print(f"✅ PyTorch version: {torch.__version__}")
        print(f"✅ PyTorch location: {torch.__file__}")
    except ImportError as e:
        print(f"❌ PyTorch import failed: {e}")
    
    # Check Ultralytics
    print("\n🔍 Ultralytics Analysis:")
    try:
        import ultralytics
        print(f"✅ Ultralytics version: {ultralytics.__version__}")
    except ImportError as e:
        print(f"❌ Ultralytics import failed: {e}")
    
    # Check AI Engine
    print("\n🔍 AI Engine Analysis:")
    try:
        # Clear any cached imports that might have NumPy 2.x
        import sys
        modules_to_clear = [mod for mod in sys.modules.keys() if 'numpy' in mod or 'cv2' in mod]
        for mod in modules_to_clear:
            if mod in sys.modules:
                del sys.modules[mod]
        
        # Now try to import AI Engine
        from app.core.ai_engine import AIEngine
        print("✅ AI Engine import successful")
    except ImportError as e:
        print(f"❌ AI Engine import failed: {e}")
        print("   This is expected if NumPy 2.x is still present")
    except Exception as e:
        print(f"❌ AI Engine error: {e}")
        print("   This is expected if NumPy 2.x is still present")

if __name__ == "__main__":
    debug_environment()
