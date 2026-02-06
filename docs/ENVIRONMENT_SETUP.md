# 🔧 Environment Variables Rehberi

## 📋 Gerekli Environment Variables

Projeyi çalıştırmak için `.env.local` dosyası oluşturun:

```bash
# Proje kök dizininde
touch .env.local
```

## 📝 .env.local Örneği

```env
# ============================================
# Supabase Configuration (Opsiyonel)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# ============================================
# JWT Secret (Önemli!)
# ============================================
# Production için mutlaka güçlü bir secret kullanın!
# Örnek: openssl rand -base64 32
JWT_SECRET=your_jwt_secret_key_here

# ============================================
# Node Environment
# ============================================
NODE_ENV=development

# ============================================
# Next.js Configuration
# ============================================
NEXT_DISABLE_TURBO=1
NEXT_DISABLE_TURBOPACK=1
```

## 🔑 JWT Secret Oluşturma

### Windows (PowerShell):
```powershell
# Base64 encoded random string
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Linux/Mac:
```bash
openssl rand -base64 32
```

## 📍 Supabase Değişkenleri

1. [Supabase Dashboard](https://supabase.com/dashboard) açın
2. Projenizi seçin
3. **Settings** > **API** bölümüne gidin
4. **Project URL** ve **anon public** key'i kopyalayın

## ⚠️ Güvenlik Notları

- ✅ `.env.local` dosyasını **asla** Git'e commit etmeyin
- ✅ Production'da güçlü JWT_SECRET kullanın
- ✅ Her ortam için farklı değişkenler kullanın
- ❌ Secret'ları kod içine yazmayın
- ❌ Public repository'lerde paylaşmayın

## 🔍 Değişken Kontrolü

```powershell
# PowerShell'de kontrol
Get-Content .env.local

# Veya Node.js'te
node -e "console.log(process.env.JWT_SECRET)"
```
