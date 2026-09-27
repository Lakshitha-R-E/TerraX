"""
FastAPI entry point for Vercel Serverless Functions.
Directs Vercel's Python runtime to the 3D ULPIN FastAPI application instance.
"""
import sys
import os

# Add backend directory to sys.path so all imports in main.py work
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
