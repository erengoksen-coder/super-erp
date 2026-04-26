@echo off
cd /d "%~dp0.."
title LIVASOFA ERP - Dev Baslat

echo.
echo ========================================
echo   LIVASOFA ERP - Dev Baslat
echo ========================================
echo.
echo Hata surerse: once scripts\sunucu-baslat.bat calistirin.
echo.

echo [1/3] Eski sunucu kapatiliyor (port 3000, 3001, 3444)...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3000.*LISTENING"') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3001.*LISTENING"') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3444.*LISTENING"') do taskkill /PID %%a /F >nul 2>&1
timeout /t 3 /nobreak >nul
echo [2/3] Eski Next.js kilit dosyasi temizleniyor...
if exist ".next\dev\lock" del /f /q ".next\dev\lock" 2>nul
timeout /t 1 /nobreak >nul
echo [3/3] Tamam.
echo.

set CHOICE=
set /p CHOICE="Sunucu + Ngrok (internet erisimi) baslat? E=Evet / H=Hayir (sadece sunucu): "
if /i "%CHOICE%"=="E" goto with_ngrok
if /i "%CHOICE%"=="e" goto with_ngrok

echo.
echo Sunucu penceresi aciliyor...
call start "LIVASOFA ERP - Next.js Sunucusu" cmd /k "%~dp0run-dev-simple.bat"
echo Next.js in acilmasi icin 25 saniye bekleniyor...
timeout /t 25 /nobreak >nul
echo Sunucu hazir mi kontrol ediliyor...
powershell -NoProfile -Command "$u='http://127.0.0.1:3000'; $max=30; $n=0; while ($n -lt $max) { try { $r=Invoke-WebRequest -Uri $u -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop; Write-Host 'Sunucu hazir.' -ForegroundColor Green; exit 0 } catch { $n++; Write-Host ('  Deneme ' + $n + '/' + $max + '...') -ForegroundColor Gray; Start-Sleep -Seconds 2 } }; exit 1"
if not errorlevel 1 (
  echo Tarayici aciliyor...
  start http://localhost:3000
) else (
  echo Zaman asimi. Tarayicida http://localhost:3000 acin.
)
echo.
pause
exit /b 0

:with_ngrok
echo.
echo Sunucu penceresi aciliyor...
start "LIVASOFA ERP - Next.js Sunucusu" cmd /k "%~dp0run-dev-simple.bat"
echo.
echo Sunucu "Ready" olana kadar bekleniyor (en fazla 90 saniye)...
powershell -NoProfile -Command "$u='http://127.0.0.1:3000'; $max=45; $n=0; while ($n -lt $max) { try { $r=Invoke-WebRequest -Uri $u -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop; Write-Host ''; Write-Host 'Sunucu hazir.' -ForegroundColor Green; exit 0 } catch { $n++; Write-Host ('  ' + $n + '/' + $max + ' bekleniyor...') -NoNewline; Start-Sleep -Seconds 2 } }; Write-Host ''; Write-Host 'Zaman asimi.' -ForegroundColor Yellow; exit 1"
if errorlevel 1 (
  echo.
  echo UYARI: Sunucu 90 saniyede hazir olmadi. Next.js penceresinde hata var mi kontrol edin.
  echo Ngrok yine de aciliyor; sunucu Ready olunca ngrok URL'i yenileyin.
  echo.
)
echo Ngrok penceresi aciliyor...
start "LIVASOFA ERP - Ngrok" cmd /k "%~dp0run-ngrok.bat"
timeout /t 2 /nobreak >nul
echo Tarayici aciliyor...
start http://localhost:3000
echo.
echo ========================================
echo   1) Next.js - "Ready" gorunene kadar ngrok URL acilmayabilir
echo   2) Ngrok - HTTPS URL: pencerede veya http://localhost:4040
echo ========================================
echo.
pause
