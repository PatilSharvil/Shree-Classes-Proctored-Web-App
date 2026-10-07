@echo off
setlocal enabledelayedexpansion
title Shree Science Academy - Proctored Exam Server Controller
color 0B

echo ======================================================================
echo          SHREE SCIENCE ACADEMY - BACKEND SERVER CONTROLLER
echo ======================================================================
echo.

:: 1. Navigate to backend directory
cd /d "%~dp0backend"

:: 2. Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed or not found in system PATH.
    echo Please install Node.js (v18+) from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: 3. Check for .env file
if not exist ".env" (
    color 0C
    echo [ERROR] Missing backend\.env configuration file.
    echo Please verify database settings before starting.
    echo.
    pause
    exit /b 1
)

echo [1/3] Verifying Node.js and dependencies...
if not exist "node_modules" (
    echo Installing dependencies (first-time launch)...
    call npm install
)

echo [2/3] Testing database connection with Supabase...
node -e "const { Pool } = require('pg'); require('dotenv').config(); const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); p.query('SELECT NOW()').then(() => { console.log('  -> Database Connected Successfully!'); process.exit(0); }).catch(e => { console.error('  -> DB Error: ' + e.message); process.exit(1); });"

if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [WARNING] Database connection failed!
    echo Please check your internet connection or credentials in backend\.env
    echo.
    set /p retry="Do you still want to start the server? (Y/N): "
    if /i not "!retry!"=="Y" exit /b 1
)

echo.
echo [3/3] Starting Server + Auto Cloudflare HTTPS Tunnel...
echo ======================================================================
echo  1. Local Server: http://localhost:5000
echo  2. Cloudflare Tunnel will auto-download if needed and launch
echo  3. The free public HTTPS URL will be displayed below and saved to Supabase
echo ======================================================================
echo.
echo  Press Ctrl+C to stop the server at any time.
echo.

color 0A
call npm start

pause
