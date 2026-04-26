# Next.js Lock Dosyasini Temizle ve Baslat

Write-Host "Next.js lock dosyasi temizleniyor..." -ForegroundColor Yellow

$projectPath = "D:\super-erp"
Set-Location $projectPath

# Lock dosyasini sil
if (Test-Path ".next\dev\lock") {
    Remove-Item ".next\dev\lock" -Force
    Write-Host "OK: Lock dosyasi silindi" -ForegroundColor Green
} else {
    Write-Host "Lock dosyasi bulunamadi" -ForegroundColor Yellow
}

# Node process'lerini durdur
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Node process'leri durduruluyor..." -ForegroundColor Yellow
    $nodeProcesses | Stop-Process -Force
    Write-Host "OK: Node process'leri durduruldu" -ForegroundColor Green
    Start-Sleep -Seconds 2
}

# Port 3000'i kullanan process'i durdur
$portProcess = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($portProcess) {
    Write-Host "Port 3000'i kullanan process durduruluyor..." -ForegroundColor Yellow
    Get-Process -Id ($portProcess.OwningProcess) -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "OK: Port 3000 temizlendi" -ForegroundColor Green
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "Sunucu baslatiliyor..." -ForegroundColor Cyan
Write-Host ""

# Sunucuyu baslat
npm run dev:simple

