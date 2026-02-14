@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo   Dev + Cloudflare Tunnel - tek tikla baslatiliyor...
echo.

echo   Port 3000/3001 kullanan eski islemler kapatiliyor...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000,3001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>nul
timeout /t 2 /nobreak >nul

if exist ".next\dev\lock" (
  del /f /q ".next\dev\lock" 2>nul
  echo   Eski kilit dosyasi silindi.
)

start "Super ERP - Dev" cmd /k "cd /d ""%~dp0."" && npm run dev || pause"
echo   [1/2] Dev sunucu acildi.

echo   Sunucu hazir olana kadar bekleniyor...
set attempt=0
:bekle
set /a attempt+=1
powershell -NoProfile -Command "$t=New-Object System.Net.Sockets.TcpClient;try{$t.Connect('127.0.0.1',3000);$t.Close();exit 0}catch{exit 1}" >nul 2>&1
if %errorlevel% equ 0 goto tunnel
if %attempt% geq 45 goto tunnel
timeout /t 2 /nobreak >nul
goto bekle

:tunnel
echo   [2/2] Cloudflare Tunnel baslatiliyor...
start "Cloudflare Tunnel" cmd /k "cd /d ""%~dp0."" && npm run tunnel:cloudflare || pause"
echo.
echo   Bitti. Iki pencere acik: Dev + Tunnel. URL Cloudflare penceresinde.
timeout /t 2 /nobreak >nul
