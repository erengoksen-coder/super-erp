@echo off
setlocal
title Agi-OS Platinum - LIVASOFA ERP
mode con: cols=100 lines=30
color 0B

echo.
echo  ================================================================================
echo     ___  ____ ___          ____   ____    ____  _         _   _                      
echo    / _ \/ ___|_ _|        / ___| / __ \  |  _ \| |       / \ | |                     
echo   / /_\ \ |_ | |  _____  | |  _ | |  | | | |_) | |      / _ \| |                     
echo  / /___\ \__| | | |_____| | |_| || |__| | |  __/| |___  / ___ \ |                     
echo /_/     \_\____|___|       \____/  |_|   |_____|/_/   \_\_|                     
echo  ================================================================================
echo.
echo               AGI-OS PLATINUM: KURUMSAL ERP MODERNİZASYON SİSTEMİ                
echo  ================================================================================
echo.

:: 1. Ortam Değişkenleri Yapılandır
set BASE_DIR=%~dp0
set NODE_DIR=%BASE_DIR%node_bin\node-v23.9.0-win-x64
set PATH=%NODE_DIR%;%PATH%
set PORT=3001

:: Node kontrolü
if not exist "%NODE_DIR%\node.exe" (
    color 0C
    echo  [HATA] Node.exe bulunamadi!
    echo  [YOL] %NODE_DIR%\node.exe
    echo.
    echo  Lutfen proje klasor yapisini kontrol edin.
    pause
    exit /b 1
)

echo  [SİSTEM] Agi-OS cekirdegi dogrulandi.
echo  [SİSTEM] Port: %PORT%
echo  [SİSTEM] Dizin: %BASE_DIR%
echo.

:: 2. Ön-Kontrol ve Temizlik (Opsiyonel)
set /p CLEAN="[SORU] Onbellegi temizleyip (Clean Start) baslatmak ister misiniz? (E/H): "
if /i "%CLEAN%"=="E" (
    echo.
    echo  [TEMİZLİK] .next ve node_modules/.cache dizinleri temizleniyor...
    if exist "%BASE_DIR%.next" rmdir /s /q "%BASE_DIR%.next"
    if exist "%BASE_DIR%node_modules\.cache" rmdir /s /q "%BASE_DIR%node_modules\.cache"
    echo  [TAMAM] Temizlik basarili.
    echo.
)

:: 3. Uygulama Başlatma
echo  [BAŞLAT] Agi-OS Platinum sunucu motoru calistiriliyor...
echo  [LİNK] Tarayıcıyı açın: http://localhost:%PORT%
echo.
echo  --------------------------------------------------------------------------------
echo  LOG KAYITLARI:
echo  --------------------------------------------------------------------------------

:: cmd /c call is safer for node_bin
cd /d "%BASE_DIR%"
call "%NODE_DIR%\npm.cmd" run dev -- --port %PORT%

echo.
echo  [BİLGİ] Sistem kapandi.
pause
ması (Relative Paths)