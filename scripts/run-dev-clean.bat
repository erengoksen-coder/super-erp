@echo off
cd /d "%~dp0.."
title LIVASOFA ERP - Next.js (Temiz baslangic)
echo.
echo .next ve .turbo temizleniyor...
if exist .next rmdir /s /q .next 2>nul
if exist .turbo rmdir /s /q .turbo 2>nul
if exist .next\dev\lock del /f /q .next\dev\lock 2>nul
echo Tamam. Sunucu baslatiliyor (ilk acilis 1-2 dakika surebilir)...
echo.
call npm run dev:simple:clean
pause
