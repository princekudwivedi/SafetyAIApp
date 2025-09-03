#!/usr/bin/env python3
"""
Deployment verification script to check NumPy/OpenCV compatibility
Run this after deployment to ensure the fix is working
"""

import sys
import importlib

def check_imports():
    """Check if all critical imports work without NumPy/OpenCV errors"""
    try:
        print("🔍 Checking NumPy import...")
        import numpy
        print(f"✅ NumPy version: {numpy.__version__}")
        
        if not numpy.__version__.startswith('1.'):
            print(f"❌ ERROR: NumPy version {numpy.__version__} is not 1.x!")
            print("   This will cause OpenCV compatibility issues.")
            return False
            
        print("🔍 Checking OpenCV import...")
        import cv2
        print(f"✅ OpenCV version: {cv2.__version__}")
        
        print("🔍 Checking AI Engine import...")
        from app.core.ai_engine import AIEngine
        print("✅ AI Engine import successful!")
        
        print("🔍 Checking other critical imports...")
        import torch
        import ultralytics
        print(f"✅ PyTorch version: {torch.__version__}")
        print(f"✅ Ultralytics version: {ultralytics.__version__}")
        
        print("\n🎉 All imports successful! Deployment should work correctly.")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 SafetyAI App - Deployment Verification")
    print("=" * 50)
    
    success = check_imports()
    
    if success:
        print("\n✅ Deployment verification PASSED")
        sys.exit(0)
    else:
        print("\n❌ Deployment verification FAILED")
        sys.exit(1)
