# BOM ve Ayarlar Haric Tum Is Verilerini Silme
# Korunan: BOM, urunler, malzemeler, cari hesaplar, kullanicilar, ayarlar.
# Silinen: Siparisler, uretim emirleri, barkodlar, sevkiyatlar, faturalar, vb.

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BOM / Ayarlar Haric Veriler Silinecek" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "UYARI: Bu islem geri alinamaz!" -ForegroundColor Red
Write-Host "Korunacak: BOM, urunler, malzemeler, cari hesaplar, kullanicilar, hesap plani." -ForegroundColor Green
Write-Host "Silinecek: Siparisler, uretim emirleri, barkodlar, sevkiyatlar, faturalar, islemler." -ForegroundColor Yellow
Write-Host ""
Write-Host "Devam etmek istiyor musunuz? (E/H)" -ForegroundColor Yellow
$response = Read-Host

if ($response -ne "E" -and $response -ne "e") {
    Write-Host "Islem iptal edildi." -ForegroundColor Yellow
    exit 0
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = Split-Path -Parent $scriptDir
Set-Location $projectPath

$env:ALLOW_DB_RESET = "true"
node scripts/clear-all-except-bom.js
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Temizlik tamamlandi." -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  Hata olustu (cikis kodu: $exitCode)." -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}
exit $exitCode
