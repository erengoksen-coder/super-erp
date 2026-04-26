@echo off
TITLE Zenith Business OS - Launching Suite
COLOR 0B
SETLOCAL

echo.
echo  ###############################################################
echo  #                                                             #
echo  #          ZENITH BUSINESS OS - PLATINUM EDITION              #
echo  #               SMART FACTORY CONTROL SYSTEM                  #
echo  #                                                             #
echo  ###############################################################
echo.

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    COLOR 0C
    echo [ERROR] Node.js bulunamadi! Lutfen Node.js yukleyin.
    pause
    exit /b
)

echo [1/3] Sistem bilesenleri kontrol ediliyor...
if not exist "node_modules" (
    echo [INFO] node_modules bulunamadi, yukleme baslatiliyor...
    call npm install
)

echo [2/3] Veritabani baglantisi saglaniyor...
if not exist "data" mkdir "data"

echo [3/3] Zenith Engine baslatiliyor...
echo.
echo [ZENITH] Uygulama birazdan http://localhost:3000 adresinde acilacaktir.
echo [ZENITH] Terminali kapatmak uygulamayi durdurur.
echo.

:: Open browser after a short delay
start "" "http://localhost:3000"

:: Start Next.js
call npm run dev

pause
