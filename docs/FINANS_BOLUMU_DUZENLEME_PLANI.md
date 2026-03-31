# Finans Bölümü Düzenleme Planı

**Amaç:** Finans modülünü en iyi finans/muhasebe yazılımlarına (Paraşüt, Luca, e-Babylon, SAP FI, Netsuite vb.) referans alarak yapılandırmak ve kullanılabilirliği artırmak.

**Düzenlemeden önce yapılacakların özeti aşağıdadır.**

---

## 1. MEVCUT DURUM ÖZETİ

- **Finans ana sayfa:** Hesap Planı, Yevmiye Kayıtları, Defter-i Kebir kartları; Yeni Fiş butonu.
- **Alt sayfalar:** Hesap Planı (chart-of-accounts), Yevmiye (journal-entries), Defter-i Kebir (general-ledger), Yeni Fiş (new), Fire/Maliyet (fire-analysis), Maliyet Analizi (cost-analysis).
- **Sidebar:** Cari Hesaplar, Ödemeler, Yevmiye Fişleri, Yeni Fiş, Hesap Planı, Büyük Defter, Fire/Maliyet.
- **API tarafı:** `/api/accounting/*`, `/api/financial/*` (balance-sheet, income-statement, cash-flow, trial-balance, metrics, trends vb.) mevcut; bazı raporların arayüzü yok.

---

## 2. YAPILACAKLAR (Düzenlemeden Önce Plan)

### 2.1 Finans Ana Sayfa (Hub) Yeniden Yapılandırma

- **Kategorize menü (profesyonel yazılım mantığı):**
  - **Kayıtlar:** Yevmiye Fişleri, Yeni Fiş, Defter-i Kebir (Büyük Defter).
  - **Hesap & Plan:** Hesap Planı (Chart of Accounts).
  - **Cari & Nakit:** Cari Hesaplar, Ödemeler (tek merkezden erişim).
  - **Raporlar:** Mizan, Gelir Tablosu, Bilanço, Nakit Akışı, Finansal Metrikler (yeni linkler).
  - **Maliyet & Fire:** Fire Analizi, Maliyet Analizi (mevcut sayfalar).
- **Özet KPI alanı:** Ana sayfada dönem bazlı kısa özet (toplam borç/alacak, nakit benzeri bir gösterge, seçilen dönem).
- **Hızlı işlemler:** Yeni Fiş, Yeni Cari, Ödeme girişi (tek tıkla ilgili sayfaya yönlendirme).

### 2.2 Hesap Planı (Chart of Accounts)

- **Hiyerarşik görünüm:** Ana hesap / alt hesap ağacı (tree) veya girintili liste; kod yapısı (1, 10, 100, 1000 vb.) net görünsün.
- **Hesap tipi standardı:** Varlık, Borç, Özkaynak, Gelir, Gider (TFRS/UFRS uyumlu etiketler).
- **Bakiye sütunu:** Hesap bazında borç/alacak bakiye veya net bakiye; dönem filtresi (tarih aralığı).
- **Arama ve filtre:** Koda veya hesap adına göre arama; hesap tipine göre filtre.
- **Validasyon:** Aynı kod tekrarı engelleme; silme/ pasifleştirme kuralları (hareket varsa uyarı).

### 2.3 Yevmiye Fişleri (Journal Entries)

- **Fiş listesi:** Tarih aralığı, fiş no, açıklama, toplam borç/alacak, referans (satış, alış, stok vb.); sayfalama veya “daha fazla” ile performans.
- **Fiş detay:** Satır bazında hesap kodu, hesap adı, borç, alacak, açıklama; borç = alacak kontrolü her zaman görünsün.
- **Yeni fiş / düzenleme:** Çok satırlı form; hesap seçimi (dropdown/autocomplete Hesap Planından); borç/alacak toplamı otomatik; borç ≠ alacak ise kaydetmeyi engelle veya uyarı.
- **Referans bağlantısı:** Fiş hangi işleme ait (fatura, sipariş, üretim vb.) ise oraya link (opsiyonel: ilgili sayfaya git).

### 2.4 Defter-i Kebir (Büyük Defter)

- **Hesap seçimi:** Tek hesap veya birden fazla hesap; dönem (başlangıç–bitiş tarihi).
- **Tablo:** Tarih, fiş no, açıklama, borç, alacak, bakiye (kümülatif veya hesap yönüne göre +/-).
- **Özet satır:** Seçilen dönem için toplam borç, toplam alacak, dönem sonu bakiye.

### 2.5 Mizan (Trial Balance)

- **Sayfa ekleme:** `/finance/trial-balance` (veya `/reports/trial-balance`).
- **İçerik:** Dönem seçimi; hesap kodu, hesap adı, dönem borç toplamı, dönem alacak toplamı, bakiye (borç/alacak); toplam satırı (borç = alacak kontrolü).
- **Veri:** Mevcut `/api/financial/trial-balance` API’sine bağlanacak; yoksa yevmiye/hareket verisinden hesaplanacak.

### 2.6 Gelir Tablosu (Income Statement / P&L)

- **Sayfa ekleme:** `/finance/income-statement`.
- **İçerik:** Dönem seçimi; gelir ve gider hesaplarının gruplu listesi; ara toplamlar (brüt kar, faaliyet karı, net kar); kar/zarar tek satırda.
- **Veri:** `/api/financial/income-statement` ile beslenecek.

### 2.7 Bilanço (Balance Sheet)

- **Sayfa ekleme:** `/finance/balance-sheet`.
- **İçerik:** Dönem (genelde bir tarih); varlıklar, borçlar, özkaynaklar gruplu; toplam varlık = toplam borç + özkaynak kontrolü.
- **Veri:** `/api/financial/balance-sheet` ile beslenecek.

### 2.8 Nakit Akışı (Cash Flow)

- **Sayfa ekleme:** `/finance/cash-flow`.
- **İçerik:** Dönem seçimi; işletme, yatırım, finansman faaliyetleri ayrımı; nakit giriş/çıkış ve net artış/azalış.
- **Veri:** `/api/financial/cash-flow` (ve varsa forecast) ile beslenecek.

### 2.9 Finansal Metrikler / Özet Dashboard

- **Sayfa:** `/finance/metrics` veya finans ana sayfada bir “Özet” widget’ı.
- **Gösterim:** Likidite (cari oran, asit test), kârlılık (brüt/faaliyet/net marj, ROE/ROA), verimlilik (alacak/devir, stok devir) vb.; mevcut `/api/financial/metrics` kullanılacak.
- **Dönem seçimi:** Karşılaştırma için iki dönem (opsiyonel).

### 2.10 Cari Hesaplar & Ödemeler Entegrasyonu

- **Finans merkezinden erişim:** Finans ana sayfada “Cari Hesaplar” ve “Ödemeler” kart/link; mevcut `/accounts` ve `/payments` sayfalarına yönlendirme.
- **Tutarlılık:** Cari bakiyelerin, yevmiye/defter-i kebir ile uyumu (tek kaynak: muhasebe hareketleri) için not/doc eklenebilir; gerekirse cari bakiye hesaplaması yevmiye verisine dayandırılır.

### 2.11 Fire / Maliyet & Maliyet Analizi

- **Mevcut sayfalar:** Fire analizi ve maliyet analizi sayfaları finans menüsünde kalacak; finans hub’da “Maliyet & Fire” altında toplanacak.
- **İyileştirme:** Raporlarda dönem filtresi, export (Excel/PDF) ve net başlık/açıklamalar.

### 2.12 Ortak UX & Teknik İyileştirmeler

- **Tarih/dönem bileşeni:** Tüm raporlarda aynı dönem seçici (başlangıç–bitiş veya ön tanımlı: bu ay, geçen ay, bu yıl).
- **Yükleme ve hata:** Liste/rapor sayfalarında PageLoader, EmptyState; hata durumunda toast veya inline mesaj.
- **Alert → Toast:** Finans sayfalarında kalan `alert()` kullanımları toast ile değiştirilecek (örn. Hesap Planı formu).
- **Yetki:** Finans menü ve API’lerde mevcut izin yapısı (withAuthAndPermission / sayfa izni) kullanılacak; hassas raporlar sadece yetkili kullanıcıya açılacak.

### 2.13 Sidebar Güncellemesi

- **Finans grubu:** Cari Hesaplar, Ödemeler, Yevmiye Fişleri, Yeni Fiş, Hesap Planı, Büyük Defter, Mizan, Gelir Tablosu, Bilanço, Nakit Akışı, Fire/Maliyet (ve Maliyet Analizi) şeklinde net ve tutarlı sıra.
- **Gerekirse alt menü:** “Raporlar” altında Mizan, Gelir Tablosu, Bilanço, Nakit Akışı toplanabilir.

---

## 3. UYGULAMA SIRASI ÖNERİSİ

1. **Faz 1 – Temel UX ve tutarlılık**  
   - Finans ana sayfayı kategorize hub yapısına çevirmek.  
   - Ortak dönem seçici ve KPI alanı (mümkünse mevcut API’lerle).  
   - alert → toast ve PageLoader/EmptyState kullanımı.

2. **Faz 2 – Rapor sayfaları**  
   - Mizan, Gelir Tablosu, Bilanço, Nakit Akışı sayfalarını eklemek; mevcut API’lere bağlamak.  
   - Finansal metrikler sayfası veya widget.

3. **Faz 3 – Hesap Planı ve Yevmiye**  
   - Hesap planında hiyerarşi, bakiye, filtre.  
   - Yevmiye fişinde borç/alacak validasyonu ve referans linkleri.  
   - Defter-i kebir’de hesap seçimi ve bakiye kolonu.

4. **Faz 4 – Sidebar ve son dokunuşlar**  
   - Sidebar menü sırası ve gruplama.  
   - Fire/Maliyet ve Cari/Ödemeler erişiminin finans hub ile uyumu.  
   - Gerekirse export ve dokümantasyon.

---

## 4. ÇIKTI

- Finans bölümü, profesyonel muhasebe yazılımlarına benzer şekilde:  
  - **Kayıtlar** (yevmiye, defter-i kebir),  
  - **Hesap planı**,  
  - **Cari & nakit** (cariler, ödemeler),  
  - **Raporlar** (mizan, gelir tablosu, bilanço, nakit akışı, metrikler),  
  - **Maliyet & fire**  
akışına göre gruplanmış ve rapor sayfaları eksiksiz olacak.  
- Tüm sayfalarda dönem seçimi, yükleme/boş/hata durumları ve bildirimler (toast) tutarlı olacak.

Bu plan onaylandıktan sonra uygulama adım adım yapılabilir.
