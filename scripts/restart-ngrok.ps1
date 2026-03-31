# Ngrok'u Yeniden Baslatma Scripti

Write-Host "Ngrok yeniden baslatiliyor..." -ForegroundColor Cyan
Write-Host ""

# Eski ngrok process'lerini durdur
$ngrokProcesses = Get-Process ngrok -ErrorAction SilentlyContinue
if ($ngrokProcesses) {
    Write-Host "Eski ngrok process'leri durduruluyor..." -ForegroundColor Yellow
    $ngrokProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# Sunucu kontrolu
$serverRunning = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue
if (-not $serverRunning) {
    Write-Host "HATA: Sunucu calismiyor!" -ForegroundColor Red
    Write-Host "Once sunucuyu baslatin: npm run dev:simple" -ForegroundColor Yellow
    exit 1
}

Write-Host "OK: Sunucu calisiyor" -ForegroundColor Green
Write-Host ""

# Ngrok'u baslat
$projectPath = "D:\super-erp"
Write-Host "Ngrok baslatiliyor..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Ngrok web arayuzu: http://localhost:4040" -ForegroundColor Green
Write-Host ""
Write-Host "URL'yi gormek icin http://localhost:4040 adresine gidin" -ForegroundColor Yellow
Write-Host ""

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; Write-Host 'Ngrok Baslatiliyor...' -ForegroundColor Cyan; Write-Host 'Web arayuz: http://localhost:4040' -ForegroundColor Green; Write-Host ''; ngrok http 3000"

Write-Host "Ngrok baslatildi!" -ForegroundColor Green
Write-Host ""
Write-Host "Bir kac saniye bekleyin, sonra http://localhost:4040 adresine gidin" -ForegroundColor Yellow

