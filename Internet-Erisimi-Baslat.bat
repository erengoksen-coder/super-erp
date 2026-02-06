@echo off
cd /d "%~dp0"
title LIVASOFA ERP - Internet Erisimi

echo.
echo ========================================
echo   LIVASOFA ERP - Internet Erisimi
echo ========================================
echo.
echo Sunucu ve ngrok baslatiliyor...
echo Tum internetten erisim icin ngrok URL'i acilan pencerede gorunecek.
echo.

powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0scripts\start-internet.ps1" -NoPrompt

if errorlevel 1 (
  echo.
  echo Hata olustu. Ngrok kurulu ve token ayarli mi kontrol edin.
  echo Token: NGROK_TOKEN_YAPISTIR.txt veya ngrok config add-authtoken YOUR_TOKEN
  echo.
)
pause
