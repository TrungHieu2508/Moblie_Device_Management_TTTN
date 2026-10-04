@echo off
title EduGuardian MDM - Start All Servers
color 0A

echo ==========================================
echo   EduGuardian MDM - Khoi dong he thong
echo ==========================================
echo.

:: Khoi dong Backend FastAPI
echo [1/2] Khoi dong Backend (FastAPI port 8081)...
start "MDM Backend" cmd /k "cd /d "%~dp0MDM-server" && .venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8081 --reload"

:: Doi 3 giay de backend khoi dong truoc
timeout /t 3 /nobreak >nul

:: Khoi dong Frontend
echo [2/2] Khoi dong Frontend (Vite port 5173)...
start "MDM Frontend" cmd /k "cd /d "%~dp0web-dashboard" && npm run dev"

echo.
echo ==========================================
echo   Ca 2 server dang khoi dong!
echo   Backend:  http://localhost:8081
echo   Frontend: http://localhost:5173
echo ==========================================
echo.
echo Dong cua so nay di. Giu 2 cua so CMD kia mo.
pause
