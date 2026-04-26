# QR ile Giriş–Çıkış: Çalışan Neyi Okutacak? (Detaylı Akış)

Bu dokümanda, “Çalışan telefondan QR okutunca giriş/çıkış kaydı” derken **çalışanın tam olarak neyi, nasıl okutacağı** ve sistemin bunu nasıl giriş/çıkışa çevireceği adım adım anlatılıyor.

---

## 1. Genel Mantık

- **QR kod:** Sadece bir **link** (URL) taşır. Çalışan kendi telefonuyla bu QR’ı okuttuğunda telefon tarayıcıda o linki açar.
- **Açılan sayfa:** Sizin yazdığınız bir **web sayfası**dır. Bu sayfa:
  - Hangi **lokasyon**da (hangi QR’da) okutulduğunu URL’den bilir,
  - Çalışanın **kim** olduğunu oturum veya seçimle bilir,
  - “Giriş” veya “Çıkış” butonuna basınca **mevcut puantaj API’nize** istek atar; saat sunucudan alınır.

Yani çalışan “QR’ı okutuyor” = aslında **o lokasyona özel giriş/çıkış sayfasını açıyor**. Kayıt, o sayfadaki butonla (veya otomatik) yapılır; saat **sunucunun saati** ile yazılır, böylece sahte saat riski azalır.

---

## 2. QR Kodun İçinde Ne Olmalı? (Çalışan Neyi Okutacak?)

Çalışanın okuttuğu QR kod, **tek bir URL** içermelidir. Örnek:

```
https://sirket.com/hr/clock?location=ANA-GIRIS
```

veya lokasyon ID ile:

```
https://sirket.com/hr/clock?location=loc-123
```

- **Anlamı:** “Bu link, şu lokasyondaki (örn. ana giriş) giriş/çıkış sayfasına gitsin.”
- **Neyi okutacak?** İşyerinde **duvara / masaya / turnike yanına** yapıştırılmış **basılı QR kodu**. Bu QR’ı sizin sistemden üretip PDF çıktı alıp yazdırırsınız; her lokasyon için ayrı QR (farklı `location` parametreli URL).

Özet:

| Soru | Cevap |
|------|--------|
| Çalışan neye göre QR okutacak? | **Lokasyona özel** bir QR’a. Yani “Ana giriş”, “Şube A”, “Üretim girişi” gibi her noktada **o noktaya ait** bir QR asılı olacak. |
| QR’ın içinde ne var? | Sadece bir **URL**. Örn. `https://.../hr/clock?location=ANA-GIRIS`. |
| Bu URL nereden geliyor? | Sizin uygulama: “Lokasyon QR’ları” sayfasında her lokasyon için bu linki gösterir; “QR indir” deyince bu URL’i içeren QR resmi indirilir, o da yazdırılıp ilgili yere asılır. |

---

## 3. Telefondan QR Nasıl Okutulur? (Çalışan İçin Adım Adım)

Çalışan QR’ı **telefonun kamerası** veya **tarayıcı** ile okutur; ekstra uygulama zorunlu değildir (URL içeren QR’lar modern telefonlarda doğrudan link açar).

### 3.A. Hangi uygulama ile okutulur?

| Yöntem | Açıklama |
|--------|----------|
| **Kamera uygulaması** | iPhone’da “Kamera”, Android’de “Kamera” veya “Google Lens” ile QR’a doğrultup çerçeveleyince üstte çıkan bildirime/balona dokunun → link açılır. |
| **Tarayıcı** | Chrome / Safari’yi açıp adres çubuğunun yanındaki **QR ikonu**na basın (varsa), kamerayı QR’a doğrultun → sayfa açılır. |
| **Üçüncü parti QR uygulaması** | İsteğe bağlı: Herhangi bir “QR okuyucu” uygulaması da URL’i okur ve “Tarayıcıda aç” seçeneği sunar. |

**Öneri:** Çalışanlara “Telefonunuzun **kamera** uygulamasını açıp QR’a doğrultun; çıkan linke dokunun” demek yeterlidir. Çoğu güncel telefonda ek uygulama gerekmez.

### 3.B. Adım adım (çalışan ne yapar?)

1. **Telefonu eline al**  
   Kilidi aç, ana ekranda ol.

2. **Kamera uygulamasını aç**  
   - **iPhone:** Ana ekrandan “Kamera” (Camera) uygulamasını aç.  
   - **Android:** “Kamera” veya “Google” uygulamasını aç (bazı cihazlarda kamera doğrudan QR modunda).

3. **QR kodu kadraja al**  
   İşyerinde asılı QR’ı **telefonun arka kamerasıyla** kadraja al.  
   - QR, ekranda **net ve bütün** görünsün (çok uzak veya eğik tutma).  
   - Gerekirse birkaç saniye sabit tut; telefon QR’ı tanıyınca genelde **titreyerek** veya **bir çerçeve** ile gösterir.

4. **Çıkan bildirime / linke dokun**  
   - **iPhone:** QR tanınınca ekranın **üst kısmında** çıkan bildirime (örn. “sirket.com’u aç”) dokunun.  
   - **Android:** Alt veya üstte çıkan “Bildirim” veya “URL’i aç” benzeri seçeneğe dokunun.  
   Böylece **tarayıcı** açılır ve giriş/çıkış sayfası yüklenir (URL’de lokasyon bilgisi zaten vardır).

5. **Sayfa açıldıktan sonra**  
   - Girişe mi çıkışa mı geldiğine göre **“Giriş yap”** veya **“Çıkış yap”** butonuna bas.  
   - (Oturum yoksa veya liste varsa önce kendini seçip sonra butona bas.)

**Kamera ile QR açılmıyorsa:**  
- Tarayıcıyı (Chrome / Safari) aç → adres çubuğunun yanında **QR/kamera ikonu** varsa ona bas → kamerayı QR’a doğrult.  
- Veya “QR okuyucu” uygulaması indirip QR’ı okutup “Tarayıcıda aç” de.

### 3.C. Ekranda ne görünür? (Sırayla)

| Sıra | Ekranda olan |
|-----|----------------|
| 1 | Kamera görüntüsü; QR kare içinde / vurgulanır. |
| 2 | “ … adresini aç ” / “Open … ” benzeri bir bildirim veya balon. |
| 3 | Bildirime dokununca tarayıcı açılır, sayfa yüklenir (örn. “Puantaj – Giriş/Çıkış” başlığı). |
| 4 | “Hoş geldiniz” + “Giriş yap” veya “Çıkış yap” butonu (veya önce isim seçimi). |
| 5 | Butona basınca “Giriş kaydedildi, 09:02” veya “Çıkış kaydedildi, 18:05” mesajı. |

### 3.D. Dikkat edilecekler (çalışan için kısa uyarılar)

- **İnternet:** Telefonda **internet** (Wi‑Fi veya mobil veri) açık olmalı; sayfa sunucudan yüklenecek.
- **QR’ı kim okutmalı:** Sadece **kendin** okutmalısın; başkasının yerine okutmak yanlış puantaj kaydı oluşturur.
- **Aynı QR:** Giriş ve çıkış için **aynı** (veya şirketin gösterdiği) QR kullanılır; sayfa giriş mi çıkış mı yapılacağını kendisi gösterir.

Bu adımlar çalışanlara **kısa bir kullanım kılavuzu** veya **duvara asılacak tek sayfalık talimat** olarak da verilebilir.

---

## 4. Adım Adım: Çalışan Ne Yapar? (Sistem Akışı)

### 4.1 İşe gelince (giriş)

1. Çalışan **işyerindeki** (örn. ana giriş kapısındaki) **o lokasyona ait QR kodu** telefonuyla okutur.
2. Telefon tarayıcıda şu tarz bir sayfa açar:  
   `https://sirket.com/hr/clock?location=ANA-GIRIS`
3. Sayfa açılınca:
   - **Seçenek A (oturum varsa):** Giriş yapmış kullanıcı otomatik tanınır; sayfa “Hoş geldiniz, Ahmet. Giriş yap” butonunu gösterir. Çalışan “Giriş yap”a basar.
   - **Seçenek B (oturum yoksa):** Sayfa “Adınızı seçin” listesi gösterir (veya önce giriş yapılır); çalışan kendini seçip “Giriş yap”a basar.
4. “Giriş yap”a basılınca tarayıcı, **mevcut puantaj API’nize** istek atar:
   - `employee_id`: Bu çalışan
   - `date`: Bugün (sunucu tarihi)
   - `type`: `"in"`
   - (İsterseniz) `location` veya `workplace_id`: QR’daki lokasyon
5. Sunucu saati ile giriş kaydı yazılır; sayfa “Giriş kaydedildi, 09:02” gibi mesaj gösterir.

Yani **çalışan neye göre QR okutacak?** → **O an bulunduğu fiziksel noktadaki (kapı, şube, bölüm) o noktaya asılmış lokasyon QR’ına** göre. Her lokasyonun kendi QR’ı vardır.

### 4.2 İşten çıkarken (çıkış)

1. Çalışan yine **aynı (veya tanımlı) bir noktadaki** QR’ı okutur (aynı “Ana giriş” QR’ı olabilir).
2. Aynı sayfa açılır; bu sefer sistem “Bugün girişiniz var, çıkış yap” butonu gösterir.
3. “Çıkış yap”a basınca API’ye `type: "out"` gider; sunucu saati ile çıkış kaydı yazılır.

Özet: **Aynı QR hem giriş hem çıkış için** kullanılır; sayfa bugünkü kayda bakıp “giriş mi çıkış mı” butonunu gösterir.

---

## 5. Sistem Tarafında Neler Olmalı?

| Parça | Açıklama |
|-------|----------|
| **Lokasyon listesi** | Zaten var: İşyerleri/Lokasyonlar. Her biri için “Bu lokasyonun QR’ı” linki/butonu olmalı. |
| **QR’ın üretilmesi** | `location=LOKASYON_ID` veya `location=LOKASYON_KODU` içeren URL’in, QR koda çevrilmesi. Örn. bir kütüphane (qrcode.react veya benzeri) ile sayfada gösterilip “PNG indir” ile yazdırılacak QR elde edilir. |
| **/hr/clock sayfası** | Sadece mobil/tarayıcı için: URL’den `location` okunur; çalışan kimliği (oturum veya seçim) + “Giriş”/“Çıkış” butonu; butona basınca mevcut `POST /api/hr/attendance` çağrılır (employee_id, date, type, isteğe bağlı workplace_id). |
| **Puantaj API** | Zaten var. Sadece isteğe bağlı `workplace_id` (veya location) alanı eklenirse, “girişi nerede yaptı” raporlarda kullanılır. |

---

## 6. Programda QR’ı Nereden Alacaksınız?

- **Menü:** **İnsan Kaynakları** ana sayfasına gidin.
- **Kart:** **“Lokasyonlar”** kartında (İşyeri / Şube kayıtları) her lokasyonun satırında **“Puantaj QR”** sütunu vardır.
- **Buton:** İlgili lokasyonun yanındaki **“QR al”** butonuna tıklayın.
- **Modal:** Açılan pencerede:
  - O lokasyona özel **QR kodu** görünür.
  - **“QR görselini indir”** ile PNG dosyasını indirip yazdırabilirsiniz.
  - Link (URL) de gösterilir; bu link QR’ın okutulunca açılacak adrestir.
- **Kullanım:** İndirdiğiniz QR’ı ilgili lokasyona (kapı, turnike vb.) yapıştırın. Çalışanlar bu QR’ı okutunca puantaj (giriş/çıkış) sayfası açılır.

Özet: **İK → Lokasyonlar → ilgili lokasyon satırında “QR al” → Modal’dan QR’ı indirip o noktaya asın.**

---

## 7. Özet: Çalışan Neye Göre QR Okutacak?

- **Fiziksel konuma göre:** Giriş yaptığı **kapı / şube / bölüm**de asılı olan **o lokasyona özel** QR’ı okutacak.
- **QR’ın anlamı:** “Bu lokasyondan giriş/çıkış sayfasını aç” linki.
- **Kimlik:** Sayfa açıldıktan sonra ya oturumdan çalışan bilinir ya da listeden kendini seçer; “Giriş”/“Çıkış”a basınca o anki **sunucu saati** ile kayıt mevcut puantaj API’sine gider.

İstersen bir sonraki adımda bu akışa uygun **/hr/clock sayfası** ve **lokasyon QR indir** butonunu kod tarafında nasıl ekleyeceğimizi adım adım yazabilirim.
