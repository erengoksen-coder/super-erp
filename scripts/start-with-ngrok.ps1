# Ngrok ile Internetten Erisilebilir Baslatma Scripti

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SUPER ERP - Ngrok ile Baslatma" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Ngrok kontrolu
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue

if (-not $ngrokInstalled) {
    Write-Host "HATA: Ngrok bulunamadi!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Ngrok'u yuklemek icin:" -ForegroundColor Yellow
    Write-Host "1. https://ngrok.com/download adresinden indirin" -ForegroundColor Yellow
    Write-Host "2. ZIP'i acin ve ngrok.exe'yi PATH'e ekleyin" -ForegroundColor Yellow
    Write-Host "3. Veya Chocolatey ile: choco install ngrok" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ngrok token ayarlamak icin:" -ForegroundColor Yellow
    Write-Host "ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "OK: Ngrok bulundu" -ForegroundColor Green
Write-Host ""

# Proje dizinine git
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = Split-Path -Parent $scriptPath
if (-not (Test-Path $projectPath)) {
    Write-Host "HATA: Proje dizini bulunamadi: $projectPath" -ForegroundColor Red
    exit 1
}

Set-Location $projectPath

# Port kontrolu
$port = 3000
$portInUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if ($portInUse) {
    Write-Host "UYARI: Port $port zaten kullaniliyor!" -ForegroundColor Yellow
    Write-Host "Mevcut process'i durdurmak ister misiniz? (E/H)" -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq "E" -or $response -eq "e") {
        Get-Process -Id ($portInUse.OwningProcess) -ErrorAction SilentlyContinue | Stop-Process -Force
        Write-Host "OK: Process durduruldu" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host "HATA: Islem iptal edildi" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Next.js sunucusu baslatiliyor..." -ForegroundColor Cyan
Write-Host ""

# Next.js'i arka planda baslat
$nextjsJob = Start-Job -ScriptBlock {
    Set-Location $using:projectPath
    npm run dev:simple
}

Write-Host "Sunucu baslatiliyor, lutfen bekleyin..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Sunucunun hazir olup olmadigini kontrol et
$maxAttempts = 30
$attempt = 0
$serverReady = $false

while ($attempt -lt $maxAttempts -and -not $serverReady) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$port" -TimeoutSec 2 -ErrorAction Stop
        $serverReady = $true
    } catch {
        $attempt++
        Start-Sleep -Seconds 1
    }
}

if (-not $serverReady) {
    Write-Host "HATA: Sunucu baslatilamadi!" -ForegroundColor Red
    Stop-Job $nextjsJob
    Remove-Job $nextjsJob
    exit 1
}

Write-Host "OK: Sunucu hazir!" -ForegroundColor Green
Write-Host ""

# Ngrok'u baslat
Write-Host "Ngrok tuneli olusturuluyor..." -ForegroundColor Cyan
Write-Host ""

# Ngrok'u yeni bir PowerShell penceresinde baslat
$ngrokProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; ngrok http $port" -PassThru

Write-Host "Ngrok baslatildi (PID: $($ngrokProcess.Id))" -ForegroundColor Green
Write-Host "Ngrok'un hazir olmasi icin 3 saniye bekleniyor..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "========================================" -ForegroundColor Green
Write-Host "  OK: Sistem Hazir!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Ngrok URL'ini gormek icin:" -ForegroundColor Yellow
Write-Host "   http://localhost:4040 adresine gidin" -ForegroundColor Yellow
Write-Host ""
Write-Host "Internetten erisim icin ngrok URL'ini kullanin" -ForegroundColor Cyan
Write-Host ""
Write-Host "Durdurmak icin Ctrl+C basin" -ForegroundColor Yellow
Write-Host ""

# Next.js ciktisini goster
Receive-Job $nextjsJob -Wait
