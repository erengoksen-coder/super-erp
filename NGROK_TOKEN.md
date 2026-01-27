# ngrok Authtoken Alma ve Ayarlama

## Adım 1: ngrok Hesabı Oluşturma
1. https://ngrok.com/ adresine gidin
2. "Sign up" butonuna tıklayın
3. Ücretsiz hesap oluşturun (e-posta ile kayıt olabilirsiniz)

## Adım 2: Authtoken Alma
1. Giriş yaptıktan sonra şu adrese gidin:
   https://dashboard.ngrok.com/get-started/your-authtoken

2. Veya:
   - Dashboard'a gidin
   - Sol menüden "Your Authtoken" seçin
   - Token'ı kopyalayın (örnek: `2abc123def456ghi789jkl012mno345pqr678`)

## Adım 3: Token'ı Ayarlama

PowerShell'de şu komutu çalıştırın (YOUR_TOKEN yerine kopyaladığınız token'ı yapıştırın):

```powershell
ngrok config add-authtoken YOUR_TOKEN
```

### Örnek:
```powershell
ngrok config add-authtoken 2abc123def456ghi789jkl012mno345pqr678
```

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


