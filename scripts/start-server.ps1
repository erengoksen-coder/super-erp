# Next.js Sunucusunu Baslatma Scripti

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SUPER ERP - Sunucu Baslatma" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectPath = "D:\super-erp"
Set-Location $projectPath

# Eski process'leri durdur
Write-Host "Eski process'ler temizleniyor..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Port kontrolu
$port = 3000
$portInUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "Port $port kullaniliyor, temizleniyor..." -ForegroundColor Yellow
    Get-Process -Id ($portInUse.OwningProcess) -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# .next klasorunu temizle
if (Test-Path ".next") {
    Write-Host ".next klasoru temizleniyor..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Sunucu baslatiliyor..." -ForegroundColor Cyan
Write-Host "URL: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Durdurmak icin Ctrl+C basin" -ForegroundColor Yellow
Write-Host ""

# Sunucuyu baslat
npm run dev:simple

