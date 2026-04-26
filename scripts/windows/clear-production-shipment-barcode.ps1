# Üretim Emirleri, Barkodlar ve Sevkiyat Verilerini Silme Scripti

Write-Host "Üretim emirleri, barkodlar ve sevkiyat verileri siliniyor..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/admin/clear-production-shipment-barcode" -Method POST -ContentType "application/json" -ErrorAction Stop
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Başarılı!" -ForegroundColor Green
    Write-Host "Mesaj: $($result.message)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Silinen kayıtlar:" -ForegroundColor Yellow
    
    $result.deleted_counts.PSObject.Properties | ForEach-Object {
        Write-Host "  - $($_.Name): $($_.Value)" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "Toplam: $($result.total_deleted) kayıt silindi" -ForegroundColor Green
}
catch {
    Write-Host "❌ Hata: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Yanıt: $responseBody" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Not: Uygulamanın çalıştığından emin olun (npm run dev)" -ForegroundColor Yellow
}

