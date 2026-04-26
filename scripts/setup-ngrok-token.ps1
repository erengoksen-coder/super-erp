# Ngrok Token Ayarlama Scripti

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Ngrok Token Ayarlama" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Ngrok token ayarlamak icin:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Tarayiciyi acin ve su adrese gidin:" -ForegroundColor Cyan
Write-Host "   https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor White
Write-Host ""
Write-Host "2. Eger giris yapmadiysaniz, giris yapin veya ucretsiz hesap olusturun" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Token'i kopyalayin (uzun bir string, ornek: 2abc123def456...)" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Asagidaki komutu calistirin ve YOUR_TOKEN yerine kopyaladiginiz token'i yapistirin:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   ngrok config add-authtoken YOUR_TOKEN" -ForegroundColor White
Write-Host ""
Write-Host "ORNEK:" -ForegroundColor Green
Write-Host "   ngrok config add-authtoken 2abc123def456ghi789jkl012mno345pqr678" -ForegroundColor White
Write-Host ""
Write-Host "5. Token ayarlandiktan sonra ngrok'u baslatabilirsiniz:" -ForegroundColor Cyan
Write-Host "   ngrok http 3000" -ForegroundColor White
Write-Host ""

# Mevcut token'i kontrol et
Write-Host "Mevcut token kontrol ediliyor..." -ForegroundColor Yellow
$tokenCheck = ngrok config check 2>&1

if ($LASTEXITCODE -eq 0 -and $tokenCheck -notlike "*error*" -and $tokenCheck -notlike "*YOUR_TOKEN*") {
    Write-Host "OK: Token ayarli gibi gorunuyor" -ForegroundColor Green
    Write-Host ""
    Write-Host "Token'i gormek icin:" -ForegroundColor Cyan
    Write-Host "   ngrok config check" -ForegroundColor White
} else {
    Write-Host "UYARI: Token ayarli degil veya gecersiz!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Yukaridaki adimlari takip ederek token'i ayarlayin." -ForegroundColor Yellow
}

