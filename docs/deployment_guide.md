# Super ERP: Deployment Guide (Canlıya Alım Rehberi)

Super ERP projesini canlı ortama (Production) taşımak için aşağıdaki adımları izleyebilirsiniz.

## 🚀 Hızlı Başlangıç

### 1. Ortam Değişkenleri (.env)
Projenin ana dizininde bir `.env.local` veya sunucu ayarlarında aşağıdaki değişkenleri tanımlayın:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://sizin-erp-adresiniz.com
DATABASE_URL=file:./super_erp.db
JWT_SECRET=super_secret_key_buraya_yazilacak
```

### 2. Bağımlılıkların Kurulması
```bash
npm install --production
```

### 3. Build Süreci
```bash
npm run build
```

### 4. Çalıştırma
```bash
npm start
```

---

## 🐳 Docker Deployment
Eğer Docker kullanmak isterseniz basit bir Dockerfile hazırlığı:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## ☁️ Vercel / Netlify Deployment
Next.js projesi olduğu için Vercel üzerine tek tıkla kurulum yapılabilir:
1. GitHub deponuzu Vercel'e bağlayın.
2. Build Settings: `Next.js` olarak seçin.
3. Environment Variables kısmına `.env` içeriğini ekleyin.
4. `Deploy` butonuna basın.

---

## 💾 Veritabanı Yönetimi (SQLite)
ERP sistemi `super_erp.db` adında bir SQLite dosyası kullanır.
- **Yedekleme**: Ayarlar -> Bakım menüsünden veritabanını indirebilirsiniz.
- **Geri Yükleme**: Sunucudaki `.db` dosyasını yedeği ile değiştirip sunucuyu yeniden başlatmanız yeterlidir.

---

> [!WARNING]
> **Güvenlik Notu:** `JWT_SECRET` değerini asla varsayılan bırakmayın ve karmaşık bir metin ile değiştirin.

> [!TIP]
> **Performans:** Canlı ortamda `revalidate` sürelerini SWRProvider üzerinden ihtiyacınıza göre güncelleyebilirsiniz.
