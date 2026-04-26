# Parola güvenliği analizi ve uygulama planı

## "parolacom" hakkında

- **parolacom** adında bir kütüphane, standart veya resmi site bulunamadı.
- Bu nedenle referans olarak **OWASP Password Storage Cheat Sheet** ve yaygın parola güvenliği uygulamaları kullanıldı.
- Aşağıdaki analiz ve değişiklikler OWASP önerileri ve mevcut proje koduna göre yapıldı.

---

## 1. OWASP özeti (anladıklarım)

### 1.1 Temel ilkeler

- **Hash, şifreleme değil:** Parolalar tek yönlü hash’lenmeli, geri çözülemez.
- **Tuz (salt):** Her parola için benzersiz, rastgele tuz; bcrypt/Argon2 bunu kendisi üretir.
- **Yavaş algoritma:** Ofline kaba kuvveti zorlaştırmak için maliyet (work factor) kullanılır.
- **Karakter sınırı:** OWASP, parola karakter setini kısıtlamamanızı önerir; sadece bcrypt için **72 bayt üst sınırı** belirtilir (sessiz kesilmeyi önlemek için).

### 1.2 Algoritma önceliği

1. **Argon2id** (tercih edilen)
2. **scrypt** (Argon2 yoksa)
3. **bcrypt** (eski sistemlerde; work factor en az 10)
4. **PBKDF2** (FIPS uyumu gerekiyorsa)

### 1.3 bcrypt kullanıyorsanız

- Work factor: **en az 10** (daha yüksek sunucu izin veriyorsa artırılabilir).
- **Maksimum giriş uzunluğu: 72 bayt.** Daha uzun parolalar çoğu implementasyonda sessizce kesilir; bu yüzden ya 72 bayt sınırı zorunlu tutulmalı ya da net hata verilmeli.
- Pre-hash (örn. SHA + bcrypt) özel dikkat gerektirir; OWASP’ta “password shucking” uyarısı var.

### 1.4 Diğer öneriler

- **Pepper (opsiyonel):** Tuzun yanında ayrı bir gizli (pepper) kullanılabilir; pepper değişince ilgili tüm kullanıcıların parolası sıfırlanmalı.
- **Girişte eski hash yükseltme:** Eski (zayıf) hash ile giriş başarılı olduğunda parola yeni algoritmayla tekrar hash’lenip veritabanı güncellenebilir.
- **Uluslararası karakterler:** Hash kütüphanesi geniş karakter aralığını kabul etmeli; bcrypt’te 72 **bayt** (UTF-8) sınırı akılda tutulmalı.

---

## 2. Projede mevcut durum

### 2.1 `lib/auth/password.ts`

- **bcrypt** (bcryptjs) kullanılıyor, **BCRYPT_ROUNDS = 10** (OWASP minimumu karşılanıyor).
- **Tuz:** bcrypt kendi tuzunu üretiyor, ek bir şey yok.
- **Eski hash:** SHA-256 ile saklanmış parolalar `isLegacySha256Hash` ile tespit edilip doğrulanıyor; girişte bcrypt’e yükseltme **yapılmıyor**.
- **72 bayt sınırı:** Kontrol yok; uzun parolalar bcrypt tarafından sessizce kesilebilir.

### 2.2 Validasyon (`lib/validation/schemas.ts`)

- **Ortak parola şeması:** En az 8 karakter, en az bir küçük harf, bir büyük harf, bir rakam (regex ile).
- **Maksimum uzunluk:** Tanımlı değil (iyi); ancak **72 bayt** sınırı yok (bcrypt ile tutarlılık için eklenmeli).

### 2.3 Kullanıldığı yerler

- **Kayıt:** `userSchemas.register` → `commonSchemas.password` kullanılıyor (güçlü kurallar var).
- **Giriş:** Sadece “dolu mu” kontrolü; hash doğrulama `verifyPassword` ile.
- **Şifre sıfırlama (reset-password):** Sadece `newPassword.length >= 8`; büyük/küçük harf ve rakam zorunluluğu **yok**.
- **Şifre değiştir (change-password):** `new_password` için sadece `min(6)` var; güçlü parola kuralları **yok**.

### 2.4 Eksikler (özet)

1. bcrypt **72 bayt** sınırı uygulanmıyor; sessiz kesilme riski var.
2. **Reset-password** ve **change-password** akışları, kayıt ile **aynı güçte** parola politikası kullanmıyor.
3. **Legacy SHA-256** hash’i girişte bcrypt’e **yükseltilmiyor**; eski zayıf hash veritabanında kalıyor.

---

## 3. Uygulama planı (yapılacaklar)

### 3.1 72 bayt üst sınırı

- **Nerede:** Validasyon şeması (`commonSchemas.password`) ve mümkünse `hashPassword` öncesi.
- **Ne:** UTF-8 bayt uzunluğu 72’den büyükse parolayı kabul etmeyip net hata mesajı vermek.
- **Sonuç:** Bcrypt ile uyum; kullanıcı uzun parola girdiğinde “Şifre en fazla 72 karakter (bayt) olabilir” gibi bir mesaj alır.

### 3.2 Reset-password politikası

- **Nerede:** `app/api/auth/reset-password/route.ts`
- **Ne:** `newPassword` için kayıt ile aynı kurallar (en az 8 karakter, en az bir küçük harf, bir büyük harf, bir rakam). İsteğe bağlı: 72 bayt sınırı.
- **Sonuç:** Sıfırlanan parolalar da güçlü parola politikasına uyar.

### 3.3 Change-password politikası

- **Nerede:** `app/api/users/[id]/change-password/route.ts`
- **Ne:** `new_password` için `commonSchemas.password` (veya aynı kuralları kullanan bir şema) ile doğrulama; minimum 8 karakter ve karmaşıklık kuralları.
- **Sonuç:** Kullanıcı şifre değiştirirken de kayıtla aynı güçte parola girer.

### 3.4 Legacy hash yükseltme (girişte)

- **Nerede:** `app/api/auth/login/route.ts` — giriş başarılı ve `isLegacySha256Hash(row.password_hash)` ise.
- **Ne:** Aynı düz metin parolayı `hashPassword(password)` ile bcrypt’e hash’leyip `users.password_hash` alanını güncellemek.
- **Durum:** Bu mantık projede **zaten mevcut** (login route içinde); ek bir değişiklik yapılmadı.

### 3.5 Dokümantasyon

- Bu dosya (`PAROLA_GUVENLIGI_ANALIZ.md`) analiz ve uygulama planını içeriyor.
- İleride **pepper** veya **Argon2id** geçişi yapılırsa, bu dokümana not düşülebilir.

---

## 4. Uygulama sonrası özet

Aşağıdaki değişiklikler yapıldığında:

- **72 bayt sınırı** ile bcrypt ile tam uyum ve sessiz kesilme engellenecek.
- **Reset-password** ve **change-password** kayıt ile aynı parola gücünü kullanacak.
- **Giriş sırasında** eski SHA-256 hash’ler otomatik olarak bcrypt’e yükseltilecek.

Pepper veya Argon2id bu aşamada uygulanmayacak; istenirse ileride ayrı bir görev olarak ele alınabilir.
