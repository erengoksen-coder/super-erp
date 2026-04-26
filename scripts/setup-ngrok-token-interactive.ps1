# Ngrok Token Ayarlama Scripti (İnteraktif)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Ngrok Token Ayarlama" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Ngrok kontrolü
$ngrokInstalled = Get-Command ngrok -ErrorAction SilentlyContinue

if (-not $ngrokInstalled) {
    Write-Host "HATA: Ngrok bulunamadi!" -ForegroundColor Red
    Write-Host "Once ngrok'u kurun: npm run install:ngrok" -ForegroundColor Yellow
    exit 1
}

Write-Host "OK: Ngrok bulundu" -ForegroundColor Green
Write-Host ""

# Mevcut token kontrolü
Write-Host "Mevcut token kontrol ediliyor..." -ForegroundColor Yellow
try {
    $tokenCheck = ngrok config check 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK: Token zaten ayarli!" -ForegroundColor Green
        Write-Host ""
        $reconfigure = Read-Host "Token'i yeniden ayarlamak ister misiniz? (E/H)"
        if ($reconfigure -ne "E" -and $reconfigure -ne "e") {
            Write-Host "Token ayarlama atlandi." -ForegroundColor Yellow
            exit 0
        }
    } else {
        Write-Host "Token ayarli degil veya gecersiz" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Token kontrol edilemedi" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Token Alma Adimlari" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Tarayicinizda su adres acik:" -ForegroundColor White
Write-Host "   https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Sayfada 'Your Authtoken' bolumunu bulun" -ForegroundColor White
Write-Host ""
Write-Host "3. Token'i kopyalayin (uzun bir string, ornek: 2abc123def456...)" -ForegroundColor White
Write-Host ""
Write-Host "4. Token'i buraya yapistirin:" -ForegroundColor White
Write-Host ""

$token = Read-Host "Ngrok Token"

if (-not $token -or $token.Trim() -eq "") {
    Write-Host ""
    Write-Host "HATA: Token girilmedi!" -ForegroundColor Red
    Write-Host "Token ayarlama iptal edildi." -ForegroundColor Yellow
    exit 1
}

$token = $token.Trim()

Write-Host ""
Write-Host "Token ayarlaniyor..." -ForegroundColor Yellow

try {
    ngrok config add-authtoken $token
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  BASARILI!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "OK: Token basariyla ayarlandi!" -ForegroundColor Green
    Write-Host ""
    
    # Token'ı doğrula
    Write-Host "Token dogrulanıyor..." -ForegroundColor Yellow
    $verify = ngrok config check 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK: Token gecerli!" -ForegroundColor Green
    } else {
        Write-Host "UYARI: Token dogrulanamadi, ama ayarlandi" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Simdi ngrok'u kullanabilirsiniz:" -ForegroundColor Cyan
    Write-Host "  npm run start:internet" -ForegroundColor White
    Write-Host "  veya" -ForegroundColor Gray
    Write-Host "  ngrok http 3000" -ForegroundColor White
    
} catch {
    Write-Host ""
    Write-Host "HATA: Token ayarlanamadi!" -ForegroundColor Red
    Write-Host "Hata: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manuel olarak ayarlayin:" -ForegroundColor Yellow
    Write-Host "  ngrok config add-authtoken $token" -ForegroundColor White
    exit 1
}

Write-Host ""
