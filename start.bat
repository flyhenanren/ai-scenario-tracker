@echo off
chcp 65001 > nul

REM AI Scenario Tracker Startup Script
echo.
echo =============================
echo   AI Scenario Tracker Starting
echo =============================
echo.

cd /d "%~dp0"

REM Check Python
python --version 2>/dev/null 1>nul
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.8+
    pause
    exit /b 1
)

REM Install dependencies
echo.
echo [1/2] Checking dependencies...
pip install -r requirements.txt 2>/dev/null 1>nul

REM Start service
echo [2/2] Starting backend service...
echo.
echo Access: http://localhost:8000
echo Press Ctrl+C to stop
echo.
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

pause
