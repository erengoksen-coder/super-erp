# Üretim Emirleri, Üretim Takvimi, Usta Terminali ve Sevkiyat Siparişlerini Silme Scripti

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Üretim ve Sevkiyat Verileri Siliniyor" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Join-Path $PSScriptRoot "clear-production-shipment-orders.js"

if (Test-Path $scriptPath) {
    node $scriptPath
} else {
    Write-Host "HATA: Script dosyası bulunamadı: $scriptPath" -ForegroundColor Red
    exit 1
}

