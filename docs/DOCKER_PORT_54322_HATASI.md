# Docker – Port 54322 "Access Forbidden" Hatası (Windows)

Hata metni:
```text
(HTTP code 500) server error - ports are not available: exposing port TCP 0.0.0.0:54322 -> 127.0.0.1:0: bind: An attempt was made to access a socket in a way forbidden by its access permissions.
```

Bu hata, **54322** portunun Windows tarafından kullanılamadığını veya başka bir süreç tarafından kapatıldığını gösterir. **Super ERP** projesinin `docker-compose.yml` dosyasında sadece **3000** portu kullanılır; 54322 genelde **Supabase**, **PostgreSQL** veya başka bir servis tarafından kullanılır.

---

## 1. Hangi proje/servis 54322 kullanıyor?

- Aynı makinede **Supabase** (veya başka bir stack) çalıştırıyorsanız, 54322’yi o projenin `docker-compose` / ayarları kullanıyor olabilir.
- Docker Desktop’ta **Containers** veya **Images** kısmında hangi konteynerin başlamaya çalıştığını kontrol edin; hata mesajı hangi compose/stack’ten geldiğini gösterebilir.

---

## 2. Portu kullanan uygulamayı farklı porta alın (önerilen)

54322 kullanan **docker-compose** veya ayar dosyasını bulun ve portu değiştirin.

**Örnek (docker-compose):**
```yaml
ports:
  - "54323:54322"   # Host 54323, container 54322
```
veya container’ın dinlediği portu da değiştirebiliyorsanız:
```yaml
ports:
  - "54323:5432"
```

**Supabase** kullanıyorsanız: Supabase’in kendi `.env` veya config’inde port eşlemesini (host port) 54322’den 54323 gibi boş bir porta değiştirin.

---

## 3. Windows’ta portu kim kullanıyor?

Yönetici PowerShell’de:

```powershell
netstat -ano | findstr :54322
```

Çıktıda **PID** (son sütun) görünür. İşlemi görmek için:

```powershell
tasklist /FI "PID eq <PID_NUMARASI>"
```

O işlemi kapatmak veya ilgili uygulamayı (Docker, WSL, Supabase vb.) kapatıp tekrar deneyin.

---

## 4. Windows “excluded port range” (ayrılmış port aralığı)

Windows bazen bir port aralığını (içinde 54322 de olabilir) ayırır; bu aralıktaki portlara bind yapılamaz.

Yönetici PowerShell’de:

```powershell
netsh interface ipv4 show excludedportrange protocol=tcp
```

Çıktıda 54322’nin içinde olduğu bir aralık varsa:

**Seçenek A:** 54322 kullanan servisi (Supabase vb.) **bu aralığa girmeyen** başka bir porta (örn. 54323, 54324) alın (en pratik çözüm).

**Seçenek B:** Hyper-V / WSL / Docker’ı yeniden başlatarak Windows’un yeni port aralıkları ataması yapmasını sağlayın (54322 bazen serbest kalır):

1. Docker Desktop’ı kapatın.
2. Yönetici PowerShell: `net stop winnat` ardından `net start winnat`.
3. Docker Desktop’ı tekrar açıp konteyneri tekrar başlatın.

---

## 5. Sadece Super ERP çalıştırıyorsanız

Bu projenin `docker-compose.yml` dosyasında **sadece 3000** portu açılır. 54322 hatası **bu projeden gelmiyorsa**:

- Aynı anda çalışan başka bir Docker projesi (Supabase, Postgres vb.) 54322’yi kullanıyordur.
- Docker Desktop’ta hangi konteynerin hata verdiğini bulun; o projenin compose/ayarında 54322’yi yukarıdaki gibi değiştirin veya o servisi durdurun.

---

## Özet

| Ne yapmalı? | Açıklama |
|-------------|----------|
| 54322’yi kullanan projeyi bulun | Docker Desktop / compose dosyaları |
| Portu değiştirin | Örn. 54322 → 54323 (compose veya .env) |
| Portu kim kullanıyor? | `netstat -ano \| findstr :54322` |
| Windows ayrılmış aralık | `netsh interface ipv4 show excludedportrange protocol=tcp`; gerekirse servisi farklı porta alın veya `winnat` restart deneyin |

Bu doküman Super ERP repo’sunda referans için tutulmuştur; 54322 hatası başka bir stack’ten geliyorsa o projenin port ayarını değiştirmeniz gerekir.
