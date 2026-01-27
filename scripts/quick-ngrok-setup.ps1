# Hizli Ngrok Kurulum ve Baslatma

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Ngrok Hizli Kurulum" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Ngrok kontrolu
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue

if (-not $ngrokInstalled) {
    Write-Host "Ngrok bulunamadi!" -ForegroundColor Red
    Write-Host ""
    Write-Host "HIZLI KURULUM:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Tarayiciyi acin ve su adrese gidin:" -ForegroundColor Cyan
    Write-Host "   https://ngrok.com/download" -ForegroundColor White
    Write-Host ""
    Write-Host "2. Windows icin ZIP dosyasini indirin" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. ZIP'i acin ve ngrok.exe'yi C:\ngrok\ klasorune kopyalayin" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "4. PATH'e ekleyin (PowerShell'i Yonetici olarak acin):" -ForegroundColor Cyan
    Write-Host "   [Environment]::SetEnvironmentVariable('Path', `$env:Path + ';C:\ngrok', [EnvironmentVariableTarget]::Machine)" -ForegroundColor White
    Write-Host ""
    Write-Host "5. VEYA tam yol ile kullanin:" -ForegroundColor Cyan
    Write-Host "   C:\ngrok\ngrok.exe http 3000" -ForegroundColor White
    Write-Host ""
    Write-Host "6. Token ayarlayin:" -ForegroundColor Yellow
    Write-Host "   a) https://dashboard.ngrok.com/get-started/your-authtoken adresine gidin" -ForegroundColor Cyan
    Write-Host "   b) Token'i kopyalayin" -ForegroundColor Cyan
    Write-Host "   c) ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor White
    Write-Host ""
    Write-Host "Kurulum tamamlandiktan sonra bu scripti tekrar calistirin." -ForegroundColor Green
    exit 1
}

Write-Host "OK: Ngrok bulundu!" -ForegroundColor Green
Write-Host ""

# Token kontrolu
Write-Host "Token kontrol ediliyor..." -ForegroundColor Yellow
$tokenCheck = ngrok config check 2>&1

if ($LASTEXITCODE -ne 0 -or $tokenCheck -like "*not found*" -or $tokenCheck -like "*error*") {
    Write-Host "UYARI: Token ayarlanmamis!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Token ayarlamak icin:" -ForegroundColor Cyan
    Write-Host "1. https://dashboard.ngrok.com/get-started/your-authtoken adresine gidin" -ForegroundColor White
    Write-Host "2. Token'i kopyalayin" -ForegroundColor White
    Write-Host "3. Su komutu calistirin:" -ForegroundColor White
    Write-Host "   ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Token ayarlandiktan sonra bu scripti tekrar calistirin." -ForegroundColor Green
    exit 1
}

Write-Host "OK: Token ayarli!" -ForegroundColor Green
Write-Host ""

# Sunucu kontrolu
Write-Host "Sunucu kontrol ediliyor..." -ForegroundColor Yellow
$serverCheck = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue

if (-not $serverCheck) {
    Write-Host "UYARI: Sunucu calismiyor!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Once sunucuyu baslatin:" -ForegroundColor Cyan
    Write-Host "   cd D:\super-erp" -ForegroundColor White
    Write-Host "   npm run dev:simple" -ForegroundColor White
    Write-Host ""
    Write-Host "Sunucu basladiktan sonra bu scripti tekrar calistirin." -ForegroundColor Green
    exit 1
}

Write-Host "OK: Sunucu calisiyor!" -ForegroundColor Green
Write-Host ""

# Ngrok'u baslat
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Ngrok Baslatiliyor" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Ngrok web arayuzu: http://localhost:4040" -ForegroundColor Cyan
Write-Host ""
Write-Host "Telefonda kullanmak icin:" -ForegroundColor Yellow
Write-Host "1. http://localhost:4040 adresine gidin" -ForegroundColor White
Write-Host "2. 'Forwarding' bolumundeki HTTPS URL'yi kopyalayin" -ForegroundColor White
Write-Host "3. Bu URL'yi telefonda kullanin" -ForegroundColor White
Write-Host ""
Write-Host "Durdurmak icin Ctrl+C basin" -ForegroundColor Yellow
Write-Host ""

# Ngrok'u baslat
ngrok http 3000

