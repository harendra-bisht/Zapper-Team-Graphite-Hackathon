@echo off
cd /d "%~dp0"
title CertiShield - Unified Application Server
color 0A

echo ===================================================
echo           CertiShield Platform (PS 13)
echo ===================================================
echo.
echo Local PC URL:      http://localhost:5000
echo Mobile Phone / LAN: http://10.76.0.108:5000
echo.
echo Opening browser at http://localhost:5000 ...
start "" "http://localhost:5000"

cd "%~dp0server"
node dist/index.js

pause
