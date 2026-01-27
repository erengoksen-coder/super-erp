# BOM Hariç Tüm Verileri Silme Scripti

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BOM Hariç Tüm Veriler Siliniyor" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "UYARI: Bu islem geri alinamaz!" -ForegroundColor Red
Write-Host "BOM (Urun Receteleri) korunacak, diger tum veriler silinecek." -ForegroundColor Yellow
Write-Host ""
Write-Host "Devam etmek istiyor musunuz? (E/H)" -ForegroundColor Yellow
$response = Read-Host

if ($response -ne "E" -and $response -ne "e") {
    Write-Host "Islem iptal edildi." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Temizleme baslatiliyor..." -ForegroundColor Cyan
Write-Host ""

$projectPath = "D:\super-erp"
Set-Location $projectPath

# Node.js script'ini calistir
node scripts/clear-all-except-bom.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Basarili!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  Hata Olustu!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}

