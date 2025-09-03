#!/usr/bin/env python3
"""
Minimal test script for deployment verification
"""

def test_imports():
    """Test critical imports"""
    print("Testing imports...")
    
    # Test NumPy
    try:
        import numpy
        print(f"NumPy: {numpy.__version__}")
        if not numpy.__version__.startswith('1.'):
            print("ERROR: NumPy is not 1.x!")
            return False
    except Exception as e:
        print(f"NumPy error: {e}")
        return False
    
    # Test OpenCV
    try:
        import cv2
        print(f"OpenCV: {cv2.__version__}")
    except Exception as e:
        print(f"OpenCV error: {e}")
        return False
    
    # Test AI Engine
    try:
        from app.core.ai_engine import AIEngine
        print("AI Engine: OK")
    except Exception as e:
        print(f"AI Engine error: {e}")
        return False
    
    print("All tests passed!")
    return True

if __name__ == "__main__":
    success = test_imports()
    exit(0 if success else 1)
