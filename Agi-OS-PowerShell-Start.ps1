# Agi-OS Platinum - PowerShell Startup
$BASE_DIR = $PSScriptRoot
$NODE_DIR = Join-Path $BASE_DIR "node_bin\node-v23.9.0-win-x64"
$env:Path = "$NODE_DIR;" + $env:Path

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   AGI-OS PLATINUM: SISTEM BASLATILIYOR   " -ForegroundColor White -BackgroundColor Blue
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Kill old node processes
Write-Host "[1/3] Eskı ıslemler temızlenıyor..."
Stop-Process -Name "node" -ErrorAction SilentlyContinue

# 2. Check node
Write-Host "[2/3] Node sürümü: " -NoNewline
& "$NODE_DIR\node.exe" -v

# 3. Start App
Write-Host "[3/3] Sunucu baslatiliyor (Port 3000)..."
Set-Location $BASE_DIR
& "$NODE_DIR\npm.cmd" run dev

Write-Host "Baslatilamadi veya durduruldu."
Read-Host "Kapatmak için Enter'a basin..."
