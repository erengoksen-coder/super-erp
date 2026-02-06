# Ngrok Hata Giderme ve Yeniden Başlatma Scripti
# ERR_NGROK_3200 hatası için

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Ngrok Hata Giderme" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectPath = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $projectPath

# 1. Sunucu kontrolü
Write-Host "1. Sunucu kontrol ediliyor..." -ForegroundColor Yellow
$serverRunning = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue

if (-not $serverRunning) {
    Write-Host "   HATA: Sunucu calismiyor!" -ForegroundColor Red
    Write-Host "   Sunucu baslatiliyor..." -ForegroundColor Yellow
    
    # Sunucuyu başlat
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; Write-Host 'Next.js Sunucusu Baslatiliyor...' -ForegroundColor Cyan; npm run dev" -WindowStyle Minimized
    
    Write-Host "   Sunucunun baslamasi icin 15 saniye bekleniyor..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    
    # Tekrar kontrol
    $serverRunning = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue
    if (-not $serverRunning) {
        Write-Host "   HATA: Sunucu baslatilamadi!" -ForegroundColor Red
        Write-Host "   Manuel olarak baslatin: npm run dev" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "   OK: Sunucu baslatildi" -ForegroundColor Green
} else {
    Write-Host "   OK: Sunucu calisiyor" -ForegroundColor Green
}

Write-Host ""

# 2. Ngrok process kontrolü
Write-Host "2. Ngrok process kontrol ediliyor..." -ForegroundColor Yellow
$ngrokProcesses = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue

if ($ngrokProcesses) {
    Write-Host "   Mevcut ngrok process'leri bulundu, durduruluyor..." -ForegroundColor Yellow
    $ngrokProcesses | Stop-Process -Force
    Start-Sleep -Seconds 3
    Write-Host "   OK: Eski ngrok process'leri durduruldu" -ForegroundColor Green
} else {
    Write-Host "   OK: Eski ngrok process'i yok" -ForegroundColor Green
}

Write-Host ""

# 3. Ngrok kurulum kontrolü
Write-Host "3. Ngrok kurulum kontrol ediliyor..." -ForegroundColor Yellow
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue

if (-not $ngrokInstalled) {
    Write-Host "   HATA: Ngrok bulunamadi!" -ForegroundColor Red
    Write-Host "   Ngrok kurulumu icin:" -ForegroundColor Yellow
    Write-Host "   1. https://ngrok.com/download adresinden indirin" -ForegroundColor White
    Write-Host "   2. ZIP'i acin ve ngrok.exe'yi PATH'e ekleyin" -ForegroundColor White
    Write-Host "   3. Token ayarlayin: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor White
    exit 1
}
Write-Host "   OK: Ngrok bulundu" -ForegroundColor Green

Write-Host ""

# 4. Ngrok token kontrolü
Write-Host "4. Ngrok token kontrol ediliyor..." -ForegroundColor Yellow
try {
    $ngrokConfig = ngrok config check 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   UYARI: Ngrok token ayarlanmamis olabilir" -ForegroundColor Yellow
        Write-Host "   Token ayarlamak icin: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor White
    } else {
        Write-Host "   OK: Ngrok token ayarli" -ForegroundColor Green
    }
} catch {
    Write-Host "   UYARI: Token kontrol edilemedi" -ForegroundColor Yellow
}

Write-Host ""

# 5. Port 4040 kontrolü (ngrok dashboard)
Write-Host "5. Ngrok dashboard port kontrol ediliyor..." -ForegroundColor Yellow
$port4040 = Get-NetTCPConnection -LocalPort 4040 -ErrorAction SilentlyContinue
if ($port4040) {
    Write-Host "   UYARI: Port 4040 kullaniliyor, temizleniyor..." -ForegroundColor Yellow
    # Port'u kullanan process'i durdur
    $process = Get-Process -Id ($port4040.OwningProcess) -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
    Write-Host "   OK: Port 4040 temizlendi" -ForegroundColor Green
} else {
    Write-Host "   OK: Port 4040 hazir" -ForegroundColor Green
}

Write-Host ""

# 6. Ngrok'u yeniden başlat
Write-Host "6. Ngrok yeniden baslatiliyor..." -ForegroundColor Yellow
Write-Host ""

# Ngrok'u yeni pencerede başlat
$ngrokWindow = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; Write-Host '========================================' -ForegroundColor Green; Write-Host '  SUPER ERP - Ngrok Tunnel' -ForegroundColor Green; Write-Host '========================================' -ForegroundColor Green; Write-Host ''; Write-Host 'Ngrok baslatiliyor...' -ForegroundColor Yellow; Write-Host 'Web arayuz: http://localhost:4040' -ForegroundColor Cyan; Write-Host ''; ngrok http http://127.0.0.1:3000" -PassThru

Write-Host "   Ngrok baslatildi (PID: $($ngrokWindow.Id))" -ForegroundColor Green
Write-Host "   Ngrok'un hazir olmasi icin 8 saniye bekleniyor..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

Write-Host ""

# 7. Ngrok URL'ini al
Write-Host "7. Ngrok URL'i aliniyor..." -ForegroundColor Yellow
$ngrokUrl = $null
$maxAttempts = 15
$attempt = 0

while ($attempt -lt $maxAttempts -and -not $ngrokUrl) {
    try {
        $ngrokApiResponse = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 3 -ErrorAction Stop
        if ($ngrokApiResponse.tunnels -and $ngrokApiResponse.tunnels.Count -gt 0) {
            $httpsTunnel = $ngrokApiResponse.tunnels | Where-Object { $_.proto -eq "https" }
            if ($httpsTunnel) {
                $ngrokUrl = $httpsTunnel.public_url
            }
        }
    } catch {
        $attempt++
        Start-Sleep -Seconds 1
    }
}

Write-Host ""

# Sonuç
Write-Host "========================================" -ForegroundColor Green
Write-Host "  TAMAMLANDI!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

if ($ngrokUrl) {
    Write-Host "Yeni Internet URL'i:" -ForegroundColor Cyan
    Write-Host "  $ngrokUrl" -ForegroundColor White -BackgroundColor DarkGreen
    Write-Host ""
    Write-Host "Bu URL'yi kopyalayip kullanabilirsiniz!" -ForegroundColor Green
    Write-Host ""
    
    # URL'yi panoya kopyala
    $ngrokUrl | Set-Clipboard
    Write-Host "URL panoya kopyalandi!" -ForegroundColor Gray
} else {
    Write-Host "UYARI: Ngrok URL'i alinamadi" -ForegroundColor Yellow
    Write-Host "Manuel olarak kontrol edin:" -ForegroundColor Yellow
    Write-Host "  1. http://localhost:4040 adresine gidin" -ForegroundColor White
    Write-Host "  2. 'Forwarding' bolumundeki HTTPS URL'yi kopyalayin" -ForegroundColor White
    Write-Host ""
    Write-Host "Eger hala calismiyorsa:" -ForegroundColor Yellow
    Write-Host "  - Sunucunun calistigindan emin olun: http://localhost:3000" -ForegroundColor White
    Write-Host "  - Ngrok token'inin ayarli oldugundan emin olun" -ForegroundColor White
    Write-Host "  - Internet baglantinizi kontrol edin" -ForegroundColor White
}

Write-Host ""
Write-Host "Bilgiler:" -ForegroundColor Cyan
Write-Host "  - Sunucu: http://localhost:3000" -ForegroundColor White
Write-Host "  - Ngrok Dashboard: http://localhost:4040" -ForegroundColor White
Write-Host "  - Ngrok Process ID: $($ngrokWindow.Id)" -ForegroundColor White
Write-Host ""
