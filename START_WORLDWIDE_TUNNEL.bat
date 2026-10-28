@echo off
title CertiShield - Worldwide Public QR Scanner Tunnel
cd /d "%~dp0"

echo =========================================================================
echo       CertiShield - Cloudflare Worldwide Public Tunnel
echo       Enables QR code scanning from ANY mobile network / 4G / 5G / Wi-Fi
echo =========================================================================
echo.

if not exist "cloudflared.exe" (
    echo [ERROR] cloudflared.exe binary not found.
    pause
    exit /b 1
)

echo Starting tunnel to local port 5000...
echo Keep this window open while scanning QR codes from mobile phones on mobile data.
echo.

.\cloudflared.exe tunnel --url http://127.0.0.1:5000
pause
