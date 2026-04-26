# Personel Devam Kontrol Sistemi (PDKS) ve Kolay İK’ya Göre İnsan Kaynakları Düzenleme Planı

Bu dokümanda **Personel Devam Kontrol Sistemi (PDKS)** ve **Kolay İK** referans alınarak mevcut İnsan Kaynakları modülünün nasıl uyarlanacağı detaylı biçimde tanımlanmıştır. Önce hedef özellikler, sonra mevcut durum ve yapılacaklar listelenir.

---

## 1. PDKS ve Kolay İK Referans Özeti

### 1.1 PDKS (Personel Devam Kontrol Sistemi) Nedir?

PDKS, çalışanların **giriş–çıkış saatlerini** otomatik veya yarı otomatik kaydeden, **devamsızlık**, **fazla mesai** ve **puantaj** verilerini üreten, bu verileri **bordro ve izin** süreçleriyle entegre eden yazılım/altyapıdır.

- **Amaç:** İşe geliş–gidiş ve çalışılan sürenin doğru ölçülmesi, raporlanması ve bordroya yansıtılması.
- **Tipik bileşenler:** Giriş–çıkış kaydı (cihaz veya yazılım), vardiya/mesai planı, puantaj hesaplama, devamsızlık/geç kalma tespiti, bordro entegrasyonu.

### 1.2 Kolay İK PDKS Özellikleri (Referans)

Kolay İK, PDKS’yi **izin ve puantajla tek uygulamada** sunar. Öne çıkan özellikler:

| Alan | Özellik | Açıklama |
|------|--------|----------|
| **Giriş–çıkış** | QR kod ile giriş/çıkış | Çalışan mobil cihazından QR okutarak giriş–çıkış yapar. |
| | Konum doğrulama (GPS) | Saha/uzaktan çalışan için giriş–çıkışta konum doğrulama. |
| | Anında puantaj | Tüm hareketler otomatik puantaja işlenir, elle veri girişi minimize. |
| **Otomasyon** | Geç giriş / erken çıkış | Otomatik tespit ve yönetici bildirimi. |
| | Bordroya aktarım | Puantaj verisi bordroya kesintisiz aktarılır. |
| **Görünürlük** | Canlı içeride/dışarıda listesi | Kim işte, kim çıkmış tek ekrandan görülür. |
| **Esneklik** | Yönetici müdahalesi | Unutulan/eksik giriş–çıkışlar için manuel düzeltme/ekleme. |
| **Altyapı** | Bulut, çok lokasyon | Tek merkezden tüm lokasyonlar; turnike entegrasyonu opsiyonel. |
| **Uyumluluk** | KVKK | Biyometrik veri toplamadan, yasal uyum. |

Kolay İK ayrıca **Personel (özlük)**, **Bordro**, **Vardiya**, **İzin/Fazla mesai**, **Aday takip**, **Performans**, **İK analitiği** modüllerini tek platformda toplar; PDKS bu ekosistemin merkezinde yer alır.

---

## 2. PDKS Odaklı İnsan Kaynakları Hedef Yapısı

Mevcut İK sayfası (çalışanlar, departmanlar, takımlar, lokasyonlar, KPI kartları) **temel veri altyapısını** sağlıyor. PDKS ve Kolay İK mantığına göre bu yapı şu bloklarla **tamamlansın**:

### 2.1 Zaman ve Devam (PDKS Çekirdeği)

| No | Özellik | Detay | Öncelik |
|----|--------|--------|---------|
| 1 | **Giriş–çıkış kaydı** | Çalışan–tarih–gün içi ilk giriş/son çıkış (ve istenirse ara giriş/çıkış). Lokasyon/cihaz bilgisi opsiyonel. | Yüksek |
| 2 | **Vardiya / mesai planı** | Çalışan veya rol için beklenen çalışma saatleri (örn. 09:00–18:00), haftalık çalışma günleri. | Yüksek |
| 3 | **Puantaj hesaplama** | Günlük: planlanan süre, fiili çalışılan süre, eksik süre, fazla mesai. Haftalık/aylık toplamlar. | Yüksek |
| 4 | **Geç giriş / erken çıkış tespiti** | Planlanan başlangıç/bitiş saatine göre otomatik işaretleme; istenirse bildirim. | Orta |
| 5 | **Devamsızlık** | Giriş kaydı olmayan günlerin listesi; izinli/raporlu günlerle eşleştirilerek “izinli devamsızlık” vs ayrımı. | Yüksek |
| 6 | **Yönetici müdahalesi** | Eksik/yanlış giriş–çıkış için manuel kayıt ekleme/düzeltme, mazeret onayı. | Orta |
| 7 | **Canlı durum (içeride/dışarıda)** | Seçilen tarih/saat için kimler işte, kimler çıkmış listesi (giriş–çıkış verisine göre). | Orta |

### 2.2 İzin ve Puantaj Entegrasyonu

| No | Özellik | Detay | Öncelik |
|----|--------|--------|---------|
| 8 | **İzin–puantaj eşleşmesi** | Onaylı izin günlerinde puantajda “izinli” sayılması; bordroda izin kesintisi. | Yüksek |
| 9 | **Fazla mesai** | Puantajdan fazla mesai saatlerinin hesaplanması; onay akışı ve bordroya yansıma. | Orta |
| 10 | **Bordroya otomatik aktarım** | Dönem sonu: çalışılan gün/saat, eksik gün, fazla mesai, izin günleri → bordro kalemleri. | Yüksek |

### 2.3 Raporlama ve Görünürlük

| No | Özellik | Detay | Öncelik |
|----|--------|--------|---------|
| 11 | **Günlük puantaj özeti** | Tarih seçimi; çalışan bazında giriş, çıkış, çalışılan süre, geç/erken, durum. | Yüksek |
| 12 | **Aylık puantaj raporu** | Çalışan/departman/lokasyon bazında toplam çalışılan gün/saat, fazla mesai, devamsızlık. | Yüksek |
| 13 | **PDKS dashboard KPI’ları** | Bugün iş başı yapan, şu an içeride olan, geç kalan, erken çıkan, devamsız sayıları. | Orta |

### 2.4 Giriş–Çıkış Toplama Yöntemleri (Uygulama Seviyesi)

Kolay İK’da QR + konum öne çıkıyor; bizde altyapı önce **manuel/web giriş–çıkış** ve **API** ile beslenebilir, ileride cihaz/QR eklenebilir:

| No | Yöntem | Açıklama |
|----|--------|----------|
| A | **Web / mobil buton** | Çalışan kendi panosundan “Giriş” / “Çıkış” ile kayıt. Lokasyon opsiyonel (GPS veya lokasyon seçimi). |
| B | **Yönetici/puantör girişi** | Eksik günler için tek seferde veya toplu giriş–çıkış saati girme. |
| C | **API** | Harici turnike/cihaz/yazılımdan giriş–çıkış event’lerinin API ile gönderilmesi. |
| D | **QR (ileride)** | Lokasyon bazlı QR ile giriş–çıkış (konum doğrulama ile). |

İlk aşamada **A** ve **B** yeterli; veritabanı ve raporlar **C/D** için aynı tabloları kullanır.

### 2.5 Lokasyon ve Organizasyon

Mevcut yapı zaten uyumlu:

- **Lokasyonlar:** İşyeri/şube; PDKS’de “nerede giriş–çıkış yapıldı” ile eşleştirilebilir, çok lokasyonlu rapor için kullanılır.
- **Departman / Takım:** Puantaj ve devamsızlık raporları departman/takım bazında filtrelenebilir.
- **Çalışan:** İşe başlama tarihi ve durum (aktif/ayrıldı/izinli) puantaj ve bordro için zaten kritik; mevcut çalışan master’ı kullanılır.

---

## 3. Mevcut Super-ERP İK Durumu (Kısa)

- **Var:** Çalışan (profil: departman, takım, lokasyon, unvan, işe başlama, brüt maaş), departman, takım, lokasyon; izin yönetimi (bakiye, talep, onay); bordro (dönem, brüt, kesinti, net, pusula); performans (hedef, değerlendirme); işe alım (ilan, aday); İK dashboard (aktif çalışan, departman, açık pozisyon, bekleyen izin).
- **Veritabanı:** `hr_attendance` tablosu (employee_id, date, check_in, check_out, total_minutes, overtime_minutes, status vb.) mevcut; kullanımı ve arayüzü genişletilebilir.
- **Eksik (PDKS açısından):**  
  - Vardiya/mesai planı (beklenen giriş/çıkış saati, haftalık çalışma günleri).  
  - Giriş–çıkış toplama arayüzü (web/mobil “giriş”/“çıkış” veya yönetici girişi).  
  - Puantaj hesaplama mantığı (planlanan vs fiili, geç/erken, fazla mesai).  
  - Günlük/aylık puantaj ve devamsızlık raporları.  
  - “İçeride/dışarıda” canlı liste.  
  - Bordro çalıştırılırken puantaj/izin verisinin otomatik kullanılması.

---

## 4. Yapılacaklar (PDKS’ye Göre İnsan Kaynakları Ayarı)

Aşağıdaki sıra, Kolay İK ve PDKS mantığına göre **önce detayların yazıldığı** plandır; uygulama aşaması ayrı yapılabilir.

### Faz A – Vardiya ve Mesai Planı

1. **Vardiya/mesai şablonu**  
   - Örn. “Standart (09:00–18:00)”, “Vardiya 1 (08:00–16:00)” vb.  
   - Her şablonda: başlangıç saati, bitiş saati, haftalık çalışılan günler (Pzt–Paz), mola süresi (dakika).  
   - Tablo: `hr_shift_templates` (ve gerekirse çalışan–vardiya ataması için `hr_employee_shift` veya profil alanı).

2. **Çalışan–vardiya ataması**  
   - Çalışan veya profil üzerinden “varsayılan vardiya” seçimi.  
   - Tarih aralığına göre farklı vardiya (opsiyonel, ileride).

### Faz B – Giriş–Çıkış ve Puantaj

3. **Giriş–çıkış kaydı**  
   - `hr_attendance` kullanılacak: `check_in`, `check_out`, `total_minutes`, `overtime_minutes`, `status`.  
   - API:  
     - POST giriş: tarih + saat (ve istenirse lokasyon_id, kaynak: web/turnike/api).  
     - POST çıkış: aynı gün için çıkış saati güncellemesi.  
   - Arayüz:  
     - Çalışan self-servis: “Giriş yap” / “Çıkış yap” butonları (o gün için tek giriş–tek çıkış basit model).  
     - Yönetici: Tarih + çalışan seçip giriş/çıkış saati girme veya düzeltme.

4. **Puantaj hesaplama (günlük)**  
   - Vardiyadan beklenen başlangıç/bitiş ve süre.  
   - Fiili: check_in/check_out’tan hesaplanan süre.  
   - Geç giriş: check_in > planlanan başlangıç (dakika farkı).  
   - Erken çıkış: check_out < planlanan bitiş.  
   - Fazla mesai: fiili süre − planlanan süre (sadece pozitif, istenirse günlük üst sınır).  
   - Bu alanlar `hr_attendance` içinde veya ayrı “puantaj özeti” tablosunda tutulabilir; raporlar buradan okunur.

5. **Devamsızlık**  
   - Seçilen tarih aralığında giriş kaydı olmayan günler.  
   - İzin/rapor tablolarıyla eşleştirilerek “izinli / raporlu / devamsız” ayrımı.  
   - Rapor: Çalışan bazında devamsız gün listesi (ve istenirse departman özeti).

### Faz C – Raporlar ve Dashboard

6. **Günlük puantaj özeti sayfası**  
   - Tarih seçimi.  
   - Liste: Çalışan, departman, giriş, çıkış, çalışılan süre, geç/erken, fazla mesai, durum (tam/eksik/izinli/devamsız).

7. **Aylık puantaj raporu**  
   - Ay + isteğe bağlı departman/lokasyon filtresi.  
   - Toplam çalışılan gün/saat, toplam fazla mesai, devamsız gün, izinli gün.

8. **PDKS dashboard KPI’ları**  
   - Bugün iş başı yapan sayısı.  
   - Şu an içeride (giriş var, çıkış yok) sayısı.  
   - Geç kalan (bugün, planlanan saatten sonra giriş) sayısı.  
   - İsteğe bağlı: erken çıkan, devamsız.  
   - Bu KPI’lar mevcut İK ana sayfa kartlarına eklenebilir veya “Devam / PDKS” alt sayfasında toplanabilir.

9. **Canlı “içeride/dışarıda” listesi**  
   - Seçilen gün (ve istenirse anlık saat) için: giriş yapmış ve henüz çıkış yapmamış çalışanlar = “içeride”; diğerleri (o gün çıkış yapmış veya giriş yok) = “dışarıda” veya “–”.

### Faz D – Bordro ve İzin Entegrasyonu

10. **Bordro hesaplamada puantaj kullanımı**  
    - Dönem (ay) için çalışan bazında: çalışılan gün/saat, eksik gün, fazla mesai saatleri.  
    - Brüt maaş yanında: eksik gün kesintisi, fazla mesai ücreti (oranlar sonradan parametreye alınabilir).  
    - Mevcut bordro kalemleri (brüt, SGK, vergi, damga) ile birlikte kullanılacak.

11. **İzin–puantaj**  
    - Onaylı izin günlerinde o gün için puantajda “izinli” işaretlemesi veya otomatik “tam gün izinli” kaydı; bordroda izin kesintisi (mevcut izin modülü ile bağlantı).

### Faz E – Self-Servis ve Bildirimler

12. **Çalışan giriş–çıkış self-servisi**  
    - Giriş/çıkış butonları; sadece kendi kayıtları görünsün (isteğe bağlı: kendi günlük/aylık özeti).

13. **Geç giriş / erken çıkış bildirimi**  
    - İsteğe bağlı: Bu durumlar oluştuğunda yönetici veya İK’ya bildirim (mevcut bildirim altyapısı kullanılabilir).

---

## 5. Özet Tablo: Neyin Nerede Olacağı

| Konu | Nerede / Nasıl |
|------|-----------------|
| Çalışan, departman, takım, lokasyon | Mevcut İK ana sayfa ve API’ler (aynı kalır). |
| Vardiya tanımı | Yeni: Vardiya şablonu + çalışan ataması (sayfa: İK → Vardiya veya Ayarlar). |
| Giriş–çıkış girişi | Yeni: “Devam / PDKS” sayfası (yönetici) + çalışan self-servis (buton veya ayrı sayfa). |
| Puantaj hesaplama | Arka planda vardiya + giriş–çıkış ile; günlük kayıt `hr_attendance` güncellenir veya türetilir. |
| Günlük/aylık rapor | Yeni: İK → Devam / Puantaj raporu (tarih/ay filtreli). |
| İçeride/dışarıda | Aynı “Devam” sayfasında veya dashboard’da blok olarak. |
| Bordro | Mevcut bordro hesaplamasına puantaj/izin girdisi eklenir (Faz D). |
| İzin | Mevcut izin modülü; puantajda “izinli” ve bordroda kesinti ile entegre (Faz D). |
| Dashboard KPI | Mevcut İK ana sayfadaki 4 karta PDKS KPI’ları eklenebilir veya “Devam” sekmesi. |

---

## 6. Sonuç

Bu doküman, **Personel Devam Kontrol Sistemi** ve **Kolay İK** referans alınarak **İnsan Kaynakları modülünün PDKS’ye göre nasıl ayarlanacağının detaylarını** içerir.  

Uygulama sırası önerisi: **Faz A (vardiya)** → **Faz B (giriş–çıkış ve puantaj)** → **Faz C (raporlar ve dashboard)** → **Faz D (bordro/izin entegrasyonu)** → **Faz E (self-servis ve bildirimler)**.  

Her faz, mevcut çalışan–departman–lokasyon yapısı ve `hr_attendance` tablosu üzerine inşa edilir; böylece İK sayfası PDKS ve Kolay İK ile uyumlu tek akışta devam ve bordro süreçlerini yönetecek hale getirilir.
