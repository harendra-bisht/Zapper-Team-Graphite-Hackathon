@echo off
cd /d "%~dp0"
title CertiShield Launcher

echo ===================================================
echo     CertiShield - PS 13 Launcher
echo ===================================================
echo.

if not exist "%~dp0node_modules" (
    echo [Setup] Installing root frontend dependencies...
    call npm install
)

if not exist "%~dp0server\node_modules" (
    echo [Setup] Installing server dependencies...
    cd /d "%~dp0server"
    call npm install
    cd /d "%~dp0"
)

echo Starting Backend API Server on Port 5000...
start "CertiShield-Backend" /D "%~dp0server" cmd.exe /k "npm run dev"

echo Starting Frontend on Port 5173...
start "CertiShield-Frontend" /D "%~dp0" cmd.exe /k "npm run dev"

echo Opening Web Browser at http://localhost:5173 ...
start "" "http://localhost:5173"

echo.
echo ===================================================
echo   Services started!
echo ===================================================
