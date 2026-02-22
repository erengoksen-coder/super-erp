# Çoklu Dil (i18n) Hazırlığı

Uygulama dil desteği `lib/i18n.tsx` ve `usePreferencesStore` (dil seçimi) ile sağlanır. Varsayılan dil Türkçe’dir.

---

## Mevcut Yapı

- **I18nProvider:** Root layout’ta sarar; `language` (tr | en) ve `t(key, params?)` fonksiyonu sağlar.
- **Çeviri yükleme:** `/locales/tr.json` ve `/locales/en.json` (public klasöründe) dinamik yüklenir. Dosya yoksa boş obje kullanılır.
- **Kullanım:** Bileşenlerde `useI18n()` ile `t('common.save')` gibi key’ler kullanılır. Key yoksa key’in kendisi döner (Türkçe metin yazılana kadar key gösterilebilir).

---

## Key’lere Geçiş Önerisi

1. **Ortak metinler:** `public/locales/tr.json` içinde `common.save`, `common.cancel`, `common.delete` vb. tanımlanabilir.
2. **Sayfa bazlı:** Her modül için `orders.title`, `invoices.new` gibi key’ler eklenebilir.
3. **Parametreli metin:** `t('messages.welcome', { name: user.name })` → "Hoş geldin, {name}" şablonu kullanılabilir.

Yeni ekranlarda mümkünse doğrudan `t('...')` kullanılması; mevcut sabit Türkçe metinlerin zamanla key’e taşınması önerilir. İleride İngilizce (veya başka dil) eklemek için sadece `public/locales/en.json` doldurulur.
