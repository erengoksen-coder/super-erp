# Sadece ngrok tünelini ac (localhost:3000). Sunucu ayakta olmali.
$ErrorActionPreference = "Stop"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = Split-Path -Parent $scriptPath
$Port = 3000

Set-Location $projectPath

Write-Host ""
Write-Host "  Ngrok aciliyor (http://127.0.0.1:$Port)..." -ForegroundColor Green
Write-Host ""

Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; Write-Host 'Ngrok - Bu pencereyi kapatmayin' -ForegroundColor Green; ngrok http http://127.0.0.1:$Port"
Write-Host "Ngrok penceresi acildi. 5 saniye bekleniyor..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

try {
    $r = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 3 -ErrorAction Stop
    $t = $r.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
    if ($t) {
        Write-Host ""
        Write-Host "  Internet adresi: $($t.public_url)" -ForegroundColor Cyan
        Write-Host "  Dashboard: http://localhost:4040" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "URL alinamadi. Tarayicida http://localhost:4040 acin." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Ngrok acildi. URL icin: http://localhost:4040" -ForegroundColor Yellow
}
Write-Host ""
