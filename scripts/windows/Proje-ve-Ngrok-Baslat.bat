@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  ========================================
echo    SUPER ERP - Proje + Ngrok Baslat
echo  ========================================
echo.

:: 1) Sunucuyu yeni pencerede baslat (port sifirlama + npm run dev)
start "Super ERP - Sunucu" cmd /k "cd /d "%~dp0" && npm run dev:reset"

:: 2) Sunucu acilana kadar bekle
echo  Sunucu aciliyor, 20 saniye bekleniyor...
timeout /t 20 /nobreak >nul

:: 3) Ngrok'u ac (ayri pencere acilir)
echo  Ngrok baslatiliyor...
call npm run ngrok:ac

echo.
echo  Tamam. Sunucu ve Ngrok pencereleri acik.
echo  URL icin Ngrok penceresine veya http://localhost:4040 bakin.
echo.
pause
