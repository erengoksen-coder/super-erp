# Projeyi Daha Verimli ve Kullanışlı Hale Getirme Rehberi

Bu dokümanda **verimlilik** (performans, kod kalitesi, geliştirici deneyimi) ve **kullanılabilirlik** (UX, tutarlılık, geri bildirim) için öncelikli adımlar listelenmiştir.

---

## 1. Kullanılabilirlik (UX)

### 1.1 Alert yerine toast / bildirim
- **Durum:** Birçok sayfada `alert()` ile başarı/hata gösteriliyor; tarayıcı dialog’u kullanıcı deneyimini bozuyor.
- **Öneri:** Projeye **sonner** veya **react-hot-toast** ekleyin; tüm `alert()` çağrılarını toast ile değiştirin.
- **Fayda:** Sayfa kaydırılmadan, köşede kısa süreli bildirim; daha modern ve tutarlı UX.

```bash
npm install sonner
```

- Başarı/hata/uyarı için ortak bir yardımcı kullanın (örn. `lib/notify.ts` → `toast.success()`, `toast.error()`).

### 1.2 Yükleme ve boş durumları
- **Durum:** Bazı sayfalarda loading/boş durum tek tip değil; bazen sadece metin, bazen hiç yok.
- **Öneri:**
  - Ortak bir **`<PageLoader />`** veya **`<Skeleton />`** bileşeni kullanın (liste/tablo sayfalarında).
  - Veri yokken **boş durum** (empty state) gösterin: “Henüz kayıt yok”, “Filtreye uygun sonuç yok” + aksiyon butonu.
- **Fayda:** Kullanıcı “dondu mu, yüklü mü?” sorusunu sormaz; boş listelerde ne yapacağı net olur.

### 1.3 Form validasyonu ve hata mesajları
- **Öneri:** Formlarda alan bazlı hata mesajları (inline) kullanın; sadece `alert('Lütfen X girin')` yerine ilgili input’un altında kırmızı metin.
- Zaten `lib/validation/schemas.ts` ve Zod var; bunları form bileşenleriyle birleştirip tek bir form wrapper’da toplayabilirsiniz (örn. react-hook-form + zod).

### 1.4 Klavye ve erişilebilirlik
- Kritik sayfalarda **Enter ile gönder** (form submit).
- Modal’lar açıkken **Escape ile kapatma**.
- Önemli butonlara **aria-label** ekleyin (özellikle sadece ikon olanlar).

---

## 2. Verimlilik (Performans ve Kod)

### 2.1 Veri çekme: SWR kullanımını yaygınlaştırın
- **Durum:** Birçok sayfa `useState` + `useEffect` + `fetch` ile veri çekiyor; SWR sadece bazı yerlerde kullanılıyor.
- **Öneri:** Liste/detay sayfalarında **`useApi` (SWR)** kullanın:
  - Otomatik yeniden deneme, cache, aynı key’e duplicate istek engelleme.
  - `loading`, `error`, `mutate` tek yerden gelir.
- **Fayda:** Daha az tekrarlı kod, daha iyi cache davranışı, kullanıcı sekme değiştirip geri gelince güncel veri.

### 2.2 API yanıt formatı ve hata yönetimi
- **Durum:** Bazı API’ler `{ data }`, bazıları doğrudan dizi/obje dönüyor; frontend’de `data?.entries ?? data?.data ?? []` gibi fallback’ler var.
- **Öneri:**
  - Tüm API’lerde standart bir **response wrapper** kullanın (örn. `{ success, data, error?, message? }`).
  - `lib/api/response.ts` içindeki `ok()` / `fail()` kullanımını tüm route’larda tutarlı hale getirin.
- **Fayda:** Frontend’de tek bir parse mantığı; hata mesajlarını kullanıcıya göstermek kolaylaşır.

### 2.3 Ortak liste/tablo bileşeni
- **Durum:** Orders, users, accounts, materials vb. benzer tablo + filtre + arama + sayfalama yapıları tekrarlanıyor.
- **Öneri:** Ortak bir **`<DataTable />`** veya **`<ListPage />`** bileşeni:
  - Kolon tanımı, sıralama, filtre, arama, sayfalama (opsiyonel).
  - Loading skeleton, boş durum, hata durumu bu bileşende olsun.
- **Fayda:** Yeni liste sayfası eklemek çok hızlı; davranış ve görünüm tutarlı olur.

### 2.4 Tekrarlanan mantığı hook’lara taşıyın
- Örnekler:
  - **useOrders()** → sipariş listesi + filtre + yenile.
  - **useDebounce(value, ms)** → arama/filtre input’larında gereksiz API çağrılarını azaltır.
- **Fayda:** Sayfa bileşenleri sadeleşir; mantık test edilebilir ve tek yerde güncellenir.

---

## 3. Güvenlik ve Kalite (Mevcut dokümana göre)

- **Şifre:** SHA-256 yerine **bcrypt/argon2** kullanımı (projede bcryptjs var; auth akışında kullanıldığından emin olun).
- **Token:** Mümkünse **HttpOnly cookie** + kısa ömürlü JWT; hassas işlemlerde refresh token akışı.
- **TypeScript:** `next.config.ts` içindeki `typescript.ignoreBuildErrors` kapatılıp tip hataları adım adım giderilmeli.
- **`any` kullanımı:** Kritik modüllerde (auth, ödeme, stok) tip güvenliği artırılmalı.

---

## 4. Öncelik Sırası (Pratik Uygulama)

| Öncelik | Adım | Etki | Zorluk |
|--------|------|------|--------|
| 1 | Toast kütüphanesi + alert’leri değiştir | UX büyük artış | Düşük |
| 2 | Ortak loading/empty state bileşenleri | Tutarlı his, güven | Düşük |
| 3 | Liste sayfalarında SWR (useApi) kullanımı | Performans + kod sadece | Orta |
| 4 | API response standardı + tek parse mantığı | Bakım kolaylığı | Orta |
| 5 | Ortak DataTable/ListPage | Hız + tutarlılık | Orta–Yüksek |
| 6 | Form + validasyon + inline hata | UX + veri kalitesi | Orta |
| 7 | TypeScript hatalarını azaltma | Uzun vadede güvenilirlik | Yüksek |

---

## 5. Hızlı Kazanımlar (1–2 gün)

1. **Toast:** `sonner` kur, `app/layout.tsx`’e `<Toaster />` ekle, bir sayfada (örn. users veya orders) tüm `alert()` çağrılarını `toast.success()` / `toast.error()` ile değiştir; diğer sayfaları aynı şablona göre güncelle.
2. **Ortak loader:** `components/ui/PageLoader.tsx` oluştur (spinner veya skeleton); 2–3 yoğun sayfada (orders, users, materials) kullan.
3. **Boş durum:** `components/ui/EmptyState.tsx` (ikon + başlık + açıklama + opsiyonel buton); bir liste sayfasında “veri yok” durumunda kullan.

Bu adımlar mevcut yapıyı bozmadan projeyi hem daha verimli hem daha kullanışlı hale getirir.
