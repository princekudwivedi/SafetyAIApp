#!/usr/bin/env python3
"""
Simple debug deployment script that handles encoding issues
"""

import sys
import os

def safe_print(text):
    """Print text safely, handling encoding issues"""
    try:
        print(text)
    except UnicodeEncodeError:
        print(text.encode('ascii', 'replace').decode('ascii'))
    except Exception as e:
        print(f"Print error: {e}")

def debug_environment():
    """Debug the current environment"""
    safe_print("🔍 DEPLOYMENT DEBUG INFORMATION")
    safe_print("=" * 50)
    
    # Check Python version
    safe_print("Python version: Available")
    safe_print(f"Python executable: {sys.executable}")
    
    # Check NumPy installation
    safe_print("\n🔍 NumPy Analysis:")
    try:
        import numpy
        safe_print(f"✅ NumPy version: {numpy.__version__}")
        
        # Check if it's 1.x or 2.x
        if numpy.__version__.startswith('1.'):
            safe_print("✅ NumPy is 1.x - should be compatible with OpenCV")
        else:
            safe_print(f"❌ NumPy is {numpy.__version__} - NOT 1.x! This will cause OpenCV issues")
            
    except ImportError as e:
        safe_print(f"❌ NumPy import failed: {e}")
    except Exception as e:
        safe_print(f"❌ NumPy error: {e}")
    
    # Check OpenCV installation
    safe_print("\n🔍 OpenCV Analysis:")
    try:
        import cv2
        safe_print(f"✅ OpenCV version: {cv2.__version__}")
        
        # Try to use OpenCV
        import numpy as np
        test_array = np.array([1, 2, 3])
        result = cv2.cvtColor(test_array.reshape(1, 3, 1), cv2.COLOR_GRAY2BGR)
        safe_print("✅ OpenCV basic functionality works")
        
    except ImportError as e:
        safe_print(f"❌ OpenCV import failed: {e}")
    except Exception as e:
        safe_print(f"❌ OpenCV functionality test failed: {e}")
    
    # Check PyTorch
    safe_print("\n🔍 PyTorch Analysis:")
    try:
        import torch
        safe_print(f"✅ PyTorch version: {torch.__version__}")
    except ImportError as e:
        safe_print(f"❌ PyTorch import failed: {e}")
    
    # Check Ultralytics
    safe_print("\n🔍 Ultralytics Analysis:")
    try:
        import ultralytics
        safe_print(f"✅ Ultralytics version: {ultralytics.__version__}")
    except ImportError as e:
        safe_print(f"❌ Ultralytics import failed: {e}")
    
    # Check AI Engine
    safe_print("\n🔍 AI Engine Analysis:")
    try:
        from app.core.ai_engine import AIEngine
        safe_print("✅ AI Engine import successful")
    except ImportError as e:
        safe_print(f"❌ AI Engine import failed: {e}")
        safe_print("   This is expected if NumPy 2.x is still present")
    except Exception as e:
        safe_print(f"❌ AI Engine error: {e}")
        safe_print("   This is expected if NumPy 2.x is still present")

if __name__ == "__main__":
    debug_environment()
