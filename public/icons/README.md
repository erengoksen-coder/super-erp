# PWA ikonları – kesin çözüm (3 adım)

## 1️⃣ Gerçekten 192×192 ve 512×512 ikon üret

Photoshop / Figma / Canva / GIMP fark etmez.

- **icon-192.png** → tam **192 × 192** px  
- **icon-512.png** → tam **512 × 512** px  

- Format: **PNG**, **RGB**  
- Transparan olabilir  

**Hızlı kontrol (Windows):** Dosyaya sağ tık → Özellikler → Ayrıntılar → Genişlik / Yükseklik

## 2️⃣ Dosyaları bu klasöre koy

```
public/icons/icon-192.png
public/icons/icon-512.png
```

**Tarayıcıdan test et:**

- http://localhost:3000/icons/icon-192.png  
- http://localhost:3000/icons/icon-512.png  

- ❌ 404 olmamalı  
- ❌ Boş sayfa / HTML dönmemeli  
- ✅ Görsel açılmalı  

## 3️⃣ Manifest

`app/manifest.ts` zaten doğru; `sizes` değerleri dosya boyutlarıyla birebir aynı:

- `/icons/icon-192.png` → `sizes: "192x192"`
- `/icons/icon-512.png` → `sizes: "512x512"`

Bu iki dosyayı gerçek boyutlarda bu klasöre ekledikten sonra sunucuyu yenileyin; PWA ikon uyarıları kaybolur.
