@echo off
cd /d "%~dp0.."
title Ngrok - SUPER ERP
echo.
echo Eski ngrok pencereleri kapatiliyor...
taskkill /IM ngrok.exe /F >nul 2>&1
echo Endpoint'in serbest kalmesi icin 8 saniye bekleniyor...
timeout /t 8 /nobreak >nul
echo.
echo Ngrok baslatiliyor (port 3000)...
echo.
ngrok http http://127.0.0.1:3000 --host-header=rewrite
pause
