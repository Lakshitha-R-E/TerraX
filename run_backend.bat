@echo off
echo ========================================================
echo Starting 3D ULPIN System - FastAPI Backend
echo ========================================================
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
