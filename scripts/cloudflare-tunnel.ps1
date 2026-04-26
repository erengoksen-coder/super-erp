# Cloudflare Tunnel (cloudflared) - localhost:3000'i internete acar.
# Kullanim: Once "npm run dev" ile sunucuyu baslatin, sonra bu scripti calistirin.
# URL terminalde "trycloudflare.com" olarak gorunecek.

$ErrorActionPreference = "Stop"
$Port = 3000

# PATH'i guncelle (winget sonrasi yeni terminal acilmadan calissin diye)
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

Write-Host ""
Write-Host "  Cloudflare Tunnel baslatiliyor (http://localhost:$Port)..." -ForegroundColor Green
Write-Host "  Sunucu ayakta olmali (npm run dev)." -ForegroundColor Gray
Write-Host "  UYARI: Adres HER SEFERINDE degisir. Asagida cikan adresi kullanin." -ForegroundColor Yellow
Write-Host ""

$cloudflared = $null
if (Get-Command cloudflared -ErrorAction SilentlyContinue) {
    $cloudflared = "cloudflared"
} else {
    $paths = @(
        "$env:LOCALAPPDATA\Microsoft\WinGet\Links\cloudflared.exe",
        "$env:LOCALAPPDATA\Programs\cloudflared\cloudflared.exe",
        "$env:ProgramFiles\Cloudflare\cloudflared\cloudflared.exe",
        "${env:ProgramFiles(x86)}\Cloudflare\cloudflared\cloudflared.exe",
        "$env:USERPROFILE\cloudflared\cloudflared.exe"
    )
    foreach ($p in $paths) {
        if (Test-Path $p) { $cloudflared = $p; break }
    }
}

if (-not $cloudflared) {
    Write-Host "  cloudflared bulunamadi." -ForegroundColor Red
    Write-Host "  Kurulum: winget install Cloudflare.cloudflared" -ForegroundColor Yellow
    Write-Host "  Veya: https://github.com/cloudflare/cloudflared/releases" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# cloudflared stderr PowerShell'de hata sayilmasin (INF/ERR satirlari)
$ErrorActionPreference = 'Continue'
# cloudflared ciktisinda URL satirini yakala, buyuk goster ve panoya kopyala
& $cloudflared tunnel --url "http://127.0.0.1:$Port" 2>&1 | ForEach-Object {
  $line = $_
  if ($line -match '(https://[a-zA-Z0-9-]+\.trycloudflare\.com)') {
    $url = $Matches[1]
    Write-Host ""
    Write-Host "  ========== TUNEL ADRESI (panoya kopyalandi) ==========" -ForegroundColor Yellow
    Write-Host "  $url" -ForegroundColor Cyan
    Write-Host "  Tarayicida yapistirip acin. Her seferinde adres degisir." -ForegroundColor Gray
    Write-Host "  ==========================================================" -ForegroundColor Yellow
    Write-Host ""
    Set-Clipboard -Value $url
  }
  Write-Host $line
}
