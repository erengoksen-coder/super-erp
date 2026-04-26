# Gmail ile SMTP Ayarlama

Uygulamanın sipariş onayı, sevkiyat bildirimi ve şifre sıfırlama e-postalarını Gmail üzerinden göndermesi için aşağıdaki adımları uygulayın.

## 1. Google Hesabında 2 Adımlı Doğrulama

1. [Google Hesap Güvenliği](https://myaccount.google.com/security) sayfasına gidin.
2. **2 Adımlı Doğrulama** bölümüne tıklayın.
3. Açıklamaları takip ederek 2 adımlı doğrulamayı **açın** (telefon ile doğrulama gerekir).

## 2. Uygulama Şifresi Oluşturma

Normal Gmail şifreniz uygulama tarafından kullanılamaz; **Uygulama şifresi** oluşturmanız gerekir.

1. [Uygulama şifreleri](https://myaccount.google.com/apppasswords) sayfasına gidin.  
   (Doğrudan açılmazsa: Google Hesap → Güvenlik → 2 Adımlı Doğrulama → Uygulama şifreleri.)
2. **Uygulama seçin** kısmında "Posta" veya "Diğer (Özel ad)" seçin; özel ad olarak örn. "Süper ERP" yazın.
3. **Oluştur** deyin.
4. Ekranda **16 karakterlik şifre** (örn. `abcd efgh ijkl mnop`) görünecek. Bu şifreyi kopyalayın; boşlukları kaldırarak tek parça kullanabilirsiniz: `abcdefghijklmnop`.

Bu şifreyi `.env` dosyasında `SMTP_PASS` olarak kullanacaksınız.

## 3. .env Dosyasını Düzenleme

Proje kökündeki `.env` veya `.env.local` dosyasında aşağıdaki satırları ekleyin veya güncelleyin:

```env
# E-posta bildirimleri açık
ENABLE_EMAIL_NOTIFICATIONS=true

# Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=sizin-gmail-adresiniz@gmail.com
SMTP_PASS=abcdefghijklmnop
SMTP_FROM=sizin-gmail-adresiniz@gmail.com
```

- **SMTP_USER:** Gmail adresiniz (örn. `firma@gmail.com`).
- **SMTP_PASS:** Az önce oluşturduğunuz 16 karakterlik uygulama şifresi (aralarında boşluk olmadan).
- **SMTP_FROM:** Genelde aynı Gmail adresi; farklı bir “gönderen” kullanmak isterseniz Gmail hesabınızda bu adrese izin vermeniz gerekir.

## 4. Uygulamayı Yeniden Başlatma

Değişikliklerin geçerli olması için sunucuyu yeniden başlatın:

```bash
# Geliştirme
npm run dev:simple

# veya production
npm run start
```

## 5. Test

- Sipariş oluşturduğunuzda (cari e-posta tanımlıysa) sipariş onayı e-postası,
- Sevkiyat onaylandığında sevkiyat bildirimi,
- Şifre sıfırlama talebinde şifre sıfırlama linki

Gmail üzerinden gönderilir. Gelen kutusu ve gerekiyorsa spam klasörünü kontrol edin.

## Sorun Giderme

| Sorun | Çözüm |
|--------|--------|
| "Bad credentials" / 535 hatası | Uygulama şifresini kullandığınızdan emin olun; normal Gmail şifresi çalışmaz. |
| 2 Adımlı Doğrulama kapalı | Uygulama şifresi oluşturabilmek için 2 adımlı doğrulama açık olmalı. |
| E-posta gitmiyor | `.env` değişkenlerini kontrol edin; sunucuyu yeniden başlattıktan sonra tekrar deneyin. |
| "Less secure app" uyarısı | Gmail artık bu yöntemi desteklemiyor; mutlaka **Uygulama şifresi** kullanın. |

---

**Özet:** 2 Adımlı Doğrulama aç → Uygulama şifresi oluştur → `.env` içine Gmail SMTP değerlerini yaz → sunucuyu yeniden başlat.
