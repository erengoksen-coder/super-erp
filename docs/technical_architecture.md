# Super ERP: Teknik Mimari (Technical Architecture)

Super ERP'nin teknik yapısı, modern, performanslı ve ölçeklenebilir bir kurumsal uygulama olarak tasarlanmıştır.

## 🏗️ Teknoloji Yığıtı (Tech Stack)
- **Framework**: Next.js 14+ (App Router)
- **Dil**: TypeScript (Strict Typings)
- **Veritabanı**: SQLite3 (better-sqlite3)
- **Stil**: Tailwind CSS
- **İkonlar**: Lucide React
- **Durum Yönetimi**: SWR (Stale-While-Revalidate) & Context API

---

## 💾 Veritabanı Modeli (DB Schema)
Sistem, ilişkisel bir veritabanı şeması üzerine inşa edilmiştir.

### 💼 Şirket & Şubeler
- **companies**: Şirket temel bilgileri.
- **branches**: Şubeler ve lokasyonlar.
- **warehouses**: Depolar ve stok sahaları.

### 📦 Envanter & Üretim
- **materials**: Hammaddeler ve yarı mamüller.
- **products**: Satışa hazır mamüller (Modeller).
- **bom**: Ürün reçeteleri (Bill of Materials).
- **stock_movements**: Tüm giriş/çıkış tarihçesi.
- **production_orders**: Üretim emirleri ve iş takibi.
- **product_serial_numbers**: Barkod/Seri no bazlı ürün takibi.

### 💰 Finans & Satış
- **accounts**: Cari hesaplar (Müşteriler, Tedarikçiler, Bankalar).
- **orders**: Müşteri siparişleri ve statüler.
- **account_transactions**: Çift taraflı muhasebe kayıtları (Yevmiye).

---

## 🔌 API Mimarisi
Tüm işlemler `/api/*` uç noktaları üzerinden yönetilir.
- **Korumalı Rotalar**: `withAuth` ve `withPermission` middleware'leri ile yetkilendirme.
- **Webhook Motoru**: `lib/webhooks/dispatch.ts` üzerinden asenkron olay dağıtımı.
- **SWR Entegrasyonu**: Sayfalar arası veri tutarlılığı için `lib/api/client.ts` kullanılmıştır.

---

## 🎨 Tasarım Sistemi (UI/UX)
- **Dinamik Tema**: `--primary-600` CSS değişkeni ile çalışma zamanı marka rengi değişimi.
- **Loading State**: `Skeleton` bileşenleri ile görsel devamlılık.
- **Yüzeyler**: Cam tasarım (Glassmorphism) ve koyu mod (Dark Mode) öncelikli estetik.

---

> [!IMPORTANT]
> **Genişletilebilirlik:** Yeni modül eklemek için `app/api/` altında bir endpoint ve `app/` altında bir sayfa oluşturmanız yeterlidir. Mevcut `lib/database/db.ts` üzerinde tablo tanımları güncellenebilir.
