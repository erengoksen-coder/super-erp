# Super ERP: Kullanıcı Kılavuzu (User Manual)

Super ERP'nin tüm modülleri aşağıda açıklanan şekilde kullanılabilir. Sistemin her sayfasında bulunan **Yardım** butonundan daha fazla bilgi alabilirsiniz.

---

## 📊 Dashboard (Yönetici Paneli)
Sistemin ana sayfasıdır. Canlı olarak tüm ERP operasyonlarını özetler.
- **KPI Takibi**: Bekleyen siparişler, aktif üretim emirleri ve hammadde stok durumunu görürsünüz.
- **Hızlı Erişim**: En çok kullanılan modüllere (Yeni Sipariş, Üretim Başlat) hızlıca ulaşmanızı sağlar.

---

## 📦 Sipariş Yönetimi (Siparişler)
Tüm müşteri siparişlerini yönettiğiniz merkezdir.
- **Sipariş Oluşturma**: Excel formatında veya manuel olarak sipariş girişi yapabilirsiniz.
- **Sipariş Takibi**: Siparişlerin üretim aşamasına geçip geçmediğini görebilirsiniz.
- **İptal**: Sadece üretime alınmamış siparişler iptal edilebilir.

---

## 🏭 Üretim Yönetimi (Üretim Bandı)
Üretim süreçlerinin kalbi burasıdır.
- **Üretim Başlat**: Bir siparişi seçip reçetesine (BOM) göre üretime alırsınız. Bu işlem hammadde stoklarını otomatik düşürür.
- **Reçete (BOM)**: Bir mamulün hangi hammaddelerden (ve fire oranlarıyla) oluştuğunu burada tanımlarsınız.
- **Üretim Panosu**: Üretim aşamalarını (İskelet, Kumaş, Paketleme vb.) canlı olarak takip edersiniz.

---

## 🛒 Envanter Kontrolü (Stoklar)
Tüm hammaddelerin ve mamullerin miktar takibi buradan yapılır.
- **Stok Giriş/Çıkış**: Manuel stok düzeltmeleri ve fatura bazlı girişleri yapabilirsiniz.
- **Kritik Seviyeler**: Stok miktarı belirlediğiniz "Kritik Seviye"ye ulaştığında sistem sizi otomatik uyarır.
- **Barkod Üretimi**: Üretilen her mamul için benzersiz bir Karekod (QR Code) oluşturulur.

---

## 💰 Finans & Muhasebe
Tüm para giriş-çıkışları ve cari hesap takibi modülüdür.
- **Cari Hesaplar**: Müşteri ve tedarikçilerinizin borç/alacak durumunu görebilirsiniz.
- **Defter Kayıtları**: Tüm finansal işlemlerin çift taraflı (Yevmiye) kayıtlarını tutar.
- **Bilanço & Mizan**: Dönem sonu finansal tablolarınızı otomatik oluşturur.

---

## ⚙️ Sistem Ayarları
Sistemi kendinize göre özelleştirin.
- **Genel Ayarlar**: Şirket adı, adresi ve vergi bilgilerini girin.
- **Marka & Tema**: Sistemin ana rengini ve kurumsal logonuzu anında güncelleyin.
- **API & Webhooks**: Dış sistem entegrasyonlarını (Webhooks) buradan yönetin.

---

> [!TIP]
> **Kısayol:** Arama kutusuna modül adını yazarak sistemde saniyeler içinde gezinebilirsiniz.

> [!WARNING]
> **Uyarı:** Üretim başlatıldığında hammadde stokları geri döndürülemez şekilde düşülür, lütfen miktarları kontrol edin.
