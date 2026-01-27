# Manuel Ngrok Baslatma Scripti
# Bu script sadece ngrok'u baslatir

$port = 3000

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Ngrok Baslatiliyor" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Port: $port" -ForegroundColor Yellow
Write-Host ""
Write-Host "Ngrok web arayuzu: http://localhost:4040" -ForegroundColor Green
Write-Host ""
Write-Host "Durdurmak icin Ctrl+C basin" -ForegroundColor Yellow
Write-Host ""

# Ngrok'u baslat
ngrok http $port

