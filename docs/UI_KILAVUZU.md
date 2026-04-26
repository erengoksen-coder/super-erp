# UI Kılavuzu – Tasarım Sistemi ve Bileşen Kullanımı

Bu belge Faz 3 (UI/UX yenileme) kapsamında kullanılan tasarım token’ları, bileşenler ve nerede kullanıldıklarını özetler. Detaylı tasarım hedefleri için `docs/UI_REVAMP_PLAN.md` dosyasına bakın.

---

## 1. Tasarım token’ları

### 1.1 Tanım

- **CSS değişkenleri:** `app/globals.css` içinde `:root` altında tanımlı. Tüm sayfa ve bileşenlerde kullanılır.
- **TypeScript:** `lib/design/tokens.ts` – renk, spacing, radius, shadow, transition, typography (JS/TS tarafında referans veya dokümantasyon için).

### 1.2 Renk token’ları (CSS)

| Değişken | Açıklama | Örnek kullanım |
|----------|----------|----------------|
| `--background` | Sayfa arka planı | `bg-[var(--background)]` |
| `--foreground` | Ana metin rengi | `text-[var(--foreground)]` |
| `--surface` | Kart / panel arka planı | `bg-[var(--surface)]` |
| `--surface-light` | Açık yüzey | `bg-[var(--surface-light)]` |
| `--primary` | Ana vurgu (indigo) | `text-[var(--primary)]`, `border-[var(--primary)]` |
| `--primary-light` | Açık primary | Hover, link |
| `--primary-dark` | Koyu primary | Gradient |
| `--primary-rgb` | RGB değer (rgba için) | `rgba(var(--primary-rgb), 0.1)` |
| `--secondary`, `--success`, `--warning`, `--danger` | Semantik renkler | Badge, alert, buton |
| `--border` | Çerçeve rengi | `border-[var(--border)]` |
| `--text` | Ana metin | `text-[var(--text)]` (genelde `--foreground` ile aynı) |
| `--text-secondary` | İkincil metin | `text-[var(--text-secondary)]` |
| `--shadow` | Gölge rengi | `box-shadow: var(--shadow)` |

### 1.3 Spacing, radius, transition

- **Spacing:** `--spacing-xs` … `--spacing-2xl` (rem)
- **Radius:** `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`
- **Transition:** `--ease-out`, `--duration-fast`, `--duration-normal`

Tailwind ile kullanım: `border-[var(--border)]`, `rounded-[var(--radius-lg)]`, `transition-[var(--duration-normal)]`.

---

## 2. Bileşenler ve kullanım yerleri

### 2.1 Layout

| Bileşen | Dosya | Kullanım |
|---------|--------|----------|
| **AppDashboardLayout** | `components/layouts/AppDashboardLayout.tsx` | Tüm modül sayfalarında: başlık, alt başlık, ikon, aksiyonlar, breadcrumb. Token’larla uyumlu header. |
| **Sidebar** | `components/Sidebar.tsx` | Ana navigasyon; token’larla (`--background`, `--border`) uyumlu. |
| **MainShell** | `components/MainShell.tsx` | Sidebar + içerik alanı sarmalayıcı. |

### 2.2 Form ve aksiyon

| Bileşen | Dosya | Kullanım |
|---------|--------|----------|
| **Button** | `components/ui/Button.tsx` | `variant`: solid, outline, ghost. `color`: primary, secondary, success, warning, error. `size`: xs, sm, md, lg, xl, icon. Focus-visible ring `var(--primary)`; min 44px dokunma alanı. |
| **Input** | `components/ui/Input.tsx` | Form alanları; label, error, helperText; `aria-invalid`, `aria-describedby`; focus `var(--primary)`. |
| **ConfirmDialog** | `components/ui/ConfirmDialog.tsx` | Onay penceresi; Modal + Button kullanır. variant: danger, warning, info. |

Kullanıldığı sayfalar (örnek): Üretim, Siparişler, Finans, Stok, CRM, Müşteri grupları, Fiyat listeleri, Teklifler, İadeler, Depolar, Bayi siparişleri, Kalite kontrol, Bütçe, Şifre değiştir, Admin webhooks.

### 2.3 Kart ve içerik

| Bileşen | Dosya | Kullanım |
|---------|--------|----------|
| **Card** | `components/ui/Card.tsx` | `variant`: elevated, flat, outlined, ghost, glass. `padding`: none, xs, sm, md, lg, xl. Opsiyonel `aria-label` ile `role="region"`. |
| **CardHeader** | Aynı dosya | Başlık, alt başlık, ikon, aksiyon alanı. |
| **CardBody** / **CardFooter** | Aynı dosya | İçerik ve alt bölüm. |

Kullanıldığı sayfalar: Üretim, Finans, Stok (inventory), Admin, Müşteri grupları, Teklifler, Depolar, İadeler, BOM, MRP, Webhooks, Bütçe, Ürünler B2B, Kalite kontrol, vb.

### 2.4 Tablo ve veri

| Bileşen | Dosya | Kullanım |
|---------|--------|----------|
| **Table, TableHeader, TableBody, TableHead, TableRow, TableCell** | `components/ui/table.tsx` | Veri tabloları; `TableHead` varsayılan `scope="col"`. |
| **DataTable** | `components/ui/DataTable.tsx` | TanStack Table tabanlı; sıralama, context menu, isteğe bağlı inline düzenleme. |
| **EmptyState** | `components/ui/EmptyState.tsx` | Veri yokken gösterim. |
| **LoadingState** | `components/ui/LoadingState.tsx` | Yükleniyor göstergesi. |
| **TableSkeleton** | `components/ui/TableSkeleton.tsx` | Tablo iskelet yükleme. |

Kullanıldığı sayfalar: Siparişler (DataTable), Üretim iş istasyonları, BOM (table), Finans raporları (EmptyState, PageLoader), Admin, Webhooks, vb.

### 2.5 Overlay ve diğer

| Bileşen | Dosya | Kullanım |
|---------|--------|----------|
| **Modal** | `components/ui/modal.tsx` | `role="dialog"`, Escape ile kapatma, focus trap, overlay `var(--background)`. |
| **Badge** | `components/ui/Badge.tsx` | Durum etiketleri (solid, outline, soft). |
| **Breadcrumb** | `components/ui/Breadcrumb.tsx` | Sayfa yolu. |
| **CommandPalette** | `components/ui/CommandPalette.tsx` | Ctrl/Cmd+K arama. |

---

## 3. Token kullanımı – örnekler

### 3.1 Yeni sayfa / kart stilleri

- Arka plan: `bg-[var(--surface)]` veya `bg-[var(--background)]`
- Metin: `text-[var(--foreground)]`, `text-[var(--text-secondary)]`
- Çerçeve: `border-[var(--border)]`
- Vurgu / link: `text-[var(--primary)]`, `hover:border-[var(--primary)]`
- Yarı saydam primary: `rgba(var(--primary-rgb), 0.1)` (CSS) veya Tailwind ile `bg-[var(--primary)]/10`

### 3.2 Mevcut bileşenlerle tutarlılık

- Button ve Input zaten focus/ring için `var(--primary)` kullanıyor.
- Card variant’ları `lib/cn.ts` içinde (cardVariants, cardPaddings); sayfa içinde ek border için `border-[var(--border)]` kullanın.
- AppDashboardLayout ve Sidebar header/border’da token kullanıyor; yeni bölümlerde aynı token’ları tercih edin.

### 3.3 Responsive ve erişilebilirlik

- Dokunma alanı: Button’da min 44px; form elemanlarında uygun padding.
- Focus: `focus-visible:ring-2 focus-visible:ring-[var(--primary)]`.
- Anlamlı etiketler: `aria-label`, `aria-describedby`, `aria-invalid` (Input), `role="region"` (Card, opsiyonel).

---

## 4. İlgili dosyalar

| Dosya | Açıklama |
|-------|----------|
| `app/globals.css` | CSS token tanımları (:root) |
| `app/design-system.css` | Token alias’lar, focus, animasyon, glass |
| `app/premium-ui.css` | Sidebar/dashboard premium stilleri (token tabanlı) |
| `lib/design/tokens.ts` | Token değerleri (JS/TS) |
| `lib/cn.ts` | buttonVariants, buttonSizes, cardVariants, inputVariants, badgeVariants |
| `docs/UI_REVAMP_PLAN.md` | Tasarım prensipleri ve renk şemaları |
| `docs/BACKEND.md` | API ve repository dokümantasyonu |

---

**Faz 3 tamamlandığında** tüm modül sayfaları bu bileşenler ve token’larla tutarlı hale getirilmiş olacak; yeni sayfa eklerken bu kılavuza uyulması önerilir.
