# CSRF ve SameSite Cookie Notları

Bu belge, form/state-değiştiren istekler ve çerez güvenliği ile ilgili mevcut durumu ve önerileri özetler.

---

## Mevcut Durum

- **Kimlik doğrulama:** JWT `auth-token` hem localStorage hem (uygulama yapılandırmasına göre) cookie ile taşınabilir. Middleware ve API tarafında token okunur.
- **Cookie ayarları:** Sunucu Set-Cookie verirken `SameSite` ve `Secure` (HTTPS’te) kullanılması önerilir. Değerler ortam değişkenleri veya auth modülünde yapılandırılabilir.
- **CSRF token:** Şu an form POST/PUT/DELETE isteklerinde ek bir CSRF token zorunlu değil; istekler aynı origin’den ve tarayıcı cookie’si ile yapılıyor.

---

## Öneriler

1. **SameSite**
   - Auth cookie’si için `SameSite=Lax` (veya sadece kendi sitenizde kullanıyorsanız `Strict`) kullanın. Böylece başka sitelerden gelen isteklerde cookie gönderilmez.
   - Cross-site form gönderimi (ör. harici bir siteden ERP’ye POST) kullanmıyorsanız Lax yeterlidir.

2. **Secure**
   - Production’da HTTPS kullanıyorsanız cookie’de `Secure` flag’ini set edin.

3. **CSRF token (isteğe bağlı)**
   - Ek güvenlik için: state-değiştiren (POST/PUT/DELETE) sayfalarda sunucunun ürettiği bir token’ı formda veya header’da gönderin; API’de doğrulayın.
   - Aynı origin, SameSite cookie ve CORS kısıtları ile birçok senaryoda CSRF riski zaten düşüktür; token eklemek ek katman sağlar.

4. **Yapılandırma yeri**
   - Cookie seçenekleri: auth ile ilgili route’larda (login, register, refresh) `Set-Cookie` cevabı veren yerde veya middleware’de ayarlanır. Örnek: `sameSite: 'lax', secure: process.env.NODE_ENV === 'production'`.

Bu doküman ileride cookie/CSRF kod değişiklikleri yapıldığında güncellenebilir.
