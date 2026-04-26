Write-Host "RLS policy'leri deploy ediliyor..." -ForegroundColor Cyan

npm run supabase:migrate

if ($?) {
  Write-Host "RLS policy'leri basariyla aktif edildi." -ForegroundColor Green
} else {
  Write-Host "Hata: RLS policy'leri aktif edilemedi." -ForegroundColor Red
  exit 1
}

Write-Host "RLS policy'leri test ediliyor..." -ForegroundColor Yellow
npm run test:rls

if ($?) {
  Write-Host "Tum RLS testleri basarili." -ForegroundColor Green
} else {
  Write-Host "Bazi RLS testleri basarisiz." -ForegroundColor Yellow
}
