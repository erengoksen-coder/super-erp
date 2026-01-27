# Kullanıcı Yönetimi API Dokümantasyonu

## Endpoint'ler

### 1. Kullanıcı Listesi
**GET** `/api/users`

Tüm kullanıcıları ve izinlerini getirir.

**Response:**
```json
[
  {
    "id": "uuid",
    "username": "kullanici_adi",
    "email": "email@example.com",
    "full_name": "Ad Soyad",
    "role": "user",
    "job_title": "Görev",
    "is_approved": 1,
    "approved_by": "uuid",
    "approved_at": "2024-01-01T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z",
    "last_login": "2024-01-01T00:00:00Z",
    "permissions": [
      {
        "page_path": "/production",
        "can_view": 1,
        "can_create": 0,
        "can_edit": 0,
        "can_delete": 0
      }
    ]
  }
]
```

---

### 2. Yeni Kullanıcı Oluştur
**POST** `/api/users`

Yeni kullanıcı oluşturur.

**Request Body:**
```json
{
  "username": "yeni_kullanici",
  "password": "sifre123",
  "email": "email@example.com",
  "full_name": "Ad Soyad",
  "job_title": "Görev",
  "role": "user",
  "is_approved": false,
  "permissions": [
    {
      "page_path": "/production",
      "can_view": true,
      "can_create": false,
      "can_edit": false,
      "can_delete": false
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Kullanıcı başarıyla oluşturuldu",
  "user": {
    "id": "uuid",
    "username": "yeni_kullanici",
    "email": "email@example.com",
    "full_name": "Ad Soyad",
    "role": "user",
    "job_title": "Görev",
    "is_approved": 0
  }
}
```

---

### 3. Kullanıcı Detayı
**GET** `/api/users/[id]`

Belirli bir kullanıcının detaylarını getirir.

**Response:**
```json
{
  "id": "uuid",
  "username": "kullanici_adi",
  "email": "email@example.com",
  "full_name": "Ad Soyad",
  "role": "user",
  "job_title": "Görev",
  "is_approved": 1,
  "permissions": [...]
}
```

---

### 4. Kullanıcı Güncelle
**PATCH** `/api/users/[id]`

Kullanıcı bilgilerini günceller.

**Request Body:**
```json
{
  "email": "yeni_email@example.com",
  "full_name": "Yeni Ad Soyad",
  "job_title": "Yeni Görev",
  "role": "admin",
  "password": "yeni_sifre",
  "is_approved": true,
  "approved_by": "admin_user_id",
  "permissions": [
    {
      "page_path": "/production",
      "can_view": true,
      "can_create": true,
      "can_edit": true,
      "can_delete": false
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Kullanıcı başarıyla güncellendi"
}
```

---

### 5. Kullanıcı Durumunu Güncelle (Onaylama/Reddetme)
**PATCH** `/api/users/[id]/status`

Kullanıcının onay durumunu günceller.

**Request Body:**
```json
{
  "status": "active",
  "approved_by": "admin_user_id"
}
```

**Geçerli Durum Değerleri:**
- `active` veya `approved` - Kullanıcıyı onayla
- `pending` veya `rejected` - Kullanıcıyı beklemede bırak veya reddet

**Response:**
```json
{
  "success": true,
  "message": "Kullanıcı durumu başarıyla güncellendi",
  "is_approved": 1
}
```

---

### 6. Kullanıcı Şifresini Değiştir
**PATCH** `/api/users/[id]/change-password`

Kullanıcı şifresini değiştirir.

**Request Body:**
```json
{
  "old_password": "eski_sifre",
  "new_password": "yeni_sifre123"
}
```

**Veya Admin için zorla değiştirme:**
```json
{
  "new_password": "yeni_sifre123",
  "force_change": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Şifre başarıyla değiştirildi"
}
```

---

### 7. Kullanıcı Sil
**DELETE** `/api/users/[id]`

Kullanıcıyı siler. Admin kullanıcılar silinemez.

**Response:**
```json
{
  "success": true,
  "message": "Kullanıcı başarıyla silindi"
}
```

---

### 8. Mevcut Kullanıcı Bilgileri
**GET** `/api/users/me`

Mevcut oturum açmış kullanıcının bilgilerini getirir.

**Headers:**
```
x-user-id: user_uuid
```

**Response:**
```json
{
  "id": "uuid",
  "username": "kullanici_adi",
  "email": "email@example.com",
  "full_name": "Ad Soyad",
  "role": "user",
  "permissions": [...]
}
```

---

### 9. Mevcut Kullanıcı Profilini Güncelle
**PATCH** `/api/users/me`

Mevcut kullanıcının kendi profilini günceller.

**Headers:**
```
x-user-id: user_uuid
```

**Request Body:**
```json
{
  "email": "yeni_email@example.com",
  "full_name": "Yeni Ad Soyad",
  "job_title": "Yeni Görev"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profil başarıyla güncellendi"
}
```

---

## Rol Değerleri

- `admin` - Yönetici
- `user` - Kullanıcı
- `genel_mudur` - Genel Müdür
- `uretim_muduru` - Üretim Müdürü
- `uretim_sorumlusu` - Üretim Sorumlusu
- `usta` - Usta
- `terzi` - Terzi
- `depo_sorumlusu` - Depo Sorumlusu
- `satis_sorumlusu` - Satış Sorumlusu
- `muhasebe` - Muhasebe
- `kalite_kontrol` - Kalite Kontrol
- `planlama` - Planlama
- `sevkiyat` - Sevkiyat

---

## İzinler (Permissions)

Her izin şu alanları içerir:
- `page_path` - Sayfa yolu (örn: `/production`, `/inventory/materials`)
- `can_view` - Görüntüleme izni
- `can_create` - Oluşturma izni
- `can_edit` - Düzenleme izni
- `can_delete` - Silme izni

---

## Hata Kodları

- `400` - Geçersiz istek (eksik parametreler, geçersiz değerler)
- `401` - Yetkilendirme hatası
- `404` - Kullanıcı bulunamadı
- `500` - Sunucu hatası

---

## Örnek Kullanım

### Kullanıcı Oluşturma
```javascript
const response = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'yeni_kullanici',
    password: 'sifre123',
    email: 'email@example.com',
    full_name: 'Ad Soyad',
    job_title: 'Görev',
    role: 'user',
    is_approved: false,
    permissions: [
      {
        page_path: '/production',
        can_view: true,
        can_create: false,
        can_edit: false,
        can_delete: false
      }
    ]
  })
})
```

### Kullanıcı Onaylama
```javascript
const response = await fetch(`/api/users/${userId}/status`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'active',
    approved_by: 'admin_user_id'
  })
})
```

### Şifre Değiştirme
```javascript
const response = await fetch(`/api/users/${userId}/change-password`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    old_password: 'eski_sifre',
    new_password: 'yeni_sifre123'
  })
})
```

