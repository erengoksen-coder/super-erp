# Super ERP - Proje Analiz ve Geliştirme Dokümanı

**Tarih:** 01 Nisan 2026  
**Proje Versiyonu:** 4.1.0  
**Framework:** Next.js 14 (App Router) + TypeScript + SQLite

---

## 1. PROJE YAPISI ÖZETI

### 1.1 Teknoloji Yığını
| Katman | Teknoloji |
|--------|----------|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| State Management | Zustand + SWR |
| Backend | Next.js API Routes |
| Database | SQLite (better-sqlite3) |
| Validation | Zod |
| Auth | JWT (jose) |
| Email | Nodemailer |
| PDF/Excel | jsPDF, xlsx, html2canvas |

### 1.2 Modül Yapısı
```
app/
├── api/           (58 endpoint kategorisi)
├── auth/          (Kimlik doğrulama)
├── dashboard/     (Ana gösterge paneli)
├── inventory/     (Envanter yönetimi)
├── production/    (Üretim yönetimi)
├── orders/        (Sipariş yönetimi)
├── shipments/     (Sevkiyat yönetimi)
├── finance/       (Finans/Ödemeler)
├── hr/            (İK/PDKS)
├── reports/       (Raporlama)
├── mobile/        (Mobil arayüz)
├── admin/         (Yönetim)
└── crm/           (Müşteri ilişkileri)
```

---

## 2. KRITIK EKSİKLİKLER

### 2.1 Güvenlik Açıkları

#### 🔴 KRITIK: Parola Saklama
**Durum:** SHA-256 → bcrypt geçişi yapıldı ancak eski SHA-256 hash'ler hâlâ destekleniyor

**Dosya:** `lib/auth/password.ts:30-32`
```typescript
if (isLegacySha256Hash(hash)) {
  return sha256(password) === hash  // Zayıf hash hâlâ aktif
}
```

**Risk:** Eski kullanıcı hesapları brute-force saldırılarına açık  
**Öneri:** SHA-256 hash'leri olan kullanıcıları bcrypt'e migrate eden script yazılmalı

#### 🔴 KRITIK: Token Saklama
**Durum:** localStorage kullanılıyor

**Etkilenen Dosyalar:**
- `lib/store/authStore.ts`
- `app/auth/login/page.tsx`

**Risk:** XSS saldırılarına karşı savunmasız  
**Öneri:** HttpOnly, Secure, SameSite cookie'lerine geçiş

#### 🟠 ORTA: CSRF Koruması Eksik
**Durum:** API route'larında CSRF token kontrolü yok  
**Öneri:** SameSite cookie + Origin header kontrolü

#### 🟠 ORTA: Rate Limiting
**Durum:** `lib/rateLimit.ts` mevcut ancak tutarsız kullanım  
**Öneri:** Tüm API endpoint'lerinde uygulanmalı

#### 🟠 ORTA: Input Validation
**Durum:** Zod şemaları mevcut ancak tüm endpoint'lerde kullanılmıyor  
**Öneri:** Merkezi validation middleware

---

### 2.2 TypeScript Tip Güvenliği

#### 🔴 KRITIK: Build Error Ignore
**Dosya:** `next.config.mjs`
```javascript
typescript: {
  ignoreBuildErrors: true  // Bu kapatılmalı!
}
```

**Sorun:** 25+ tip hatası mevcut, bunlar düzeltilmeli

#### 🔴 KRITIK: Çok Sayıda `any` Kullanımı
**Önemli Dosyalar:**
- `lib/api/validate.ts` - body: any
- `lib/hooks/useNotifications.ts` - payload: any
- `lib/hooks/useRealtime.ts` - payload: any
- `lib/repositories/accounts.ts` - implicit any returns

**Öneri:** Strict mode açılmalı ve tipler tanımlanmalı

---

### 2.3 Test Eksikliği

#### 🔴 KRITIK: Test Dosyası Yok
```bash
$ find . -name "*.test.*" -o -name "*.spec.*"
# Sonuç: 0 dosya
```

**Öneri:** Jest/Vitest kurulumu ve temel testler yazılmalı

---

## 3. ORTA ÖNCELİKLİ EKSİKLİKLER

### 3.1 API Tutarsızlıkları

| Sorun | Açıklama |
|-------|----------|
| Response format | Bazı API'ler `{data}`, bazıları `{error}`, bazıları ham obje döner |
| Error handling | Her route'ta farklı hata formatları |
| HTTP status codes | Tutarsız kullanım (200/201/400/500) |

**Öneri:** Merkezi `lib/api/response.ts` standardı

### 3.2 State Management

**Mevcut:** Zustand store'ları + localStorage persist  
**Sorunlar:**
- 5 store var: authStore, preferencesStore, uiStore, seenFeaturesStore, safeStorage
- Store'lar arası senkronizasyon yok
- Server state (SWR) ile client state ayrımı net değil

**Öneri:** React Query / TanStack Query'e geçiş düşünülmeli

### 3.3 Caching Stratejisi

**Mevcut:** SWR + memory cache  
**Sorunlar:**
- Cache invalidation stratejisi belirsiz
- Stale-while-revalidate süreleri tutarsız
- Prefetch mekanizması yok

**Öneri:** Redis/Upstash entegrasyonu

### 3.4 Middleware Uyarısı

**Mesaj:** `"middleware" file convention is deprecated. Please use "proxy" instead.`  
**Etki:** İleride Next.js sürüm uyumsuzluğu  
**Öneri:** Proxy'e geçiş planlanmalı

---

## 4. DÜŞÜK ÖNCELİKLİ EKSİKLİKLER

### 4.1 PWA Desteği
- Service worker yok
- Web manifest eksik
- Offline modu çalışmıyor (`app/offline/page.tsx` mevcut ama aktif değil)

### 4.2 CI/CD Pipeline
- Pipeline yok
- Otomatik lint/test/build kontrolü yok
- Docker image build otomatizasyonu yok

### 4.3 Kod Kalitesi
- DRY ihlalleri mevcut
- Magic string/number'lar var
- Bazı dosyalarda tekrar eden logic

---

## 5. VERİTABANI ANALİZİ

### 5.1 Mevcut Tablolar (50+)
- `app_settings` - Uygulama ayarları
- `companies`, `branches`, `warehouses` - Organizasyon
- `materials`, `products`, `bom` - Envanter/Üretim
- `orders`, `order_items` - Siparişler
- `production_orders`, `work_orders` - Üretim
- `shipments`, `shipment_items` - Sevkiyat
- `accounts`, `account_transactions` - Cari/Muhasebe
- `invoices`, `invoice_items` - Faturalar
- `hr_attendance`, `hr_leaves` - İK/PDKS
- `audit_logs` - Denetim kayıtları

### 5.2 Şema Sorunları
- Bazı tablolarda `company_id`/`branch_id` eksik
- Soft delete (`deleted_at`) tutarsız
- İndeksleme stratejisi belirsiz
- Foreign key constraint'leri `OFF` durumda

**Dosya:** `lib/database/db.ts:77`
```typescript
instance.pragma('foreign_keys = OFF')  // Risk!
```

---

## 6. PERFORMANS SORUNLARI

### 6.1 Bilinen Sorunlar
- Büyük veri setlerinde sayfalama eksik
- N+1 sorgu problemleri
- Gereksiz re-render'lar
- Bundle size optimizasyonu yok

### 6.2 Dosya
**Doküman:** `docs/PERFORMANCE_VIOLATIONS.md` mevcut

---

## 7. GELİŞTİRME ÖNERİLERİ

### 7.1 Acil Yapılması Gerekenler (1-2 Hafta)

| # | Görev | Öncelik | Süre |
|---|-------|---------|------|
| 1 | TypeScript `ignoreBuildErrors: false` yap ve hataları düzelt | 🔴 Kritik | 1 hafta |
| 2 | SHA-256 kullanıcıları bcrypt'e migrate script'i | 🔴 Kritik | 1 gün |
| 3 | HttpOnly cookie'ye geçiş | 🔴 Kritik | 2 gün |
| 4 | CSRF koruması ekle | 🟠 Orta | 1 gün |
| 5 | Temel testler yaz (login, CRUD) | 🔴 Kritik | 2 gün |

### 7.2 Kısa Vadeli (1 Ay)

| # | Görev | Öncelik |
|---|-------|---------|
| 6 | Merkezi API response formatı oluştur | 🟠 Orta |
| 7 | Rate limiting tüm API'lere uygula | 🟠 Orta |
| 8 | Cache strategy belirle ve uygula | 🟠 Orta |
| 9 | Middleware → Proxy geçişi | 🟠 Orta |
| 10 | Foreign keys ON yap | 🟠 Orta |

### 7.3 Orta Vadeli (2-3 Ay)

| # | Görev | Öncelik |
|---|-------|---------|
| 11 | React Query'e geçiş | 🟡 Düşük |
| 12 | CI/CD pipeline kur | 🟡 Düşük |
| 13 | PWA desteği | 🟡 Düşük |
| 14 | Kod refactoring (DRY) | 🟡 Düşük |
| 15 | E2E testler | 🟡 Düşük |

### 7.4 Uzun Vadeli

| # | Görev | Öncelik |
|---|-------|---------|
| 16 | PostgreSQL'e geçiş (ölçeklenebilirlik) | 🟡 Düşük |
| 17 | Microservices mimari | 🟡 Düşük |
| 18 | Gerçek zamanlı işbirliği (WebSocket) | 🟡 Düşük |

---

## 8. MEVCUT DOKÜMANLAR

| Dosya | İçerik |
|-------|--------|
| `docs/technical_architecture.md` | Teknik mimari |
| `docs/HATA_VE_EKSIKLER_RAPORU.md` | Bilinen hatalar |
| `docs/PROJE_EKSIKLIKLERI.md` | Eksiklikler özeti |
| `docs/PERFORMANCE_VIOLATIONS.md` | Performans sorunları |
| `docs/GELISTIRME_ONERILERI.md` | Geliştirme önerileri |
| `docs/USER_API.md` | API dokümantasyonu |
| `docs/ENVIRONMENT_SETUP.md` | Kurulum rehberi |
| `docs/DOCKER_PRODUCTION.md` | Docker deployment |

---

## 9. ÖZET TABLO

| Kategori | Durum | Risk |
|----------|-------|------|
| Build | Başarılı (type-check atlanıyor) | 🔴 |
| TypeScript | 25+ hata | 🔴 |
| Güvenlik (Auth) | Zayıf hash + localStorage | 🔴 |
| Test | Sıfır test | 🔴 |
| API Standard | Tutarsız | 🟠 |
| Performance | Bazı sorunlar mevcut | 🟠 |
| CI/CD | Yok | 🟡 |
| PWA | Yok | 🟡 |
| Kod Kalitesi | Orta | 🟡 |

---

## 10. SONRAKİ ADIMLAR

1. **Hangi görevlere öncelik vermemi istersiniz?**
2. **Test framework olarak Jest veya Vitest tercih ediyor musunuz?**
3. **PostgreSQL'e geçiş planı var mı?**

---

*Bu doküman otomatik analiz sonucu oluşturulmuştur. Detaylı inceleme için belirli modülleri seçebilirim.*
