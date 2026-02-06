# Chrome/Edge SSL Hatası Çözümü

## Sorun
`ERR_SSL_VERSION_OR_CIPHER_MISMATCH` hatası alıyorsunuz.

## Çözüm 1: Chrome Flag (Önerilen)

1. Chrome'da şu adrese gidin:
   ```
   chrome://flags/#allow-insecure-localhost
   ```

2. "Allow invalid certificates for resources loaded from localhost" seçeneğini **"Enabled"** yapın

3. Chrome'u tamamen kapatıp tekrar açın

4. `https://localhost:3443` adresini tekrar deneyin

## Çözüm 2: Edge Flag

1. Edge'de şu adrese gidin:
   ```
   edge://flags/#allow-insecure-localhost
   ```

2. "Allow invalid certificates for resources loaded from localhost" seçeneğini **"Enabled"** yapın

3. Edge'i tamamen kapatıp tekrar açın

4. `https://localhost:3443` adresini tekrar deneyin

## Çözüm 3: Sertifikayı Manuel Olarak Güvenilir Yapma

1. `https://localhost:3443` adresine gidin
2. "Gelişmiş" butonuna tıklayın
3. "localhost'a devam et (güvenli değil)" seçeneğini seçin
4. Bazı tarayıcılarda bu yeterli olmayabilir

## Not
Bu ayarlar sadece localhost için geçerlidir ve güvenlik riski oluşturmaz.


