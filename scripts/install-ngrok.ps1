# Ngrok Kurulum Scripti

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Ngrok Kurulumu" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Chocolatey kontrolu
$chocoInstalled = Get-Command choco -ErrorAction SilentlyContinue

if ($chocoInstalled) {
    Write-Host "Chocolatey bulundu. Otomatik kurulum yapilacak..." -ForegroundColor Green
    Write-Host ""
    Write-Host "Ngrok kuruluyor..." -ForegroundColor Yellow
    
    try {
        choco install ngrok -y
        Write-Host ""
        Write-Host "OK: Ngrok basariyla kuruldu!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Simdi token ayarlamaniz gerekiyor:" -ForegroundColor Yellow
        Write-Host "1. https://dashboard.ngrok.com/get-started/your-authtoken adresine gidin" -ForegroundColor Yellow
        Write-Host "2. Token'i kopyalayin" -ForegroundColor Yellow
        Write-Host "3. Su komutu calistirin: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor Yellow
    } catch {
        Write-Host "HATA: Chocolatey ile kurulum basarisiz!" -ForegroundColor Red
        Write-Host "Manuel kurulum yapmaniz gerekiyor." -ForegroundColor Yellow
    }
} else {
    Write-Host "Chocolatey bulunamadi. Manuel kurulum yapmaniz gerekiyor." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Manuel Kurulum Adimlari" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Ngrok'u indirin:" -ForegroundColor Yellow
    Write-Host "   https://ngrok.com/download" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. ZIP dosyasini acin" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "3. ngrok.exe dosyasini bir klasore kopyalayin" -ForegroundColor Yellow
    Write-Host "   Ornek: C:\ngrok\ngrok.exe" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "4. PATH'e ekleyin veya tam yol ile kullanin:" -ForegroundColor Yellow
    Write-Host "   C:\ngrok\ngrok.exe http 3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "5. VEYA PATH'e eklemek icin:" -ForegroundColor Yellow
    Write-Host "   a) Windows Ayarlar > Sistem > Hakkinda > Gelişmiş sistem ayarları" -ForegroundColor Cyan
    Write-Host "   b) Ortam Degiskenleri > Sistem degiskenleri > Path > Duzenle" -ForegroundColor Cyan
    Write-Host "   c) Yeni > C:\ngrok ekleyin" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "6. Ngrok token ayarlayin:" -ForegroundColor Yellow
    Write-Host "   a) https://dashboard.ngrok.com/get-started/your-authtoken adresine gidin" -ForegroundColor Cyan
    Write-Host "   b) Token'i kopyalayin" -ForegroundColor Cyan
    Write-Host "   c) Su komutu calistirin: ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host ""
Write-Host "Kurulum tamamlandiktan sonra:" -ForegroundColor Green
Write-Host "  .\scripts\start-ngrok-manual.ps1" -ForegroundColor Cyan
Write-Host "komutu ile ngrok'u baslatabilirsiniz." -ForegroundColor Green

