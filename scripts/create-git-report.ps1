$desktop = [Environment]::GetFolderPath("Desktop")
$htmlFile = Join-Path $desktop "git-detaylar.html"

# HTML başlangıcı
$html = @"
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Git Detayları - Super ERP</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background: #1e1e1e; color: #d4d4d4; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #4ec9b0; border-bottom: 2px solid #4ec9b0; padding-bottom: 10px; }
        h2 { color: #569cd6; margin-top: 30px; }
        .commit { background: #252526; border-left: 4px solid #007acc; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .commit-hash { color: #4ec9b0; font-family: 'Consolas', monospace; font-weight: bold; }
        .author { color: #ce9178; }
        .date { color: #608b4e; }
        .message { color: #d4d4d4; margin: 10px 0; font-size: 16px; }
        .stats { background: #1e1e1e; padding: 10px; border-radius: 4px; margin-top: 10px; font-family: 'Consolas', monospace; font-size: 12px; }
        .file { color: #9cdcfe; }
        .added { color: #4ec9b0; }
        .deleted { color: #f48771; }
        .status { background: #252526; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .branch { color: #4ec9b0; font-weight: bold; }
        .info { color: #608b4e; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th { background: #007acc; color: white; padding: 10px; text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #3e3e3e; }
        tr:hover { background: #2d2d30; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Git Detayları - Super ERP</h1>
"@

# Durum bilgisi
$branch = git branch --show-current
$statusOutput = git status --porcelain
$isClean = [string]::IsNullOrWhiteSpace($statusOutput)
$ahead = git rev-list --count origin/main..HEAD 2>$null
if ([string]::IsNullOrWhiteSpace($ahead)) { $ahead = "0" }

$html += @"
        <div class="status">
            <h2>📊 Durum Bilgisi</h2>
            <p>Branch: <span class="branch">$branch</span></p>
            <p>Origin'den önde: <span class="info">$ahead commit</span></p>
            <p>Working Tree: <span class="info">$(if ($isClean) { 'Temiz' } else { 'Değişiklikler var' })</span></p>
        </div>
        <h2>📝 Son 10 Commit</h2>
"@

# Commit bilgileri
$commits = git log -10 --pretty=format:"%h|%an|%ae|%ad|%s" --date=format:"%Y-%m-%d %H:%M:%S"
foreach ($commitLine in $commits) {
    $parts = $commitLine -split '\|'
    if ($parts.Length -ge 5) {
        $hash = $parts[0]
        $author = $parts[1]
        $email = $parts[2]
        $date = $commitLine -replace '.*\|(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\|.*', '$1'
        $message = $parts[4]
        
        # Stats bilgisi
        $statsOutput = git show --stat $hash --pretty=format:"" 2>$null | Select-Object -First 20
        $statsHtml = ""
        foreach ($statLine in $statsOutput) {
            if ($statLine -match '(\d+)\s+file') {
                $statsHtml += "<div class='stats'>$statLine</div>"
            }
        }
        
        $html += @"
        <div class="commit">
            <div class="commit-hash">Commit: $hash</div>
            <div class="author">Yazar: $author &lt;$email&gt;</div>
            <div class="date">Tarih: $date</div>
            <div class="message">$message</div>
            $statsHtml
        </div>
"@
    }
}

# Dosya değişiklikleri tablosu
$html += @"
        <h2>📁 Son Commit Dosya Değişiklikleri</h2>
        <table>
            <thead>
                <tr>
                    <th>Dosya</th>
                    <th>Eklendi</th>
                    <th>Silindi</th>
                </tr>
            </thead>
            <tbody>
"@

$lastCommitFiles = git show --stat --pretty=format:"" HEAD | Select-String "^\s+(\S+)\s+\|\s+(\d+)\s+([\+\-]+)" | ForEach-Object {
    if ($_ -match '^\s+(\S+)\s+\|\s+(\d+)\s+([\+\-]+)') {
        $file = $matches[1]
        $changes = $matches[2]
        $signs = $matches[3]
        $added = ($signs -split '\+' | Where-Object { $_ }).Count - 1
        $deleted = ($signs -split '\-' | Where-Object { $_ }).Count - 1
        $html += "<tr><td class='file'>$file</td><td class='added'>+$added</td><td class='deleted'>-$deleted</td></tr>"
    }
}

$html += @"
            </tbody>
        </table>
    </div>
</body>
</html>
"@

$html | Out-File -FilePath $htmlFile -Encoding UTF8 -NoNewline
Write-Host "Git detaylari masaustune kaydedildi: $htmlFile"
Write-Host "Dosya konumu: $htmlFile"
