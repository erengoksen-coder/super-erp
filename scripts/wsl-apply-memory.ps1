# WSL 2 bellek ayarini uygular (.wslconfig degisiklikleri icin)
# YONETICI OLARAK CALISTIRIN: PowerShell'i sag tik -> "Yonetici olarak calistir"
Write-Host "WSL kapatiliyor (.wslconfig uygulanmasi icin)..." -ForegroundColor Yellow
wsl --shutdown
Write-Host "Tamam. Simdi Docker Desktop'i kapatip tekrar acin, ardindan:" -ForegroundColor Green
Write-Host "  cd c:\super-erp" -ForegroundColor Cyan
Write-Host "  docker-compose up -d --build" -ForegroundColor Cyan
