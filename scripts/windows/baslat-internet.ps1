# ============================================
# SUPER ERP - Tek komutla sunucu + internet
# ============================================
# 1. Gerekirse token ister (bir kez)
# 2. Sunucu yoksa baslatir
# 3. Ngrok acar ve URL verir

param([switch]$TokenGir = $false)

$ErrorActionPreference = "Stop"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = Split-Path -Parent $scriptPath
Set-Location $projectPath

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SUPER ERP - Baslat" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Token kontrolu - once NGROK_TOKEN_YAPISTIR.txt dosyasina bak
$tokenFile = Join-Path $projectPath "NGROK_TOKEN_YAPISTIR.txt"
$token = $null
if (Test-Path $tokenFile) {
    $token = (Get-Content $tokenFile -Raw -ErrorAction SilentlyContinue).Trim()
    if ($token -like "*BURAYA*" -or $token.Length -lt 20) { $token = $null }
}
# Yoksa ngrok config'te gecerli token var mi bak
$tokenOk = $false
if (-not $token -and -not $TokenGir) {
    $null = ngrok config check 2>&1
    if ($LASTEXITCODE -eq 0) { $tokenOk = $true }
}

if ($token) {
    Write-Host "Token dosyadan okundu (NGROK_TOKEN_YAPISTIR.txt)." -ForegroundColor Gray
    & ngrok config add-authtoken $token
    if ($LASTEXITCODE -ne 0) {
        Write-Host "HATA: Dosyadaki token gecersiz. Dosyayi kontrol edin veya silip tekrar deneyin." -ForegroundColor Red
        exit 1
    }
    Write-Host "OK: Token kaydedildi." -ForegroundColor Green
    Write-Host ""
} elseif (-not $tokenOk -or $TokenGir) {
    Write-Host "Ngrok token gerekiyor." -ForegroundColor Yellow
    Write-Host "1. NGROK_TOKEN_YAPISTIR.txt dosyasini acin, 'BURAYA_TOKEN_YAPISTIR' yazisini silin," -ForegroundColor White
    Write-Host "   dashboard'dan kopyaladiginiz token'i yapistirip kaydedin. Veya asagida yapistirip Enter:" -ForegroundColor White
    Write-Host ""
    $token = Read-Host "Token"
    $token = ($token -replace '"', '').Trim()
    if ([string]::IsNullOrWhiteSpace($token) -or $token -like "*BURAYA*" -or $token.Length -lt 20) {
        Write-Host "HATA: Gecerli token girin. Dashboard'dan kopyalayip yapistirin." -ForegroundColor Red
        exit 1
    }
    & ngrok config add-authtoken $token
    if ($LASTEXITCODE -ne 0) {
        Write-Host "HATA: Token kaydedilemedi." -ForegroundColor Red
        exit 1
    }
    Write-Host "OK: Token kaydedildi." -ForegroundColor Green
    Write-Host ""
}

# Port 3000 uzerindeki process'i durdur (PowerShell'de $PID ayrilmis oldugu icin portOwnerId kullanilir)
Write-Host "Port 3000 hazirlaniyor..." -ForegroundColor Yellow
$portConn = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -First 1
if ($portConn) {
    $portOwnerId = $portConn.OwningProcess
    if ($portOwnerId -is [array]) { $portOwnerId = $portOwnerId[0] }
    Stop-Process -Id $portOwnerId -Force -ErrorAction SilentlyContinue
    Write-Host "Eski sunucu durduruldu (PID: $portOwnerId)." -ForegroundColor Gray
    Start-Sleep -Seconds 3
}

# Her seferinde guncel build (kayit "yönetici" vb. duzeltmeler icin)
Write-Host "Build aliniyor (guncel kod, 1-2 dakika surer)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "HATA: Build basarisiz." -ForegroundColor Red
    exit 1
}
Write-Host "OK: Build tamamlandi." -ForegroundColor Green

# Production sunucuyu baslat
Write-Host "Production sunucu baslatiliyor (port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; Write-Host 'SUPER ERP - Production' -ForegroundColor Green; npm run start" -WindowStyle Normal
Write-Host "Sunucunun acilmasi icin 12 saniye bekleniyor..." -ForegroundColor Gray
Start-Sleep -Seconds 12

$serverOk = $false
try {
    $conn = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($conn) { $serverOk = $true }
} catch { }
if (-not $serverOk) {
    Write-Host "UYARI: Port 3000 henuz acik olmayabilir. Ngrok yine de aciliyor." -ForegroundColor Yellow
} else {
    Write-Host "OK: Sunucu hazir (production)." -ForegroundColor Green
}
Write-Host ""

# Eski ngrok kapat
Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Ngrok baslat
Write-Host "Ngrok baslatiliyor..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; Write-Host 'Ngrok - Bu pencereyi kapatmayin' -ForegroundColor Green; ngrok http http://127.0.0.1:3000" -WindowStyle Normal
Start-Sleep -Seconds 8

# URL al
$url = $null
foreach ($i in 1..12) {
    try {
        $r = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2 -ErrorAction Stop
        $t = $r.tunnels | Where-Object { $_.proto -eq "https" }
        if ($t) { $url = $t.public_url; break }
    } catch { }
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  HAZIR" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
if ($url) {
    Write-Host "Internet adresi:" -ForegroundColor Cyan
    Write-Host "  $url" -ForegroundColor White -BackgroundColor DarkGreen
    Write-Host ""
    Write-Host "Tarayicida bu adresi acin. Giris: $url/auth/login" -ForegroundColor Gray
    try { $url | Set-Clipboard } catch { }
} else {
    Write-Host "Ngrok URL alinamadi. Pencereyi kontrol edin veya: http://localhost:4040" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Yerel: http://localhost:3000" -ForegroundColor Gray
Write-Host ""
