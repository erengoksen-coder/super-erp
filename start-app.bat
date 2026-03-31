@echo off
setlocal
TITLE Super ERP - Local Geliştirme Sunucusu (Agi-OS Platinum Edition)
COLOR 0B

echo ======================================================
echo           SUPER ERP - OTOMATIK BASLATICI
echo ======================================================
echo.

:: Yerel Node.js yolunu PATH'e ekle
set NODE_PATH=%~dp0node_bin\node-v23.9.0-win-x64
if exist "%NODE_PATH%" (
    echo [OK] Yerel Node.js bulundu.
    set "PATH=%NODE_PATH%;%PATH%"
) else (
    echo [UYARI] Yerel Node.js klasoru bulunamadi. Sistem PATH'i kullanilacak.
)

:: Node.js kontrolü
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Node.js yuklu degil veya PATH'e eklenemedi! 
    echo Lutfen node_bin klasorunun varligindan emin olun.
    pause
    exit /b
)

:: Temizlik İşlemleri
echo [TEMIZLIK] Eski baglantilar ve bellek temizleniyor...

:: Tüm node süreçlerini öldür (Daha radikal temizlik)
taskkill /F /IM node.exe /T >nul 2>&1

:: Port 3000 kontrolü ve temizliği
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: .next klasörünü temizle (ChunkLoadError ve önbellek hataları için)
if exist ".next" (
    echo [TEMIZLIK] .next onbellek klasoru siliniyor...
    rmdir /s /q ".next"
)

:: tmp klasörünü temizle
if exist "tmp" (
    rmdir /s /q "tmp"
)

:: Veritabanı kilidinin kalkması için kısa bir bekleme
timeout /t 2 /nobreak >nul

:: node_modules kontrolü
if not exist "node_modules\" (
    echo [BILGI] node_modules bulunamadi. Bagimliliklar yukleniyor...
    call npm install
)

:: Uygulamayı başlat
echo.
echo [OK] Sunucu tertemiz bir sekilde baslatiliyor...
echo [IP] Yerel Adre: http://localhost:3000
echo.
echo ! DIKKAT: Ilk acilis derleme yapildigi icin biraz zaman alabilir.
echo.

call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [!] Sunucu beklenmedik sekilde durdu.
    pause
)

endlocal
