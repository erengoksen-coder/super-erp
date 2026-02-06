# ============================================
# SUPER ERP - Internet Erisimi (Production)
# ============================================
# ERR_NGROK_3004 aliyorsaniz bu scripti kullanin.
# Once build alir, production sunucusunu baslatir, sonra ngrok acar.

param([int]$Port = 3000)

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = Split-Path -Parent $scriptPath
Set-Location $projectPath

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SUPER ERP - Internet (Production)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Build
Write-Host "1. Build aliniyor..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "HATA: Build basarisiz!" -ForegroundColor Red
    exit 1
}
Write-Host "   OK: Build tamamlandi" -ForegroundColor Green
Write-Host ""

# Port bosalt
$conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($conn) {
    Write-Host "2. Port $Port kullanimda, process durduruluyor..." -ForegroundColor Yellow
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}
Write-Host ""

# Production sunucuyu baslat
Write-Host "3. Production sunucu baslatiliyor..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; Write-Host 'SUPER ERP - Production (port $Port)' -ForegroundColor Green; npm run start" -PassThru
Write-Host "   Sunucunun acilmasi icin 10 saniye bekleniyor..." -ForegroundColor Gray
Start-Sleep -Seconds 10
Write-Host ""

# Ngrok
Write-Host "4. Ngrok baslatiliyor..." -ForegroundColor Yellow
$existingNgrok = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
if ($existingNgrok) {
    $existingNgrok | Stop-Process -Force
    Start-Sleep -Seconds 2
}
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; Write-Host 'Ngrok Tunnel' -ForegroundColor Green; ngrok http http://127.0.0.1:$Port" -PassThru
Write-Host "   Ngrok hazir olana 8 saniye bekleniyor..." -ForegroundColor Gray
Start-Sleep -Seconds 8
Write-Host ""

# URL al
$ngrokUrl = $null
$attempt = 0
while ($attempt -lt 10) {
    try {
        $r = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2 -ErrorAction Stop
        $t = $r.tunnels | Where-Object { $_.proto -eq "https" }
        if ($t) { $ngrokUrl = $t.public_url; break }
    } catch { }
    $attempt++
    Start-Sleep -Seconds 1
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "  HAZIR!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
if ($ngrokUrl) {
    Write-Host "Internet URL:" -ForegroundColor Cyan
    Write-Host "  $ngrokUrl" -ForegroundColor White -BackgroundColor DarkGreen
    Write-Host ""
} else {
    Write-Host "Ngrok URL alinamadi. http://localhost:4040 adresinden kontrol edin." -ForegroundColor Yellow
}
Write-Host "Sunucu: http://localhost:$Port" -ForegroundColor Gray
Write-Host ""
