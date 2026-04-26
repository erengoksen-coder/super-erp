@echo off
setlocal
chcp 65001 > nul

echo.
echo ============================================================
echo   Super-ERP GitHub Otomatik Yedekleme Baslatiliyor...
echo ============================================================
echo.

:: Git klasorunde oldugumuzdan emin olalim
pushd %~dp0..

echo [1/3] Degisiklikler taraniyor... (git add .)
git add .
if %errorlevel% neq 0 (
    echo.
    echo [HATA] Dosyalar eklenirken bir sorun Olustu!
    exit /b %errorlevel%
)
echo [TAMAM] Degisiklikler hazirlandi.

set "commit_msg=Super-ERP Otomatik Guncelleme: %DATE% %TIME%"
echo.
echo [2/3] Degisiklikler commit ediliyor... (git commit)
echo Mesaj: "%commit_msg%"
git commit -m "%commit_msg%" 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [BILGI] Commit edilecek yeni bir degisiklik bulunamadi.
) else (
    echo [TAMAM] Degisiklikler yerel depoya kaydedildi.
)

echo.
echo [3/3] GitHub'a gonderiliyor... (git push origin master)
echo Lutfen bekleyin, bu islem internet hiziniza gore surebilir...
git push origin master
if %errorlevel% neq 0 (
    echo.
    echo [HATA] GitHub'a gonderme islemi basarisiz oldu!
    echo Lutfen internet baglantinizi kontrol edin.
    exit /b %errorlevel%
)

echo.
echo ============================================================
echo   TEBRIKLER! Projeniz GitHub'da GUVENDE.
echo ============================================================
echo.

popd
pause
