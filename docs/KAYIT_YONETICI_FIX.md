# Kayıt "yönetici" Hatası – Yapılan İşlem (Canlı Göreceğin)

## Senin gördüğün canlı test

1. **Kayıt sayfası açıldı** → `http://localhost:3000/auth/register`
2. **Form dolduruldu:**
   - Kullanıcı adı: `canlitest`
   - E-posta: `canli@test.local`
   - Ad Soyad: `Canli Test`
   - **Görev/Ünvan: `yönetici`**
   - Şifre: `Test1234`
3. **"Kayıt Ol"a tıklandı** → Hata: `Invalid option: expected one of "admin"|"user"|"manager"|"viewer"`

Sebep: Şu an çalışan sunucu **eski build**; "yönetici" metnini kabul etmiyor.

---

## Yaptığım işlem (kod)

Kayıt sayfasında, **göndermeden hemen önce** rolü İngilizceye çeviriyorum:

**Dosya:** `app/auth/register/page.tsx` (satır 59–71)

```javascript
// Eski form "Görev/Ünvan"a yönetici yazabiliyor (role veya job_title); API hep admin|user|manager|viewer bekliyor
const roleInput = String(formData.role || formData.job_title || '').trim().toLowerCase()
const roleForApi =
  roleInput === 'admin' || roleInput === 'manager' || roleInput === 'viewer' ? roleInput
  : /y[oö]netici/.test(roleInput) ? 'manager'
  : /g[oö]r[uü]nt[uü]leyici/.test(roleInput) ? 'viewer'
  : /kullan[iı]c[iı]/.test(roleInput) ? 'user'
  : 'user'

const payload = {
  username: rawUsername,
  password: formData.password,
  full_name: trimmedName,
  role: roleForApi,   // ← API'ye hep "manager" / "user" / "viewer" / "admin" gider
  ...
}
```

Yani sen **"yönetici"** yazınca, API'ye **"manager"** gidiyor; böylece "Invalid option" hatası oluşmuyor.

---

## Bunu canlı nasıl görürsün

### 1) Terminalden API testi (role: manager → başarılı)

```bash
cd c:\super-erp
node scripts/test-register-api.js http://localhost:3000
```

- Bu script `role: "yönetici"` ile istek atıyor.  
- Sunucu **eski** build ise yine 400 alırsın.  
- **Yeni** build’de (veya API’de rol normalizasyonu varsa) kayıt başarılı olur.

**role: "manager" ile denemek (API’nin kabul ettiğini görmek için):**

```bash
node -e "fetch('http://localhost:3000/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'test_'+Date.now(),password:'Test1234',full_name:'Test',email:'t@t.local',role:'manager'})}).then(r=>r.json()).then(d=>console.log(d))"
```

Bu komut başarılı kayıt dönerse, sorun sadece "yönetici" → "manager" dönüşümünün eski sayfada olmamasıdır.

### 2) Yeni build ile formu canlı görmek

1. Açık olan **Production** ve **Ngrok** pencerelerini kapat.
2. Proje klasöründe: `npm run build`
3. Tekrar: `npm run baslat` (veya `scripts\baslat-internet.ps1`)
4. Tarayıcıda **Ctrl+Shift+R** ile `https://...ngrok.../auth/register` sayfasını sert yenile.
5. **Görev/Ünvan** alanına **yönetici** yazıp **Kayıt Ol**’a tıkla.

Bu build’de yukarıdaki kod çalıştığı için artık API’ye **"manager"** gidecek ve kayıt tamamlanacak; hatayı canlı olarak “düzelmiş” görürsün.

---

## Özet

| Ne yaptım | Nerede |
|-----------|--------|
| "yönetici" → "manager" dönüşümü | `app/auth/register/page.tsx` (gönderilen `payload.role`) |
| "görüntüleyici" → "viewer", "kullanıcı" → "user" | Aynı blok |
| Hem **Rol** hem **Görev/Ünvan** (job_title) alanından rol okuma | `formData.role \|\| formData.job_title` |

Canlı görmek için: Eski sunucuyu kapat → `npm run build` → `npm run baslat` → Kayıt sayfasında "yönetici" yazıp gönder.
