# İleri ERP Programları ile Super-ERP Karşılaştırması ve Eksiklikler

Bu belge, **SAP**, **Oracle Cloud ERP**, **Microsoft Dynamics 365**, **NetSuite**, **Odoo** gibi ileri ERP çözümlerinin tipik özellikleri ile **super-erp** projesini karşılaştırır ve super-erp’deki **eksiklikleri** listeler. Amaç, yol haritası ve önceliklendirme için referans sağlamaktır.

---

## 1. Karşılaştırma özeti

| Alan | İleri ERP’lerde tipik | Super-ERP’de durum |
|------|------------------------|--------------------|
| **Çoklu para birimi** | Evet; kur, otomatik çevrim, raporlama para birimi | Kısmen (şema alanları var; tek para birimi TRY, kur/çevrim yok) |
| **Çoklu şirket / tüzel kişilik** | Evet; şirketler arası hareket, konsolidasyon | Kısmen (company_id/branch_id var; tam çoklu şirket UI ve konsolidasyon yok) |
| **Onay / iş akışı (workflow)** | Satın alma, ödeme, izin, sipariş onayları; kullanıcı tanımlı | Altyapı var (workflows tablosu, engine); UI ve sipariş/fiş onay süreçleri sınırlı |
| **Denetim izi (audit trail)** | Tüm kritik tablolarda create/update/delete, raporlama | Var (audit_logs, logAudit); tüm modüllerde yaygın kullanım yok |
| **Proje yönetimi** | Görev, kaynak, Gantt, maliyet, fatura etme | Yok |
| **Doküman yönetimi** | Evrak, versiyon, kategoriler, ilişkilendirme | Yok |
| **Sözleşme yönetimi** | Sözleşme kaydı, bitiş uyarıları, yenileme | Yok |
| **Bütçe yönetimi** | Bütçe girişi, bütçe–gerçek sapma raporu, bütçe onayı | Backend var (budgets, budget-variance API); bütçe girişi UI yok |
| **CRM (tam)** | Fırsat, aşama, satış tahmini, pipeline, e-posta entegrasyonu | Kısmen (cari/müşteri listesi; fırsat/pipeline/aktivite yok) |
| **E-ticaret / pazaryeri** | Trendyol, N11, Hepsiburada vb. sipariş/sevkiyat entegrasyonu | Bayi portalı var; pazaryeri API entegrasyonu yok |
| **E-fatura / e-arşiv** | GİB entegrasyonu, otomatik gönderim, arşivleme | Stub/entegratör altyapısı var; tam entegrasyon yok |
| **İş zekası / raporlama** | Özelleştirilebilir dashboard, ad-hoc raporlar, drill-down | Sabit raporlar ve dashboard; özelleştirilebilir widget/drill-down yok |
| **Yerelleştirme** | Çoklu dil, bölgesel vergi/hesap planı | Tek dil (TR); vergi/hesap planı TR odaklı |
| **Mobil uygulama** | Native/hybrid uygulama, offline | Web mobil sayfalar (workstation, material-stock); ayrı native uygulama yok |
| **Genel API / entegrasyon** | REST/SOAP, webhook, marketplace connector | REST API, webhook, API katalog sayfası var |

---

## 2. Modül bazlı eksiklikler

### 2.1 Finans ve muhasebe

- **Çoklu para birimi:** Fatura, sipariş, cari, yevmiye için kayıt para birimi ve raporlama para birimi; günlük kur; otomatik çevrim. *(Super-erp: TRY sabit; schema’da currency alanları var, kullanım sınırlı.)*
- **Bütçe girişi ve yönetimi:** Bütçe kalemleri, dönem bazlı giriş, onay akışı. *(Super-erp: budget-variance API ve budgets tablosu var; kullanıcı arayüzü ile bütçe girişi yok.)*
- **Vergi yönetimi:** Çoklu KDV oranı, vergi raporları, beyanname hazırlık verisi. *(Super-erp: temel vergi alanları var; vergi raporları ve beyan hazırlığı sınırlı.)*
- **Banka mutabakatı:** Banka ekstresi içe aktarma, otomatik eşleştirme. *(Super-erp: yok.)*
- **Çoklu şirket konsolidasyonu:** Şirketler arası elimine edilen hareketler, konsolide raporlar. *(Super-erp: company_id var; konsolidasyon raporu yok.)*

### 2.2 Satış ve CRM

- **CRM fırsat ve pipeline:** Fırsat kaydı, aşamalar, tahmini tutar, kapanış tarihi, satış pipeline raporu. *(Super-erp: CRM sayfası cari/müşteri odaklı; fırsat ve pipeline yok.)*
- **Aktivite ve görev:** Müşteri/cari bazlı görev, arama, toplantı, e-posta kaydı. *(Super-erp: yok.)*
- **Satış tahmini:** Fırsat veya tarih bazlı satış tahmini raporu. *(Super-erp: yok.)*
- **Teklif / sözleşme süreci:** Teklif oluşturma, müşteri onayı, sözleşmeye dönüşüm. *(Super-erp: sipariş var; teklif ve sözleşme modülü yok.)*

### 2.3 Satın alma ve tedarik

- **Tedarikçi (supplier) portalı:** Tedarikçinin siparişleri görüp onaylaması, teslimat güncellemesi. *(Super-erp: yok; bayi portalı benzeri yapı sadece satış tarafında.)*
- **Üçlü eşleştirme:** Sipariş – irsaliye – fatura eşleştirme, otomatik onay kuralları. *(Super-erp: yok.)*
- **RFQ / ihale:** Talebe göre teklif toplama, karşılaştırma. *(Super-erp: yok.)*

### 2.4 Üretim (mevcut güçlü; ek fikirler)

- **Kalite yönetimi (QM):** Kalite kontrol iş istasyonu, red/kabul, ölçüm kayıtları. *(Super-erp: yok.)*
- **Bakım yönetimi (PM):** Makine/ekipman kaydı, bakım planı, arıza kaydı. *(Super-erp: yok.)*
- **Üretim maliyet dağıtımı:** İş merkezi maliyet, genel gider dağıtımı, standart maliyet revizyonu. *(Super-erp: maliyet ve fire analizi var; tam maliyet dağıtımı sınırlı.)*

### 2.5 İnsan kaynakları

- **İzin onay akışı:** Talep → yönetici onayı → bordroya yansıma. *(Super-erp: izin talepleri var; tam onay akışı ve bordro entegrasyonu net değil.)*
- **Eğitim ve yetkinlik:** Eğitim kaydı, sertifika, yetkinlik matrisi. *(Super-erp: yok.)*
- **Ücret yapılandırması:** Mağaza, bölge, pozisyon bazlı ücret matrisi. *(Super-erp: bordro ve maaş alanları var; gelişmiş ücret yapılandırması yok.)*

### 2.6 Proje yönetimi

- **Proje modülü:** Proje tanımı, görevler, Gantt, kaynak atama, proje maliyeti, fatura etme. *(Super-erp: tamamen yok.)*

### 2.7 Doküman ve sözleşme

- **Doküman yönetimi:** Kategori, versiyon, cari/sipariş/fatura ile ilişkilendirme, arama. *(Super-erp: yok; Parola öneri dokümanında tarif edildi.)*
- **Sözleşme yönetimi:** Sözleşme kaydı, cari ile ilişki, bitiş tarihi, “X gün kala” uyarısı. *(Super-erp: yok; Parola öneri dokümanında tarif edildi.)*

### 2.8 E-ticaret ve entegrasyonlar

- **Pazaryeri API:** Trendyol, N11, Hepsiburada vb. sipariş çekme, stok/sevkiyat güncelleme. *(Super-erp: yok; entegrasyonlar sayfası var, içerik “yakında” ağırlıklı.)*
- **Kargo entegrasyonu:** Barkod/teslimat numarası otomatik güncelleme. *(Super-erp: yok.)*
- **Ödeme sağlayıcı:** İyzico, PayTR vb. ödeme sayfası / 3D Secure. *(Super-erp: ödemeler modülü var; sağlayıcı entegrasyonu yok.)*

### 2.9 Raporlama ve iş zekası

- **Özelleştirilebilir dashboard:** Kullanıcıya özel widget ekleme/çıkarma, filtre kaydetme. *(Super-erp: sabit dashboard ve kısayollar.)*
- **Ad-hoc rapor:** Sorgu oluşturucu, alan seçimi, Excel/PDF. *(Super-erp: sabit rapor sayfaları; rapor tasarlayıcı yok.)*
- **Drill-down:** Özet rapordan detay sayfaya tek tıkla geçiş. *(Super-erp: sınırlı.)*

### 2.10 Altyapı ve güvenlik

- **Denetim izi kapsamı:** Tüm kritik tablolarda create/update/delete için logAudit kullanımı. *(Super-erp: bazı API’lerde var; her modülde tutarlı değil.)*
- **Onay (approval) altyapısı:** Sipariş, satın alma, ödeme, izin için ortak onay motoru ve UI. *(Super-erp: workflow engine var; sipariş/fiş onay ekranları sınırlı.)*
- **Çoklu dil:** Arayüz ve raporlarda dil seçimi. *(Super-erp: yok.)*
- **SSO / kurumsal kimlik:** SAML, OAuth2, Active Directory. *(Super-erp: yok.)*

---

## 3. Öncelikli eksiklik listesi (kısa)

1. **Doküman yönetimi** – Evrak yükleme, kategori, ilişkilendirme.  
2. **Sözleşme yönetimi** – Cari ile ilişki, bitiş tarihi, uyarı.  
3. **Bütçe girişi UI** – Mevcut budget-variance API’yi besleyecek bütçe kalemleri ve dönem girişi.  
4. **CRM fırsat ve pipeline** – Fırsat kaydı, aşamalar, pipeline raporu.  
5. **Çoklu para birimi** – Kur tablosu, fatura/sipariş para birimi, raporlama para birimi.  
6. **E-ticaret (bir pazaryeri)** – Sipariş çekme, stok/sevkiyat güncelleme.  
7. **Onay akışları UI** – Sipariş, satın alma, ödeme için onay adımları ve ekranları.  
8. **Proje yönetimi** – Temel proje/görev/Gantt (uzun vadeli).  
9. **Denetim izi yaygınlaştırma** – Tüm kritik create/update/delete’te logAudit.  
10. **Özelleştirilebilir dashboard** – Widget seçimi, filtre kaydetme (orta/uzun vadeli).

---

## 4. Referanslar

- Parola karşılaştırması ve öneriler: `docs/PAROLA_COM_KARSILASTIRMA_VE_ONERILER.md`
- Yapılabilecekler listesi: `docs/BASKA_YAPILABILECEKLER.md`
- İleri ERP’ler: SAP S/4HANA, Oracle Fusion Cloud ERP, Microsoft Dynamics 365 Finance & Operations, NetSuite, Odoo Enterprise (modül listeleri ve yaygın özellikler).

Bu belge, ileri ERP’lerle fonksiyon bazlı gap analizi sunar; uygulama sırası ve detaylar proje önceliklerine göre belirlenebilir.
