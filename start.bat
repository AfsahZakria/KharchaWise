@echo off
title KharchaWise - Fullstack Financial Application
echo ========================================================
echo   Starting KharchaWise (Pakistani Family Finances)
echo ========================================================
echo.
cd /d "%~dp0"
echo Starting Fullstack Server on http://localhost:8000 ...
python backend\server.py
pause
