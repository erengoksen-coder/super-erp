@echo off
cd /d "%~dp0.."
title LIVASOFA ERP - Sunucu (Tek Pencere)

echo.
echo ========================================
echo   LIVASOFA ERP - Sunucu Baslat
echo   (Hata olursa bu pencerede gorunur)
echo ========================================
echo.

echo [1] Port 3000, 3001, 3444 kapatiliyor...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000.*LISTENING"') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3001.*LISTENING"') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3444.*LISTENING"') do taskkill /PID %%a /F >nul 2>&1
timeout /t 3 /nobreak >nul

echo [2] Kilit dosyasi siliniyor...
if exist ".next\dev\lock" del /f /q ".next\dev\lock" 2>nul
timeout /t 1 /nobreak >nul

echo [3] Sunucu baslatiliyor (port 3000)...
echo.
echo     "Starting..." gorundukten sonra 1-2 dakika bekleyin.
echo     "Ready" veya ilk sayfa adi gorununce tarayicida acin:
echo       http://localhost:3000   veya   http://127.0.0.1:3000
echo.
echo     Durdurmak icin: Ctrl+C
echo.
npm run dev:simple

pause
