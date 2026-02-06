# Ngrok Baslatma (Token Ayarli)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Ngrok Baslatiliyor" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = Split-Path -Parent $scriptPath
Set-Location $projectPath

# Sunucu kontrolu
Write-Host "Sunucu kontrol ediliyor..." -ForegroundColor Yellow
$serverRunning = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue

if (-not $serverRunning) {
    Write-Host "UYARI: Sunucu calismiyor!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Once sunucuyu baslatin:" -ForegroundColor Cyan
    Write-Host "   cd $projectPath" -ForegroundColor White
    Write-Host "   npm run dev:simple" -ForegroundColor White
    Write-Host ""
    Write-Host "Sunucu basladiktan sonra bu scripti tekrar calistirin." -ForegroundColor Yellow
    exit 1
}

Write-Host "OK: Sunucu calisiyor (port 3000)" -ForegroundColor Green
Write-Host ""

# Ngrok'u baslat
Write-Host "Ngrok baslatiliyor..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Bir kac saniye sonra:" -ForegroundColor Yellow
Write-Host "1. http://localhost:4040 adresine gidin" -ForegroundColor White
Write-Host "2. 'Forwarding' bolumundeki HTTPS URL'yi kopyalayin" -ForegroundColor White
Write-Host "3. Bu URL'yi telefonda (mobil veri veya farkli WiFi) kullanin" -ForegroundColor White
Write-Host ""
Write-Host "Durdurmak icin Ctrl+C basin" -ForegroundColor Yellow
Write-Host ""

# Ngrok'u baslat
ngrok http 3000

