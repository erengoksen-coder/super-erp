# ERP Programını Başka Bilgisayara Taşıma Rehberi

## 📦 Kopyalanması Gereken Dosyalar ve Klasörler

### ✅ MUTLAKA KOPYALANMASI GEREKENLER:

1. **Tüm Kaynak Kod Dosyaları:**
   - `app/` klasörü (tüm sayfalar ve API route'ları)
   - `components/` klasörü (UI bileşenleri)
   - `lib/` klasörü (veritabanı, utils, vb.)
   - `public/` klasörü (varsa statik dosyalar)

2. **Yapılandırma Dosyaları:**
   - `package.json` (bağımlılıklar listesi)
   - `package-lock.json` veya `yarn.lock` (varsa)
   - `tsconfig.json` (TypeScript yapılandırması)
   - `next.config.js` veya `next.config.mjs` (varsa)
   - `tailwind.config.js` veya `tailwind.config.ts` (varsa)
   - `postcss.config.js` (varsa)
   - `eslint.config.js` veya `.eslintrc.json` (varsa)

3. **Veritabanı Dosyası:**
   - `data/erp.db` (SQLite veritabanı dosyası - TÜM VERİLERİNİZ BURADA!)

4. **Diğer Önemli Dosyalar:**
   - `.env` veya `.env.local` (varsa, API anahtarları vb.)
   - `server-https.js` (varsa)
   - `README.md` (varsa)

### ❌ KOPYALANMASI GEREKMEYENLER:

- `node_modules/` klasörü (çok büyük, yeniden yüklenecek)
- `.next/` klasörü (build klasörü, yeniden oluşturulacak)
- `.turbo/` klasörü (cache, yeniden oluşturulacak)
- `.git/` klasörü (isteğe bağlı, git geçmişi için)

---

## 🚀 Yeni Bilgisayarda Kurulum Adımları

### 1. Dosyaları Kopyalama
```bash
# Tüm dosyaları yeni bilgisayara kopyalayın
# ÖNEMLİ: data/erp.db dosyasını mutlaka kopyalayın!
```

### 2. Node.js Kurulumu
- Node.js 18.x veya üzeri sürümün yüklü olduğundan emin olun
- https://nodejs.org/ adresinden indirebilirsiniz

### 3. Bağımlılıkları Yükleme
```bash
# Proje klasörüne gidin
cd super-erp

# Bağımlılıkları yükleyin
npm install
```

### 4. Programı Çalıştırma
```bash
# Geliştirme modunda çalıştırma
npm run dev:simple

# Veya HTTPS ile (eğer server-https.js varsa)
npm run dev
```

### 5. Tarayıcıda Açma
- Yerel ağ: `http://[BILGISAYAR-IP]:3000`
- Sadece kendi bilgisayarınız: `http://localhost:3000`

---

## ⚠️ ÖNEMLİ NOTLAR

1. **Veritabanı Yedekleme:**
   - `data/erp.db` dosyası TÜM VERİLERİNİZİ içerir
   - Taşımadan önce mutlaka yedek alın!
   - Yedek: `data/erp.db` dosyasını güvenli bir yere kopyalayın

2. **Ağ Erişimi:**
   - Diğer cihazlardan erişim için: `npm run dev:simple` kullanın
   - Firewall ayarlarını kontrol edin (port 3000)

3. **İlk Kurulum:**
   - İlk kez çalıştırdığınızda `data/` klasörü otomatik oluşturulur
   - Eğer `data/erp.db` dosyası yoksa, boş bir veritabanı oluşturulur

4. **Hata Durumunda:**
   - `npm install` hata verirse: `npm cache clean --force` çalıştırın
   - Port 3000 kullanılıyorsa: `npm run dev:simple -- -p 3001` ile farklı port kullanın

---

## 📋 Hızlı Kontrol Listesi

- [ ] `app/` klasörü kopyalandı
- [ ] `components/` klasörü kopyalandı
- [ ] `lib/` klasörü kopyalandı
- [ ] `package.json` kopyalandı
- [ ] `data/erp.db` kopyalandı (EN ÖNEMLİSİ!)
- [ ] Yapılandırma dosyaları kopyalandı
- [ ] Node.js yüklü
- [ ] `npm install` çalıştırıldı
- [ ] Program başarıyla çalışıyor

---

## 🔧 Sorun Giderme

### Veritabanı Bulunamıyor
- `data/` klasörünün mevcut olduğundan emin olun
- `data/erp.db` dosyasının doğru konumda olduğunu kontrol edin

### Port Zaten Kullanılıyor
```bash
# Farklı port kullan
npm run dev:simple -- -p 3001
```

### Bağımlılık Hataları
```bash
# Cache temizle ve yeniden yükle
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

## 📞 Destek

Herhangi bir sorun yaşarsanız, hata mesajlarını kontrol edin ve gerekirse log dosyalarını inceleyin.


