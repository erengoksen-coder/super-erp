# TestSprite – Super ERP

Bu klasör, [TestSprite](https://www.testsprite.com) MCP ile oluşturulmuş frontend test kurulumunu içerir.

## Mevcut kurulum

- **Config:** `tmp/config.json` (port 3000, frontend, login: admin / admin1234)
- **Test planı:** `testsprite_frontend_test_plan.json` (5 senaryo)
- **PRD:** `standard_prd.json`
- **Playwright testleri:** `TC001_Login_page_loads.py` … `TC005_Inventory_page_accessible.py`
- **Sonuçlar:** `tmp/test_results.json`, `tmp/raw_report.md`

## Testleri çalıştırmak

### 1. Uygulamayı başlatın

```bash
# Proje kökünden (c:\super-erp)
npm run dev
# veya
.\scripts\run-dev-clean.bat
```

Uygulama **http://localhost:3000** adresinde çalışıyor olmalı.

### 2. TestSprite ile testleri çalıştırın

**Seçenek A – Cursor içinde (MCP açıksa)**  
Sohbette şunu yazın:

- *"TestSprite bootstrap yap, frontend test planı oluştur ve testleri çalıştır"*

MCP, bootstrap → test planı → test çalıştırma adımlarını yürütür.

**Seçenek B – Terminalden**

1. [TestSprite Dashboard](https://www.testsprite.com/dashboard/settings/apikey) üzerinden bir **API key** alın.
2. Ortam değişkeni verip komutu çalıştırın:

```powershell
cd c:\super-erp
$env:API_KEY = "sk-user-YOUR_API_KEY_HERE"
npx -y @testsprite/testsprite-mcp@latest generateCodeAndExecute
```

`tmp/config.json` içinde `executionArgs.envs.API_KEY` alanı dolu değilse, CLI ortamdan okur; bu yüzden `$env:API_KEY` yeterli olur.

### 3. Sonuçları inceleyin

- **Özet rapor:** `tmp/raw_report.md`
- **JSON sonuçlar:** `tmp/test_results.json` (her test için `testStatus`, `testVisualization` linki)
- TestSprite dashboard: [testsprite.com/dashboard](https://www.testsprite.com/dashboard) → MCP Tests

## Test senaryoları (mevcut plan)

| ID     | Başlık                      | Açıklama                          |
|--------|-----------------------------|-----------------------------------|
| TC001  | Login page loads            | Giriş sayfası ve form kontrolü    |
| TC002  | Dashboard loads after auth  | Giriş sonrası dashboard           |
| TC003  | Home page loads             | Ana sayfa yüklenmesi              |
| TC004  | Orders page accessible      | Siparişler sayfası                |
| TC005  | Inventory page accessible   | Stok / envanter sayfası           |

## Daha fazla test eklemek

- `testsprite_frontend_test_plan.json` dosyasına yeni test objeleri ekleyin (mevcut formatta: `id`, `title`, `description`, `category`, `priority`, `steps`).
- Sonra yine `generateCodeAndExecute` çalıştırın (Cursor MCP veya terminal).

## Notlar

- `tmp/config.json` hassas bilgi (login, API key) içerebilir; **.gitignore** ile takip dışı bırakılması önerilir.
- TestSprite testleri bulutta çalışır ve tünel ile localhost:3000’e bağlanır; internet bağlantısı gerekir.
