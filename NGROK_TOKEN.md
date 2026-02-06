# ngrok Authtoken Alma ve Ayarlama

## Adım 1: ngrok Hesabı Oluşturma
1. https://ngrok.com/ adresine gidin
2. "Sign up" butonuna tıklayın
3. Ücretsiz hesap oluşturun (e-posta ile kayıt olabilirsiniz)

## Adım 2: Authtoken Alma
1. Giriş yaptıktan sonra şu adrese gidin:
   https://dashboard.ngrok.com/get-started/your-authtoken

2. **TOKEN YAPIŞTIRMA ALANI (dosya):**
   - Proje klasöründe **`NGROK_TOKEN_YAPISTIR.txt`** dosyasını açın.
   - İçinde `BURAYA_TOKEN_YAPISTIR` yazan satırı **silin**.
   - Dashboard'dan kopyaladığınız token'ı **oraya yapıştırıp** dosyayı kaydedin.
   - Sonra `npm run baslat` çalıştırın; script token'ı bu dosyadan okuyacak.

3. Veya:
   - Dashboard'a gidin
   - Sol menüden "Your Authtoken" seçin
   - Token'ı kopyalayın (yukarıdaki "TOKEN YAPIŞTIRMA ALANI"na veya PowerShell'e yapıştıracaksınız)

## Adım 3: Token'ı Ayarlama

**ÖNEMLİ:** `BURAYA_YAPISTIR` veya `YOUR_TOKEN` yazmayın. Sadece dashboard'dan **Copy** ile kopyaladığınız token'ı yapıştırın.

**Yöntem A – Tek komut (önerilen):**
```powershell
npm run baslat
```
Script token isteyecek; dashboard'dan kopyalayıp yapıştırın. Sonra sunucu ve ngrok otomatik açılır.

**Yöntem B – Sadece token kaydetmek:**
1. PowerShell'de yazın: `ngrok config add-authtoken ` (sonunda boşluk, Enter'a basmayın)
2. Dashboard'dan token'ı kopyalayıp **sağ tık → Yapıştır** ile yapıştırın
3. Enter'a basın

## Adım 4: Test Etme

Token ayarlandıktan sonra test edin:

```powershell
ngrok http 3000
```

Eğer hata vermezse, başarılı demektir!

## Not
- Token sadece bir kez ayarlanır
- Token'ı kimseyle paylaşmayın
- Token'ı unutursanız, dashboard'dan tekrar alabilirsiniz


