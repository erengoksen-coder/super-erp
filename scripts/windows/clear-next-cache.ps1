# Next.js .next cache temizleme - once Node/Next.js kapali olmali
Write-Host "Node islemleri durduruluyor..."
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$nextPath = Join-Path $PSScriptRoot "..\.next"
if (Test-Path $nextPath) {
    Write-Host ".next siliniyor..."
    Remove-Item -Path $nextPath -Recurse -Force -ErrorAction SilentlyContinue
    if (Test-Path $nextPath) {
        Write-Host "Uyari: Bazi dosyalar silinemedi. Cursor/VS Code veya baska bir program .next icinde dosya acik tutuyor olabilir."
        Write-Host "Tum editorleri kapatip tekrar deneyin veya bilgisayari yeniden baslatin."
    } else {
        Write-Host "Temizlendi. Simdi: npm run dev"
    }
} else {
    Write-Host ".next zaten yok."
}
