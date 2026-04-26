$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backup_before_migration_$timestamp.sql"

Write-Host "🗄️  Veritabanı yedekleniyor..." -ForegroundColor Yellow
supabase db dump --file $backupFile

if ($?) {
  Write-Host "✅ Yedekleme başarılı: $backupFile" -ForegroundColor Green
} else {
  Write-Host "❌ Yedekleme başarısız!" -ForegroundColor Red
  exit 1
}
