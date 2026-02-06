# Windows Firewall Kuralları Oluşturma Scripti
# Yönetici yetkisi gerektirir!

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SUPER ERP - Firewall Kurulumu" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Yönetici kontrolü
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "HATA: Bu script yonetici yetkisi gerektirir!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Lutfen PowerShell'i yonetici olarak acin:" -ForegroundColor Yellow
    Write-Host "  1. PowerShell'i bulun" -ForegroundColor White
    Write-Host "  2. Sag tiklayin > 'Yonetici olarak calistir'" -ForegroundColor White
    Write-Host "  3. Bu scripti tekrar calistirin" -ForegroundColor White
    Write-Host ""
    Read-Host "Devam etmek icin Enter'a basin"
    exit 1
}

Write-Host "OK: Yonetici yetkisi mevcut" -ForegroundColor Green
Write-Host ""

# Mevcut kuralları kontrol et
Write-Host "Mevcut kurallar kontrol ediliyor..." -ForegroundColor Yellow

$existingRules = @(
    "Super ERP HTTP",
    "Super ERP HTTPS",
    "Super ERP HTTP Backup",
    "Ngrok Dashboard"
)

foreach ($ruleName in $existingRules) {
    $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "UYARI: '$ruleName' kurali zaten mevcut" -ForegroundColor Yellow
        $response = Read-Host "Uzerine yazmak ister misiniz? (E/H)"
        if ($response -eq "E" -or $response -eq "e") {
            Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
            Write-Host "OK: Eski kural kaldirildi" -ForegroundColor Green
        } else {
            Write-Host "ATLANDI: '$ruleName' kurali atlandi" -ForegroundColor Gray
            continue
        }
    }
}

Write-Host ""

# Yeni kurallar oluştur
Write-Host "Firewall kurallari olusturuluyor..." -ForegroundColor Cyan
Write-Host ""

try {
    # Port 3000 (HTTP)
    Write-Host "Port 3000 (HTTP) kurali olusturuluyor..." -ForegroundColor Yellow
    New-NetFirewallRule -DisplayName "Super ERP HTTP" `
        -Direction Inbound `
        -LocalPort 3000 `
        -Protocol TCP `
        -Action Allow `
        -Description "Super ERP HTTP Server" `
        -ErrorAction Stop | Out-Null
    Write-Host "OK: Port 3000 kurali olusturuldu" -ForegroundColor Green

    # Port 3444 (HTTPS)
    Write-Host "Port 3444 (HTTPS) kurali olusturuluyor..." -ForegroundColor Yellow
    New-NetFirewallRule -DisplayName "Super ERP HTTPS" `
        -Direction Inbound `
        -LocalPort 3444 `
        -Protocol TCP `
        -Action Allow `
        -Description "Super ERP HTTPS Server" `
        -ErrorAction Stop | Out-Null
    Write-Host "OK: Port 3444 kurali olusturuldu" -ForegroundColor Green

    # Port 3001 (HTTP Backup)
    Write-Host "Port 3001 (HTTP Backup) kurali olusturuluyor..." -ForegroundColor Yellow
    New-NetFirewallRule -DisplayName "Super ERP HTTP Backup" `
        -Direction Inbound `
        -LocalPort 3001 `
        -Protocol TCP `
        -Action Allow `
        -Description "Super ERP HTTP Backup Server" `
        -ErrorAction Stop | Out-Null
    Write-Host "OK: Port 3001 kurali olusturuldu" -ForegroundColor Green

    # Port 4040 (Ngrok Dashboard)
    Write-Host "Port 4040 (Ngrok Dashboard) kurali olusturuluyor..." -ForegroundColor Yellow
    New-NetFirewallRule -DisplayName "Ngrok Dashboard" `
        -Direction Inbound `
        -LocalPort 4040 `
        -Protocol TCP `
        -Action Allow `
        -Description "Ngrok Web Interface" `
        -ErrorAction Stop | Out-Null
    Write-Host "OK: Port 4040 kurali olusturuldu" -ForegroundColor Green

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  BASARILI!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Tum firewall kurallari olusturuldu!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Olusturulan kurallar:" -ForegroundColor Cyan
    Write-Host "  - Port 3000 (HTTP)" -ForegroundColor White
    Write-Host "  - Port 3444 (HTTPS)" -ForegroundColor White
    Write-Host "  - Port 3001 (HTTP Backup)" -ForegroundColor White
    Write-Host "  - Port 4040 (Ngrok Dashboard)" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "HATA: Firewall kurali olusturulamadi!" -ForegroundColor Red
    Write-Host "Hata: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Kuralları listele
Write-Host "Olusturulan kurallar:" -ForegroundColor Cyan
Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*Super ERP*" -or $_.DisplayName -like "*Ngrok*" } | Format-Table DisplayName, Enabled, Direction, Action -AutoSize

Write-Host ""
Write-Host "Firewall kurulumu tamamlandi!" -ForegroundColor Green
Write-Host ""
