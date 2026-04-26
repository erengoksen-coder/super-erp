@echo off
chcp 65001 >nul
title Baslat - Dev + Cloudflare Tunnel
cd /d "%~dp0.."

echo.
echo   [1/2] Localhost (npm run dev) yeni pencerede baslatiliyor...
echo.
start "Super ERP - Dev Server" cmd /k "cd /d "%~dp0.." && npm run dev"

echo   Sunucunun acilmasi icin 8 saniye bekleniyor...
timeout /t 8 /nobreak >nul

echo.
echo   [2/2] Cloudflare Tunnel baslatiliyor...
echo   URL birkaç saniye icinde asagida cikacak (https://....trycloudflare.com)
echo.
start "Cloudflare Tunnel" cmd /k "cd /d "%~dp0.." && npm run tunnel:cloudflare"

echo.
echo   Iki pencere acildi: Dev Server + Cloudflare Tunnel.
echo   Tunnel URL'sini Cloudflare penceresinde gorun.
echo.
pause
