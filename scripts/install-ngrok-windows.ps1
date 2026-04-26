# Ngrok Windows Otomatik Kurulum Scripti
# https://dashboard.ngrok.com/get-started/setup/windows

param(
    [string]$InstallPath = "C:\ngrok",
    [switch]$SkipToken = $false
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Ngrok Windows Kurulumu" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Yönetici kontrolü
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "UYARI: Yonetici yetkisi yok, PATH'e ekleme yapilamayacak" -ForegroundColor Yellow
    Write-Host "Kurulum yapilacak ama PATH'e manuel ekleme gerekebilir" -ForegroundColor Yellow
    Write-Host ""
}

# 1. Mevcut ngrok kontrolü
Write-Host "1. Mevcut ngrok kontrol ediliyor..." -ForegroundColor Yellow
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue

if ($ngrokInstalled) {
    Write-Host "   OK: Ngrok zaten kurulu!" -ForegroundColor Green
    $ngrokPath = (Get-Command ngrok).Source
    Write-Host "   Konum: $ngrokPath" -ForegroundColor Gray
    
    # Versiyon kontrolü
    try {
        $version = ngrok version 2>&1
        Write-Host "   Versiyon: $version" -ForegroundColor Gray
    } catch {
        Write-Host "   Versiyon kontrol edilemedi" -ForegroundColor Gray
    }
    
    Write-Host ""
    $reinstall = Read-Host "Yeniden kurmak ister misiniz? (E/H)"
    if ($reinstall -ne "E" -and $reinstall -ne "e") {
        Write-Host "Kurulum atlandi." -ForegroundColor Yellow
        if (-not $SkipToken) {
            Write-Host ""
            Write-Host "Token ayarlamak icin:" -ForegroundColor Yellow
            Write-Host "  1. https://dashboard.ngrok.com/get-started/your-authtoken adresine gidin" -ForegroundColor White
            Write-Host "  2. Token'i kopyalayin" -ForegroundColor White
            Write-Host "  3. ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor White
        }
        exit 0
    }
}

Write-Host ""

# 2. Chocolatey kontrolü
Write-Host "2. Chocolatey kontrol ediliyor..." -ForegroundColor Yellow
$chocoInstalled = Get-Command choco -ErrorAction SilentlyContinue

if ($chocoInstalled) {
    Write-Host "   OK: Chocolatey bulundu!" -ForegroundColor Green
    Write-Host "   Chocolatey ile kurulum yapilacak..." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        Write-Host "   Ngrok kuruluyor..." -ForegroundColor Yellow
        choco install ngrok -y --force
        Write-Host "   OK: Ngrok basariyla kuruldu!" -ForegroundColor Green
        $chocoSuccess = $true
    } catch {
        Write-Host "   HATA: Chocolatey ile kurulum basarisiz!" -ForegroundColor Red
        Write-Host "   Manuel kurulum yapilacak..." -ForegroundColor Yellow
        $chocoSuccess = $false
    }
} else {
    Write-Host "   Chocolatey bulunamadi, manuel kurulum yapilacak" -ForegroundColor Yellow
    $chocoSuccess = $false
}

Write-Host ""

# 3. Manuel kurulum (Chocolatey yoksa veya başarısızsa)
if (-not $chocoSuccess) {
    Write-Host "3. Manuel kurulum baslatiliyor..." -ForegroundColor Yellow
    Write-Host ""
    
    # Kurulum klasörü oluştur
    if (-not (Test-Path $InstallPath)) {
        Write-Host "   Kurulum klasoru olusturuluyor: $InstallPath" -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
        Write-Host "   OK: Klasor olusturuldu" -ForegroundColor Green
    } else {
        Write-Host "   OK: Kurulum klasoru mevcut: $InstallPath" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "   Ngrok indiriliyor..." -ForegroundColor Yellow
    Write-Host "   Kaynak: https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip" -ForegroundColor Gray
    Write-Host ""
    
    $zipPath = Join-Path $env:TEMP "ngrok.zip"
    $downloadUrl = "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip"
    
    try {
        # İndirme
        Write-Host "   Indirme basladi..." -ForegroundColor Yellow
        Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing
        Write-Host "   OK: Indirme tamamlandi" -ForegroundColor Green
        
        # ZIP'i aç
        Write-Host "   ZIP dosyasi aciliyor..." -ForegroundColor Yellow
        Expand-Archive -Path $zipPath -DestinationPath $InstallPath -Force
        Write-Host "   OK: ZIP acildi" -ForegroundColor Green
        
        # Geçici dosyayı sil
        Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
        
        # ngrok.exe kontrolü
        $ngrokExe = Join-Path $InstallPath "ngrok.exe"
        if (Test-Path $ngrokExe) {
            Write-Host "   OK: ngrok.exe bulundu: $ngrokExe" -ForegroundColor Green
        } else {
            Write-Host "   HATA: ngrok.exe bulunamadi!" -ForegroundColor Red
            exit 1
        }
        
    } catch {
        Write-Host "   HATA: Indirme basarisiz!" -ForegroundColor Red
        Write-Host "   Hata: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "   Manuel indirme yapin:" -ForegroundColor Yellow
        Write-Host "   1. https://ngrok.com/download adresine gidin" -ForegroundColor White
        Write-Host "   2. Windows ZIP dosyasini indirin" -ForegroundColor White
        Write-Host "   3. ZIP'i acin ve ngrok.exe'yi $InstallPath klasorune kopyalayin" -ForegroundColor White
        exit 1
    }
    
    Write-Host ""
    
    # PATH'e ekleme
    if ($isAdmin) {
        Write-Host "4. PATH'e ekleniyor..." -ForegroundColor Yellow
        $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
        
        if ($currentPath -notlike "*$InstallPath*") {
            try {
                [Environment]::SetEnvironmentVariable("Path", "$currentPath;$InstallPath", "Machine")
                Write-Host "   OK: PATH'e eklendi" -ForegroundColor Green
                Write-Host "   NOT: Yeni PATH ayarlari icin PowerShell'i yeniden baslatin" -ForegroundColor Yellow
            } catch {
                Write-Host "   UYARI: PATH'e eklenemedi!" -ForegroundColor Yellow
                Write-Host "   Manuel olarak ekleyin veya tam yol ile kullanin:" -ForegroundColor Yellow
                Write-Host "   $ngrokExe http 3000" -ForegroundColor White
            }
        } else {
            Write-Host "   OK: PATH'de zaten mevcut" -ForegroundColor Green
        }
    } else {
        Write-Host "4. PATH'e ekleme atlandi (yonetici yetkisi gerekli)" -ForegroundColor Yellow
        Write-Host "   Tam yol ile kullanin: $ngrokExe http 3000" -ForegroundColor White
    }
}

Write-Host ""

# 5. Kurulum doğrulama
Write-Host "5. Kurulum dogrulanıyor..." -ForegroundColor Yellow

# PATH'i yenile
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue

if ($ngrokInstalled) {
    Write-Host "   OK: Ngrok basariyla kuruldu!" -ForegroundColor Green
    $ngrokPath = (Get-Command ngrok).Source
    Write-Host "   Konum: $ngrokPath" -ForegroundColor Gray
    
    # Versiyon kontrolü
    try {
        $version = ngrok version 2>&1
        Write-Host "   Versiyon: $version" -ForegroundColor Gray
    } catch {
        # Versiyon komutu yoksa, çalıştırarak test et
        Write-Host "   Test ediliyor..." -ForegroundColor Gray
    }
} else {
    Write-Host "   UYARI: Ngrok PATH'de bulunamadi!" -ForegroundColor Yellow
    if (Test-Path (Join-Path $InstallPath "ngrok.exe")) {
        Write-Host "   Tam yol ile kullanin: $InstallPath\ngrok.exe" -ForegroundColor White
    }
}

Write-Host ""

# 6. Token ayarlama
if (-not $SkipToken) {
    Write-Host "6. Ngrok Token Ayarlama" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Ngrok kullanmak icin token ayarlamaniz gerekiyor:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   1. Tarayicinizi acin ve su adrese gidin:" -ForegroundColor White
    Write-Host "      https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   2. Ngrok hesabi olusturun (uzcretsiz)" -ForegroundColor White
    Write-Host ""
    Write-Host "   3. Dashboard'dan 'Your Authtoken' alin" -ForegroundColor White
    Write-Host ""
    Write-Host "   4. Token'i buraya yapistirin:" -ForegroundColor White
    Write-Host ""
    
    $token = Read-Host "   Ngrok Token (bos gecmek icin Enter)"
    
    if ($token -and $token.Trim() -ne "") {
        try {
            if ($ngrokInstalled) {
                ngrok config add-authtoken $token.Trim()
                Write-Host ""
                Write-Host "   OK: Token basariyla ayarlandi!" -ForegroundColor Green
            } else {
                $ngrokExe = Join-Path $InstallPath "ngrok.exe"
                if (Test-Path $ngrokExe) {
                    & $ngrokExe config add-authtoken $token.Trim()
                    Write-Host ""
                    Write-Host "   OK: Token basariyla ayarlandi!" -ForegroundColor Green
                } else {
                    Write-Host "   UYARI: Ngrok bulunamadi, token ayarlanamadi!" -ForegroundColor Yellow
                    Write-Host "   Manuel olarak ayarlayin: ngrok config add-authtoken $token" -ForegroundColor White
                }
            }
        } catch {
            Write-Host "   HATA: Token ayarlanamadi!" -ForegroundColor Red
            Write-Host "   Hata: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "   Manuel olarak ayarlayin: ngrok config add-authtoken $token" -ForegroundColor White
        }
    } else {
        Write-Host "   Token ayarlama atlandi" -ForegroundColor Yellow
        Write-Host "   Daha sonra ayarlamak icin: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  KURULUM TAMAMLANDI!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Son kontrol
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue
if ($ngrokInstalled) {
    Write-Host "Ngrok kullanima hazir!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Test etmek icin:" -ForegroundColor Cyan
    Write-Host "  ngrok version" -ForegroundColor White
    Write-Host ""
    Write-Host "Baslatmak icin:" -ForegroundColor Cyan
    Write-Host "  npm run start:internet" -ForegroundColor White
    Write-Host "  veya" -ForegroundColor Gray
    Write-Host "  ngrok http 3000" -ForegroundColor White
} else {
    Write-Host "NOT: PowerShell'i yeniden baslatin veya tam yol ile kullanin" -ForegroundColor Yellow
    if (Test-Path (Join-Path $InstallPath "ngrok.exe")) {
        Write-Host "  $InstallPath\ngrok.exe http 3000" -ForegroundColor White
    }
}

Write-Host ""
