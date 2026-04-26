# Sunucu ve Ngrok Baslatma Scripti

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SUPER ERP - Internet Erisimi" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectPath = "D:\super-erp"
Set-Location $projectPath

# Sunucu kontrolu
Write-Host "Sunucu kontrol ediliyor..." -ForegroundColor Yellow
$serverRunning = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue

if (-not $serverRunning) {
    Write-Host "Sunucu calismiyor, baslatiliyor..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "TERMINAL 1 - Sunucu baslatiliyor..." -ForegroundColor Green
    Write-Host "Bu terminali kapatmayin!" -ForegroundColor Yellow
    Write-Host ""
    
    # Sunucuyu yeni pencerede baslat
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; Write-Host 'Next.js Sunucusu Baslatiliyor...' -ForegroundColor Cyan; npm run dev:simple"
    
    Write-Host "Sunucunun baslamasi icin 10 saniye bekleniyor..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Sunucu kontrolu
    $serverRunning = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue
    if (-not $serverRunning) {
        Write-Host "HATA: Sunucu baslatilamadi!" -ForegroundColor Red
        Write-Host "Manuel olarak baslatin: npm run dev:simple" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "OK: Sunucu calisiyor!" -ForegroundColor Green
Write-Host ""

# Ngrok kontrolu
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokInstalled) {
    Write-Host "HATA: Ngrok bulunamadi!" -ForegroundColor Red
    Write-Host "Kurulum icin: .\scripts\install-ngrok.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "OK: Ngrok bulundu!" -ForegroundColor Green
Write-Host ""

# Ngrok'u baslat
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Ngrok Baslatiliyor" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "TERMINAL 2 - Ngrok baslatiliyor..." -ForegroundColor Green
Write-Host ""
Write-Host "Ngrok web arayuzu: http://localhost:4040" -ForegroundColor Cyan
Write-Host ""
Write-Host "Telefonda kullanmak icin:" -ForegroundColor Yellow
Write-Host "1. http://localhost:4040 adresine gidin" -ForegroundColor White
Write-Host "2. 'Forwarding' bolumundeki HTTPS URL'yi kopyalayin" -ForegroundColor White
Write-Host "3. Bu URL'yi telefonda (mobil veri veya farkli WiFi) kullanin" -ForegroundColor White
Write-Host ""
Write-Host "Durdurmak icin Ctrl+C basin" -ForegroundColor Yellow
Write-Host ""

# Ngrok'u yeni pencerede baslat
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; Write-Host 'Ngrok Baslatiliyor...' -ForegroundColor Cyan; ngrok http 3000"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  HAZIR!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Iki terminal penceresi acildi:" -ForegroundColor Cyan
Write-Host "1. Next.js Sunucusu (Terminal 1)" -ForegroundColor White
Write-Host "2. Ngrok (Terminal 2)" -ForegroundColor White
Write-Host ""
Write-Host "Ngrok URL'ini gormek icin:" -ForegroundColor Yellow
Write-Host "   http://localhost:4040" -ForegroundColor Cyan
Write-Host ""

