import fs from 'fs';
import path from 'path';

// Güvenlik taraması yapılacak dizinler
const SCAN_DIRS = ['app', 'lib', 'components', 'scripts', 'services', 'utils'];

// Güvenlik açığı kalıpları
const PATTERNS = [
  { name: 'Hardcoded Secret', regex: /(JWT_SECRET|API_KEY|PASSWORD|SECRET_KEY)\s*=\s*['"][^'"]+['"]/gi },
  { name: 'Exposed Telegram Token', regex: /[0-9]{9,}:[a-zA-Z0-9_-]{35}/g },
  { name: 'Potential SQL Injection', regex: /\.query\(.*`.*\$\{.*\}.*`.*\)/gi },
  { name: 'Unvalidated Input (SearchParam)', regex: /searchParams\.get\(.*\)(?!.*zod|.*validate)/gi },
  { name: 'Insecure Redirect', regex: /redirect\(.*\$\{.*\}.*\)/gi },
];

interface Finding {
  file: string;
  issue: string;
  line: number;
  snippet: string;
}

function scanDirectory(dir: string, results: Finding[]) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      scanDirectory(fullPath, results);
    } else if (stat.isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      
      PATTERNS.forEach((pattern) => {
        lines.forEach((lineText, index) => {
          if (pattern.regex.test(lineText)) {
            // Script'in kendisini ve örnek dosyaları yoksay
            if (fullPath.includes('security-audit.ts')) return;
            if (fullPath.includes('.env.example')) return;
            
            results.push({
              file: fullPath,
              issue: pattern.name,
              line: index + 1,
              snippet: lineText.trim(),
            });
          }
        });
        // Regex state'ini sıfırla (g flag varsa)
        pattern.regex.lastIndex = 0;
      });
    }
  }
}

function runAudit() {
  console.log('🚀 Güvenlik Denetimi Başlatılıyor...');
  const results: Finding[] = [];
  
  SCAN_DIRS.forEach((dir) => {
    const fullPath = path.resolve(process.cwd(), dir);
    scanDirectory(fullPath, results);
  });
  
  // RLS Denetimi (Basit dosya varlığı kontrolü)
  const supabaseMigrations = path.resolve(process.cwd(), 'supabase/migrations');
  if (fs.existsSync(supabaseMigrations)) {
    const migrations = fs.readdirSync(supabaseMigrations);
    const rlsPattern = /ALTER TABLE.*ENABLE ROW LEVEL SECURITY/gi;
    let hasRls = false;
    
    migrations.forEach(m => {
      const content = fs.readFileSync(path.join(supabaseMigrations, m), 'utf8');
      if (rlsPattern.test(content)) hasRls = true;
    });
    
    if (!hasRls) {
      results.push({
        file: 'supabase/migrations',
        issue: 'Missing RLS Policies',
        line: 0,
        snippet: 'No RLS enabling migration found.'
      });
    }
  }
  
  if (results.length > 0) {
    console.warn(`\n⚠️ ${results.length} potansiyel güvenlik sorunu bulundu:`);
    results.forEach((res) => {
      console.warn(`- [${res.issue}] -> ${res.file}:${res.line}`);
      if (res.snippet) console.warn(`  Kod: ${res.snippet}`);
    });
    
    fs.writeFileSync('audit-report.json', JSON.stringify(results, null, 2));
    console.log('\n📄 Denetim raporu audit-report.json dosyasına kaydedildi.');
  } else {
    console.log('\n✅ Harika! Kritik bir güvenlik sorunu bulunamadı.');
  }
}

runAudit();
