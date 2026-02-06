# ============================================
# SUPER ERP - Internet Erisimi Baslatma
# ============================================
# Bu script projeyi internetten erisilebilir hale getirir
# Ngrok kullanarak HTTPS tüneli oluşturur

param(
    [int]$Port = 3000,
    [switch]$SkipNgrok = $false,
    [switch]$NoPrompt = $false
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SUPER ERP - Internet Erisimi" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Proje dizinini otomatik algıla
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = Split-Path -Parent $scriptPath

if (-not (Test-Path $projectPath)) {
    Write-Host "HATA: Proje dizini bulunamadi: $projectPath" -ForegroundColor Red
    exit 1
}

Set-Location $projectPath
Write-Host "Proje dizini: $projectPath" -ForegroundColor Gray
Write-Host ""

# Ngrok kontrolu
$ngrokInstalled = $false
if (-not $SkipNgrok) {
    $ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue
    if (-not $ngrokInstalled) {
        Write-Host "UYARI: Ngrok bulunamadi!" -ForegroundColor Yellow
        Write-Host "Ngrok olmadan sadece yerel agda erisilebilir olacak." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Ngrok kurmak icin:" -ForegroundColor Cyan
        Write-Host "  1. https://ngrok.com/download adresinden indirin" -ForegroundColor White
        Write-Host "  2. ZIP'i acin ve ngrok.exe'yi PATH'e ekleyin" -ForegroundColor White
        Write-Host "  3. Token ayarlayin: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor White
        Write-Host ""
        if (-not $NoPrompt) {
            $continue = Read-Host "Ngrok olmadan devam etmek ister misiniz? (E/H)"
            if ($continue -ne "E" -and $continue -ne "e") { exit 1 }
        } else {
            Write-Host "Ngrok olmadan devam ediliyor (-NoPrompt)" -ForegroundColor Gray
        }
    } else {
        Write-Host "OK: Ngrok bulundu" -ForegroundColor Green
    }
}

# Port kontrolu ($PID PowerShell'de ayrilmis oldugu icin process id icin $processId kullanilir)
Write-Host "Port kontrol ediliyor: $Port" -ForegroundColor Yellow
$portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1

if ($portInUse) {
    $processId = $portInUse.OwningProcess
    if ($processId -is [array]) { $processId = $processId[0] }
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($NoPrompt) {
        Write-Host "Port $Port kullanımda - mevcut sunucu kullanılacak (-NoPrompt)" -ForegroundColor Yellow
        if ($process) { Write-Host "  Process: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Gray }
    } else {
        Write-Host "UYARI: Port $Port zaten kullaniliyor!" -ForegroundColor Yellow
        if ($process) { Write-Host "Kullanan process: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Gray }
        Write-Host ""
        $response = Read-Host "Mevcut process'i durdurmak ister misiniz? (E/H)"
        if ($response -eq "E" -or $response -eq "e") {
            if ($process) {
                Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                Write-Host "OK: Process durduruldu" -ForegroundColor Green
                Start-Sleep -Seconds 2
            }
        } else {
            Write-Host "HATA: Islem iptal edildi" -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host "OK: Port $Port hazir" -ForegroundColor Green
Write-Host ""

# Sunucu kontrolu
Write-Host "Sunucu kontrol ediliyor..." -ForegroundColor Yellow
$serverRunning = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue

if (-not $serverRunning) {
    Write-Host "Sunucu calismiyor, baslatiliyor..." -ForegroundColor Yellow
    Write-Host ""
    
    # Port hala doluysa (zombi process) kapat; kilit uyusmazligi onle
    $portProcess = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($portProcess) {
        $procId = $portProcess.OwningProcess
        if ($procId -is [array]) { $procId = $procId[0] }
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        Write-Host "Port $Port kullanan eski process kapatildi." -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
    
    # Eski Next.js kilit dosyasini temizle (baska instance kapanirsa kalabilir)
    $lockFile = Join-Path $projectPath ".next\dev\lock"
    if (Test-Path $lockFile) {
        Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
        Write-Host "Eski kilit dosyasi temizlendi." -ForegroundColor Gray
    }
    Start-Sleep -Seconds 1
    
    # Sunucuyu yeni pencerede baslat (acilan pencerede de kilit silinir)
    $lockRemove = "if (Test-Path '.next\dev\lock') { Remove-Item '.next\dev\lock' -Force }"
    $serverWindow = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; $lockRemove; Write-Host '========================================' -ForegroundColor Cyan; Write-Host '  SUPER ERP - Next.js Sunucusu' -ForegroundColor Cyan; Write-Host '========================================' -ForegroundColor Cyan; Write-Host ''; Write-Host 'Sunucu baslatiliyor...' -ForegroundColor Yellow; Write-Host ''; npm run dev" -PassThru
    
    Write-Host "Sunucunun baslamasi icin 25 saniye bekleniyor..." -ForegroundColor Yellow
    Start-Sleep -Seconds 25
    
    # Sunucu kontrolu
    $maxAttempts = 30
    $attempt = 0
    $serverReady = $false
    
    while ($attempt -lt $maxAttempts -and -not $serverReady) {
        $serverRunning = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
        if ($serverRunning) {
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:$Port" -TimeoutSec 2 -ErrorAction Stop
                $serverReady = $true
            } catch {
                $attempt++
                Start-Sleep -Seconds 1
            }
        } else {
            $attempt++
            Start-Sleep -Seconds 1
        }
    }
    
    if (-not $serverReady) {
        Write-Host "HATA: Sunucu baslatilamadi!" -ForegroundColor Red
        Write-Host "Manuel olarak baslatin: npm run dev" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "OK: Sunucu hazir!" -ForegroundColor Green
} else {
    Write-Host "OK: Sunucu zaten calisiyor!" -ForegroundColor Green
}

Write-Host ""

# Ngrok baslatma
if ($ngrokInstalled -and -not $SkipNgrok) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Ngrok Baslatiliyor" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    # Mevcut ngrok process'lerini kontrol et
    $existingNgrok = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
    if ($existingNgrok -and -not $NoPrompt) {
        Write-Host "UYARI: Ngrok zaten calisiyor!" -ForegroundColor Yellow
        $response = Read-Host "Mevcut ngrok'u durdurup yeniden baslatmak ister misiniz? (E/H)"
        if ($response -eq "E" -or $response -eq "e") {
            Stop-Process -Name "ngrok" -Force -ErrorAction SilentlyContinue
            Write-Host "OK: Ngrok durduruldu" -ForegroundColor Green
            Start-Sleep -Seconds 2
            $existingNgrok = $null
        }
    }
    if (-not $existingNgrok) {
    # Ngrok'u yeni pencerede baslat
    $ngrokWindow = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; Write-Host '========================================' -ForegroundColor Green; Write-Host '  SUPER ERP - Ngrok Tunnel' -ForegroundColor Green; Write-Host '========================================' -ForegroundColor Green; Write-Host ''; Write-Host 'Ngrok baslatiliyor...' -ForegroundColor Yellow; Write-Host ''; ngrok http http://127.0.0.1:$Port" -PassThru
    
    Write-Host "Ngrok baslatildi (PID: $($ngrokWindow.Id))" -ForegroundColor Green
    Write-Host "Ngrok'un hazir olmasi icin 5 saniye bekleniyor..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # Ngrok URL'ini al
    Write-Host ""
    Write-Host "Ngrok URL'ini aliniyor..." -ForegroundColor Yellow
    $ngrokUrl = $null
    $maxAttempts = 10
    $attempt = 0
    
    while ($attempt -lt $maxAttempts -and -not $ngrokUrl) {
        try {
            $ngrokApiResponse = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2 -ErrorAction Stop
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
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  HAZIR!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    if ($ngrokUrl) {
        Write-Host "Internet URL'i:" -ForegroundColor Cyan
        Write-Host "  $ngrokUrl" -ForegroundColor White -BackgroundColor DarkGreen
        Write-Host ""
        Write-Host "Bu URL'yi kopyalayip internetten her yerden kullanabilirsiniz!" -ForegroundColor Green
        Write-Host ""
        
        # URL'yi panoya kopyala
        $ngrokUrl | Set-Clipboard
        Write-Host "URL panoya kopyalandi!" -ForegroundColor Gray
    } else {
        Write-Host "Ngrok URL'i alinamadi, manuel olarak kontrol edin:" -ForegroundColor Yellow
        Write-Host "  http://localhost:4040" -ForegroundColor Cyan
    }
    }
    if ($existingNgrok) {
        Write-Host "Mevcut Ngrok kullaniliyor, URL aliniyor..." -ForegroundColor Gray
        $ngrokUrl = $null
        try {
            $r = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2 -ErrorAction Stop
            $t = $r.tunnels | Where-Object { $_.proto -eq "https" }
            if ($t) { $ngrokUrl = $t.public_url }
        } catch { }
        if ($ngrokUrl) {
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "  HAZIR! (Mevcut tünel)" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "Internet URL'i: $ngrokUrl" -ForegroundColor Cyan
            Write-Host ""
        }
    }
} else {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  HAZIR!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Yerel ag erisimi:" -ForegroundColor Cyan
    $localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" } | Select-Object -First 1).IPAddress
    if ($localIP) {
        Write-Host "  http://$localIP`:$Port" -ForegroundColor White
    }
    Write-Host "  http://localhost:$Port" -ForegroundColor White
    Write-Host ""
    Write-Host "NOT: Internet erisimi icin Ngrok kurmaniz gerekiyor!" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Bilgiler:" -ForegroundColor Cyan
Write-Host "  - Sunucu: http://localhost:$Port" -ForegroundColor White
if ($ngrokInstalled -and -not $SkipNgrok) {
    Write-Host "  - Ngrok Dashboard: http://localhost:4040" -ForegroundColor White
}
Write-Host "  - Durdurmak icin: Ctrl+C veya terminal pencerelerini kapat" -ForegroundColor White
Write-Host ""
Write-Host "Iki terminal penceresi acildi:" -ForegroundColor Cyan
Write-Host "  1. Next.js Sunucusu" -ForegroundColor White
if ($ngrokInstalled -and -not $SkipNgrok) {
    Write-Host "  2. Ngrok Tunnel" -ForegroundColor White
}
Write-Host ""
Write-Host "Bu terminali kapatmayin!" -ForegroundColor Yellow
Write-Host ""

# Script çalışırken bekle
try {
    while ($true) {
        Start-Sleep -Seconds 60
        # Her dakika sunucu durumunu kontrol et
        $serverRunning = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue
        if (-not $serverRunning) {
            Write-Host "UYARI: Sunucu durdu!" -ForegroundColor Red
        }
    }
} catch {
    Write-Host ""
    Write-Host "Script sonlandiriliyor..." -ForegroundColor Yellow
}
