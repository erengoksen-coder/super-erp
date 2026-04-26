# Port 3000, 3001, 3444 uzerindeki sureci kapatir; kilit dosyasini siler; npm run dev baslatir.
$ErrorActionPreference = "Stop"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = Split-Path -Parent $scriptPath
Set-Location $projectPath

Write-Host ""
Write-Host "Sunucu sifirlaniyor..." -ForegroundColor Yellow

foreach ($port in @(3000, 3001, 3444)) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn) {
        $procId = $conn.OwningProcess
        if ($procId -is [array]) { $procId = $procId[0] }
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        Write-Host "  Port $port kapatildi (PID: $procId)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

$lockFile = Join-Path $projectPath ".next\dev\lock"
if (Test-Path $lockFile) {
    Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
    Write-Host "  Kilit dosyasi silindi." -ForegroundColor Gray
}

Write-Host ""
Write-Host "Sunucu baslatiliyor (npm run dev)..." -ForegroundColor Green
Write-Host "  http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Durdurmak icin: Ctrl+C" -ForegroundColor Gray
Write-Host ""
npm run dev
