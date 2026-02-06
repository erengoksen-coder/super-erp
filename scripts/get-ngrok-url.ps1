# Ngrok URL'ini alma scripti

Write-Host "Ngrok URL'i aliniyor..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 3 -ErrorAction Stop
    
    if ($response.tunnels -and $response.tunnels.Count -gt 0) {
        $httpsTunnel = $response.tunnels | Where-Object { $_.proto -eq "https" }
        
        if ($httpsTunnel) {
            $url = $httpsTunnel.public_url
            Write-Host "Internet URL'i:" -ForegroundColor Green
            Write-Host "  $url" -ForegroundColor White -BackgroundColor DarkGreen
            Write-Host ""
            
            # URL'yi panoya kopyala
            $url | Set-Clipboard
            Write-Host "URL panoya kopyalandi!" -ForegroundColor Gray
            Write-Host ""
            
            return $url
        } else {
            Write-Host "HATA: HTTPS tunnel bulunamadi!" -ForegroundColor Red
            Write-Host "Mevcut tunnel'lar:" -ForegroundColor Yellow
            foreach ($tunnel in $response.tunnels) {
                Write-Host "  $($tunnel.proto): $($tunnel.public_url)" -ForegroundColor White
            }
        }
    } else {
        Write-Host "HATA: Tunnel bulunamadi!" -ForegroundColor Red
        Write-Host "Ngrok calisiyor mu kontrol edin: http://localhost:4040" -ForegroundColor Yellow
    }
} catch {
    Write-Host "HATA: Ngrok API'ye erisilemedi!" -ForegroundColor Red
    Write-Host "Hata: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Ngrok calisiyor mu kontrol edin:" -ForegroundColor Yellow
    Write-Host "  1. http://localhost:4040 adresine gidin" -ForegroundColor White
    Write-Host "  2. Ngrok calismiyorsa: .\scripts\start-internet.ps1" -ForegroundColor White
}
