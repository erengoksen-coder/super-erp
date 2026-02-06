# İnsan Kaynakları Bölümü – Referans Özellikler ve Karşılaştırma

Bu dokümanda sektördeki **gelişmiş İK (HRIS/HCM) yazılımlarının** özellikleri özetlenmiş, mevcut super-erp İK modülü ile karşılaştırılmıştır. İyileştirme planı için referans olarak kullanılabilir.

---

## 1. Piyasadaki Lider İK Sistemleri

### Global (Enterprise)
- **Workday HCM** – Kurumsal HCM’de öne çıkan çözüm
- **SAP SuccessFactors** – Bulut İK, bordro, yetenek yönetimi
- **Dayforce (Ceridian)** – Tek veri seti üzerinde tam suite (bordro, iş gücü, yetenek)
- **UKG Pro** – Kurumsal odaklı
- **Oracle HCM Cloud** – Kapsamlı kurumsal platform
- **Infor** – Güçlü kurumsal yetenekler

### Türkiye odaklı
- **SAP SuccessFactors** (Türkiye bordro/yerelleştirme)
- **Plena**, **Hrweb**, **JobAnalytics EVA** – Yerel İK/bordro çözümleri

---

## 2. Gelişmiş İK Yazılımlarının Temel Özellikleri

### 2.1 Çekirdek İK (Core HR)
| Özellik | Açıklama |
|--------|----------|
| Çalışan master verisi | Ad, iletişim, TCKN, doğum tarihi, cinsiyet, medeni hal, adres |
| Organizasyon yapısı | Şirket → Departman → Takım hiyerarşisi, raporlama ilişkileri |
| Pozisyon / unvan yönetimi | Pozisyon şeması, unvan, derece, iş tanımı |
| İşyeri / lokasyon | Şube, ofis, adres, zaman dilimi, aktif/pasif |
| İşe giriş–çıkış yaşam döngüsü | İşe başlama, transfer, terfi, işten ayrılma, tarihçe |
| Belge yönetimi | Sözleşme, diploma, sertifika yükleme ve saklama |
| Self-servis | Çalışanın kendi bilgilerini görüntüleme/güncelleme (adres, acil iletişim vb.) |

### 2.2 İşe Alım (Recruitment / ATS)
| Özellik | Açıklama |
|--------|----------|
| İlan yönetimi | Açık pozisyon, bölüm, lokasyon, son başvuru |
| Aday havuzu | Başvuru formu, CV yükleme, durum (başvurdu, görüşme, teklif, red) |
| Mülakat planlama | Tarih, görüşmeci, değerlendirme notları |
| Teklif süreci | Teklif oluşturma, onay, aday kabul |
| İşe alım raporları | Kaynak bazlı, süre bazlı, maliyet |

### 2.3 Bordro (Payroll)
| Özellik | Açıklama |
|--------|----------|
| Maaş tanımları | Brüt maaş, sabit/değişken öğeler, ödeme periyodu |
| Vergi ve kesintiler | Gelir vergisi dilimleri, SGK işçi/işveren, damga vergisi |
| Puantaj entegrasyonu | Mesai, fazla mesai, eksik gün → bordroya otomatik yansıma |
| İzin kesintileri | Ücretsiz izin, hastalık izni günlerinin bordroya düşmesi |
| Bordro çıktıları | Bordro pusulası (PDF), banka ödeme dosyası, muhasebe fişi |
| Dönem kapanış ve raporlar | Aylık özet, vergi/SGK beyan özetleri |

### 2.4 Zaman ve Devamsızlık (Time & Attendance)
| Özellik | Açıklama |
|--------|----------|
| Vardiya / mesai planı | Haftalık çalışma programı, mesai türleri |
| Giriş–çıkış kaydı | Parmak izi, kart, yazılım ile giriş–çıkış |
| Fazla mesai onayı | Talep → onay → bordroya aktarım |
| Devamsızlık takibi | Geç kalma, erken çıkış, devamsız gün |
| Puantaj raporları | Günlük/haftalık/aylık özet |

### 2.5 İzin ve Devir Yönetimi (Leave Management)
| Özellik | Açıklama |
|--------|----------|
| İzin türleri | Yıllık izin, mazeret, hastalık, doğum, evlilik, vefat vb. |
| Hak hesaplama | Kıdeme göre yıllık izin hakkı, devir kuralları |
| İzin talebi | Çalışan talep → Yönetici onay → Takvimde blokaj |
| Takvim görünümü | Kim ne zaman izinde, ekip boşlukları |
| Bordro entegrasyonu | İzin günlerinin bordroya otomatik yansıması |

### 2.6 Performans Yönetimi (Performance Management)
| Özellik | Açıklama |
|--------|----------|
| Hedef yönetimi | OKR / KPI, dönemsel hedefler, hedef–çalışan eşlemesi |
| Değerlendirme dönemleri | Yıllık/yarı yıllık performans değerlendirme |
| Yetkinlik matrisi | Pozisyona göre yetkinlikler, seviye (1–5) |
| 360 derece geri bildirim | Eş, yönetici, ast değerlendirmesi (opsiyonel) |
| Değerlendirme formları | Özelleştirilebilir form, puanlama, yorum |
| Performans raporları | Ekip/şirket özeti, düşük/yüksek performans filtreleri |

### 2.7 Eğitim ve Gelişim (Learning & Development)
| Özellik | Açıklama |
|--------|----------|
| Eğitim kataloğu | Eğitim adı, türü (online/sınıf), süre, eğitmen |
| Planlama | Dönem, katılımcı listesi, lokasyon |
| Katılım ve tamamlama | Katıldı / tamamladı, sertifika |
| Beceri / yetenek eşlemesi | Eğitim → yetkinlik geliştirme |
| Zorunlu eğitimler | Oryantasyon, İSG, uyum – tamamlanma takibi |

### 2.8 Yan Haklar ve Ödüller (Benefits & Compensation)
| Özellik | Açıklama |
|--------|----------|
| Yan haklar | Sağlık sigortası, yemek, ulaşım, bonus türleri |
| Ücret bandları | Pozisyon/derece bazlı min–max maaş |
| Terfi / zam süreçleri | Öneri → onay → bordroya yansıma |
| Ödül / ceza | Disiplin, takdir, prim kayıtları (raporlama için) |

### 2.9 İş Sağlığı ve Güvenliği (İSG)
| Özellik | Açıklama |
|--------|----------|
| Risk değerlendirmesi | İşyeri/pozisyon riskleri |
| İSG eğitimleri | Zorunlu eğitim takibi, süre bitimi uyarıları |
| İş kazası / olay kayıtları | Tarih, tür, sonuç, raporlama |
| Sağlık muayeneleri | Periyodik muayene takvimi ve sonuçları |

### 2.10 Raporlama ve Analitik
| Özellik | Açıklama |
|--------|----------|
| Headcount raporları | Departman/lokasyon/pozisyona göre sayı |
| Devir oranı (turnover) | İşten ayrılma oranı, neden analizi |
| İşe alım metrikleri | Süre, maliyet, kaynak etkinliği |
| Bordro özet raporları | Toplam maliyet, vergi, SGK özeti |
| Özelleştirilebilir raporlar | Kullanıcı tanımlı filtre, export (Excel/PDF) |
| Gösterge panelleri (dashboard) | Ana İK KPI’ları tek ekranda |

### 2.11 Teknoloji ve Deneyim
| Özellik | Açıklama |
|--------|----------|
| Self-servis portali | Çalışan ve yönetici kendi işlemleri (izin, bordro görüntüleme, güncelleme) |
| Mobil uyum | Telefon/tablet ile izin, onay, puantaj |
| Bildirimler | Onay bekleyen talepler, hatırlatmalar, duyurular |
| KVKK / GDPR uyumu | Veri saklama, silme, erişim hakları |
| Entegrasyonlar | Muhasebe, ERP, zaman takip cihazları, e-posta |

---

## 3. Mevcut Super-ERP İK Modülü (Özet)

### Var olanlar
- **Çalışanlar**: Ad soyad, e-posta, telefon, durum (active vb.); ekleme/silme.
- **Departmanlar**: Ad, açıklama, manager_id; ekleme/silme.
- **Takımlar**: Ad, department_id, leader_id; ekleme/silme.
- **Lokasyonlar (İşyeri)**: Ad, adres, şehir, ülke, zaman dilimi, is_active; ekleme/silme.
- **API’ler**: `/api/hr/employees`, `/api/hr/departments`, `/api/hr/teams`, `/api/hr/workplaces` (CRUD).

### Eksik olanlar (lider sistemlere göre)
- Çalışan–departman/takım/lokasyon ilişkisi (atanan departman, pozisyon, işe giriş tarihi).
- İşe alım (ilan, aday, mülakat).
- Bordro (maaş, vergi, SGK, bordro çıktısı).
- Zaman / puantaj (mesai, fazla mesai, giriş–çıkış).
- İzin yönetimi (izin türü, hak, talep, onay).
- Performans yönetimi (hedef, değerlendirme, yetkinlik).
- Eğitim ve gelişim (eğitim kataloğu, katılım).
- Yan haklar, ücret bandı, terfi/zam.
- İSG (risk, eğitim, kaza kaydı).
- Self-servis, bildirimler, raporlama/dashboard.
- Çalışan detay sayfası, düzenleme, belge yükleme.

---

## 4. Öncelikli Geliştirme Önerileri (Kısa)

1. **Çekirdek İK güçlendirme**: Çalışana departman, takım, lokasyon, işe giriş tarihi, unvan atama; çalışan detay/düzenleme sayfası.
2. **İzin yönetimi**: İzin türleri, yıllık hak hesaplama, talep–onay akışı, takvim görünümü.
3. **Bordro temel**: Maaş tanımı, vergi/SGK kesinti hesaplama, bordro pusulası çıktısı (ileride puantaj/izin entegrasyonu).
4. **Performans**: Basit hedef + dönemsel değerlendirme ve raporlama.
5. **İşe alım (ATS)**: İlan + aday listesi + durum takibi (ileride mülakat/teklif).
6. **Raporlama ve dashboard**: Headcount, devir, basit İK KPI’ları.

Bu liste, “en iyi İK uygulaması” referanslarına göre hazırlanmıştır; geliştirme roadmap’i için `docs/` altında ayrı bir plan dokümanıyla detaylandırılabilir.
