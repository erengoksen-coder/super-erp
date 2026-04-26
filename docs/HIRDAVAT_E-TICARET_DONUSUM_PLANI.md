# Hırdavatcınız Burada → E-Ticaret Dönüşüm Planı

Bu doküman **hirdavatcinizburada.com/tr** benzeri bir hırdavat / yapı market sitesinin e-ticaret sitesine nasıl dönüştürüleceğini adım adım açıklar ve proje yapısını tanımlar.

---

**Not:** E-ticaret mağaza kodu ERP’den **ayrıldı** ve masaüstünde **bağımsız proje** olarak kaydedildi:
- **Konum:** `C:\Users\PC\Desktop\hirdavat-eticaret`
- Bu proje kendi `package.json`, ürün verisi (`data/products.json`) ve API’si ile çalışır; super-erp ile bağlantılı değildir.
- ERP içindeki `/store` sayfaları ve ilgili bileşenler/API kaldırıldı.

---

## 1. Mevcut Site Analizi (Genel Hırdavat Sitesi Yapısı)

Tipik bir “Hırdavatcınız Burada” tarzı site şu özelliklere sahiptir:

| Özellik | Mevcut Durum (Tahmini) | E-Ticaret İçin Gerekli |
|--------|------------------------|-------------------------|
| **İçerik** | Kurumsal / tanıtım, ürün kataloğu | Ürün listesi + stok + fiyat + sepete ekleme |
| **Kullanıcı** | Ziyaretçi / iletişim formu | Üye girişi, adres, sipariş geçmişi |
| **Ödeme** | Yok veya “bizi arayın” | Online ödeme (kredi kartı, havale, kapıda ödeme) |
| **Sipariş** | E-posta / telefon | Sepet → Ödeme → Sipariş takibi |
| **Envanter** | Statik veya manuel | Stok senkronizasyonu, varyant (beden/birim) |

**Dönüşümün özü:** Siteyi “bilgi + katalog” yapıdan “alışveriş yapılabilir mağaza” yapıya taşımak.

---

## 2. E-Ticaret Dönüşümü İçin Yapılacaklar (Özet)

1. **Ürün kataloğu** → Ürün listesi, kategori, filtre, arama, ürün detay sayfası (fiyat, stok, “Sepete Ekle”).
2. **Kullanıcı sistemi** → Kayıt, giriş, şifre sıfırlama, profil, teslimat/fatura adresleri.
3. **Sepet** → Sepet sayfası, miktar güncelleme, kupon, kargo hesaplama.
4. **Ödeme** → Entegre ödeme (iyzico, PayTR, Stripe vb.), havale/EFT, kapıda ödeme seçenekleri.
5. **Sipariş** → Sipariş oluşturma, e-posta/SMS bildirimi, sipariş durumu takibi (panel + müşteri).
6. **Stok** → Stok güncellemesi (manuel veya ERP/entegratör ile).
7. **Kargo** → Kargo firması entegrasyonu, takip numarası.
8. **Mobil uyum** → Responsive tasarım, hızlı ve kullanılabilir mobil deneyim.
9. **SEO & performans** → Ürün sayfaları için meta etiketleri, hızlı yükleme, gerekirse SSG/ISR.

---

## 3. Teknik Mimari Önerisi

### 3.1 Seçenek A: Mevcut Super-ERP ile Entegre Mağaza

- **Frontend:** Next.js (mevcut proje) içinde `/store` veya ayrı subdomain.
- **Backend:** Mevcut `super-erp` API’leri (siparişler, hesaplar, stok, kargo).
- **Avantaj:** Tek veritabanı, tek yönetim paneli, siparişler doğrudan ERP’de.
- **Kullanım:** Bayi/müşteri portalları zaten var; B2C mağaza aynı hesap/sipariş yapısına bağlanabilir.

### 3.2 Seçenek B: Bağımsız E-Ticaret Projesi

- **Stack:** Next.js (App Router) + kendi API’leri veya headless e-ticaret (Medusa, Saleor, custom).
- **Entegrasyon:** ERP’ye sipariş/stok webhook veya dosya ile aktarım.
- **Avantaj:** Mağaza tamamen özelleştirilebilir; ileride farklı ERP’ye geçilebilir.

Bu proje dokümanında **Seçenek A** referans alınmıştır; mağaza `super-erp` içinde `/store` altında açılır ve mevcut hesaplar/siparişler ile çalışır.

---

## 4. Veri Modeli (Özet)

E-ticaret için mevcut modele eklenecek / uyarlanacak kavramlar:

| Kavram | Açıklama | ERP’de Karşılığı |
|--------|----------|-------------------|
| **Ürün (katalog)** | Ad, SKU, açıklama, fiyat, stok, kategori, görsel | `products`, `inventory` |
| **Kategori** | Ağaç yapısı (El aletleri, Elektrik, vb.) | Yeni tablo veya `products.category` |
| **Müşteri** | Üye, adres, iletişim | `accounts` (müşteri tipi) |
| **Sepet** | Geçici sepet (cookie/session veya DB) | Session / `cart` tablosu |
| **Sipariş** | Sepettekiler → sipariş kalemleri | `orders` + `order_items` |
| **Ödeme** | Ödeme yöntemi, tutar, durum | Yeni `payments` tablosu veya mevcut finans |

---

## 5. Sayfa ve Özellik Listesi

### 5.1 Müşteri Tarafı (Storefront)

| Sayfa / Özellik | Açıklama |
|-----------------|----------|
| **Ana sayfa** | Slider, kampanyalar, kategoriler, öne çıkan ürünler |
| **Kategoriler** | Liste veya dropdown, kategori sayfası |
| **Ürün listesi** | Kategori/arama sonucu, filtre (fiyat, marka), sıralama |
| **Ürün detay** | Görsel, fiyat, stok, açıklama, “Sepete Ekle”, varyant |
| **Sepet** | Kalemler, miktar, kargo alanı, kupon, toplam |
| **Ödeme / Checkout** | Adres, kargo seçimi, ödeme yöntemi, sipariş özeti |
| **Sipariş onay** | Teşekkür sayfası, sipariş numarası |
| **Hesabım** | Profil, adresler, sipariş geçmişi, favoriler |
| **Üye girişi / Kayıt** | Giriş, kayıt, şifremi unuttum |

### 5.2 Yönetim Tarafı (Mevcut ERP’de)

- Ürün/kategori yönetimi (zaten stok ve ürün varsa genişletilir).
- Siparişler (mevcut sipariş modülü e-ticaret siparişlerini de gösterir).
- Stok güncellemesi (satışa göre otomatik veya manuel).
- Kargo takip numarası girişi ve müşteriye bildirim.

---

## 6. Ödeme Entegrasyonu

- **Kredi kartı:** iyzico, PayTR, Stripe (Türkiye için iyzico/PayTR tercih edilir).
- **Havale/EFT:** Banka hesap bilgileri sayfası + manuel “ödendi” işaretleme.
- **Kapıda ödeme:** Siparişte seçenek olarak işaretlenir; tahsilat sonrası ERP’de kapatılır.

Ödeme gateway’i seçildikten sonra webhook ile sipariş durumu güncellenmeli.

---

## 7. Güvenlik ve Yasal

- **SSL:** Tüm site HTTPS.
- **KVKK:** Aydınlatma metni, çerez onayı, müşteri verisi saklama/silme.
- **Mesafeli satış sözleşmesi:** Checkout’ta onay kutusu, sayfa linki.
- **Ödeme:** PCI-DSS’e uyum (kart bilgisi gateway’de kalmalı, sitede saklanmamalı).

---

## 8. Proje Yapısı (Super-ERP İçinde Mağaza)

**Oluşturulan yapı:**

```
app/
  store/
    layout.tsx              # Mağaza layout (StoreHeader, StoreFooter)
    page.tsx                # Ana sayfa (hero, kategoriler, öne çıkan ürünler)
    kategoriler/page.tsx     # Kategori listesi
    urun/
      page.tsx              # Ürün listesi + arama
      [id]/page.tsx         # Ürün detay
    sepet/page.tsx          # Sepet
    odeme/page.tsx          # Checkout (test sipariş)
    siparis-tamamlandi/page.tsx
    gizlilik/page.tsx       # Gizlilik (placeholder)
    mesafeli-satis/page.tsx # Mesafeli satış (placeholder)
  api/
    store/
      products/route.ts     # GET ürün listesi (auth yok)
components/
  store/
    StoreHeader.tsx
    StoreFooter.tsx
    ProductCard.tsx
lib/
  store/
    cartStore.ts            # Zustand sepet (persist)
```

**Erişim:** Mağaza `/store` yolunda açılır; giriş zorunlu değildir (public path). Sidebar ve ERP shell bu rotada gösterilmez (`LayoutSwitcher`).

---

## 9. Uygulama Sırası (Yol Haritası)

1. **Faz 1 – Katalog & listeleme**  
   Kategori/ürün listesi, ürün detay sayfası, arama (mevcut API veya yeni store API).

2. **Faz 2 – Sepet**  
   Sepet state (cookie veya DB), sepet sayfası, “Sepete Ekle” davranışı.

3. **Faz 3 – Kullanıcı & checkout**  
   Giriş/kayıt, adres, checkout akışı, sipariş oluşturma (mevcut orders API’ye bağlama).

4. **Faz 4 – Ödeme**  
   Ödeme gateway entegrasyonu, sipariş durumu güncelleme.

5. **Faz 5 – Bildirim & kargo**  
   E-posta/SMS şablonları, kargo entegrasyonu, takip no.

6. **Faz 6 – SEO, performans, raporlama**  
   Meta etiketleri, görsel optimizasyonu, basit satış raporları.

---

## 10. Sonuç

**Hırdavatcınız Burada** benzeri bir siteyi e-ticarete çevirmek için:

- Mevcut içeriği **ürün + fiyat + stok** ile zenginleştirin.
- **Sepet, kullanıcı, checkout ve ödeme** akışını ekleyin.
- Mümkünse **mevcut Super-ERP** ile entegre çalışın (sipariş ve stok tek merkezde kalsın).
- **Mobil, güvenlik ve KVKK** baştan düşünülmüş olsun.

Bu dokümandaki sayfa listesi ve klasör yapısı, `app/store` altında oluşturulan proje iskeleti ile uyumludur; önce katalog ve sepet, sonra checkout ve ödeme eklenerek ilerlenebilir.
