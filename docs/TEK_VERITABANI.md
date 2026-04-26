# Tek Veritabanı: Localhost + Tünel Aynı Veriyi Görsün

Cursor tarayıcısı (localhost) ile normal tarayıcı (Cloudflare tüneli) **aynı bakiyeyi ve hareketleri** görmesi için ikisi de **aynı çalışan uygulamaya** bağlanmalı.

## Önerilen: Tek sunucu, tünel ona yönlensin

1. **Uygulamayı bir kez çalıştırın**
   ```bash
   npm run dev
   ```
   Bu tek process `data/erp.db` dosyasını kullanır.

2. **Tüneli bu sunucuya yönlendirin**
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   (veya ngrok: `ngrok http 3000`)

3. **İki adresi de kullanın**
   - Cursor içi tarayıcı: `http://localhost:3000`
   - Dış tarayıcı: Tünelin verdiği adres (örn. `https://xxx.trycloudflare.com`)

İkisi de **aynı process**e ve **aynı `data/erp.db`** dosyasına gider. Birinde girilen borç/alacak diğerinde de görünür (sayfayı yenileyin veya sekmeye dönünce otomatik yenilenir).

## Neden iki farklı veri görünür?

- **İki ayrı `npm run dev`** çalışıyorsa (farklı port veya farklı bilgisayar): Her process kendi `data/erp.db` dosyasını kullanır veya farklı klasörde çalışıyorsa farklı dosyalar oluşur.
- **Çözüm:** Sadece tek bir `npm run dev` çalışsın; tünel doğrudan `http://localhost:3000` (veya o process’in portu) adresine yönlensin.

## İki process aynı DB dosyasını kullanacaksa (önerilmez)

Aynı makinede iki process çalıştırıyorsanız ve ikisinin de aynı SQLite dosyasını kullanmasını istiyorsanız, **mutlak yol** verin:

**.env** (veya .env.local):
```env
DATABASE_PATH=C:/super-erp/data/erp.db
```
(Linux/Mac: `DATABASE_PATH=/home/kullanici/super-erp/data/erp.db`)

Böylece her iki process de aynı dosyayı okur/yazar. Yine de tek sunucu + tünel kullanmak daha güvenli ve sade.
