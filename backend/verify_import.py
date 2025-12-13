import os
import sys

# Add current directory to sys.path to mimic uvicorn running from backend/
# uvicorn adds the current working directory to sys.path
sys.path.insert(0, os.getcwd())

print(f"CWD: {os.getcwd()}")
print(f"Path: {sys.path[:3]}")

try:
    # Attempt to find the app package
    import app

    print(f"Found app package: {app}")

    # Attempt to import main
    import app.main

    print("Successfully imported app.main")

except ImportError as e:
    print(f"Import Error: {e}")
except Exception as e:
    print(f"Runtime Error: {e}")
