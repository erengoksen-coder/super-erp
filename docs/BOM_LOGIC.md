# 🔧 BOM (Bill of Materials) Mantığı - Detaylı Açıklama

## 📋 Genel Bakış

BOM sistemi, üretim emri oluşturulduğunda **otomatik olarak stokları düşen** ve **stok yetersizse üretimi engelleyen** bir sistemdir.

## 🎯 Çalışma Mantığı

### 1. Üretim Emri Oluşturma Akışı

```
Kullanıcı: "10 adet Chester üretmek istiyorum"
    ↓
Sistem: BOM (Reçete) kontrolü
    ├─ Chester reçetesi: 8m Kumaş + 4 Ayak
    ├─ 10 adet için: 80m Kumaş + 40 Ayak gerekiyor
    └─ Stok kontrolü yapılır
        ├─ Yetersiz → ❌ Üretim başlatılamaz
        └─ Yeterli → ✅ Üretim emri oluşturulur
            ↓
Stok düşüşü (Otomatik)
    ├─ Kumaş: 100m → 20m (80m düştü)
    └─ Ayak: 50 adet → 10 adet (40 adet düştü)
```

### 2. Kritik Kontroller

#### ✅ Stok Kontrolü (Ön Kontrol)
```typescript
checkBOMAvailability(productId, quantity)
```
- Üretim öncesi stok kontrolü
- Her hammadde için: `Mevcut Stok >= (Reçete Miktarı × Üretim Miktarı)`
- Eksiye düşecekse `canProduce: false` döner

#### ✅ Üretim Emri Oluşturma
```typescript
createProductionOrderWithStockDeduction(orderNumber, productId, quantity)
```
- Önce stok kontrolü yapar
- Yetersizse üretim başlatılmaz
- Yeterliyse:
  1. Üretim emri oluşturulur
  2. Her hammadde için stok hareketi kaydedilir
  3. Trigger otomatik stok düşüşü yapar

#### ✅ Trigger Kontrolü (Son Kontrol)
```sql
update_stock_quantity() -- Trigger fonksiyonu
```
- Stok hareketi kaydedilirken çalışır
- Eksiye düşecekse **hata fırlatır** ve işlem geri alınır
- Bu sayede race condition'lar önlenir

## 📊 Örnek Senaryo

### Senaryo 1: Başarılı Üretim
```
Ürün: Chester Koltuk
Miktar: 10 adet
Reçete: 8m Kumaş + 4 Ayak (birim başına)

Gereken:
- Kumaş: 8m × 10 = 80m
- Ayak: 4 × 10 = 40 adet

Mevcut Stok:
- Kumaş: 100m ✅
- Ayak: 50 adet ✅

Sonuç: ✅ Üretim başlatılır
Stok Sonrası:
- Kumaş: 100m → 20m
- Ayak: 50 → 10 adet
```

### Senaryo 2: Stok Yetersiz
```
Ürün: Chester Koltuk
Miktar: 15 adet

Gereken:
- Kumaş: 8m × 15 = 120m
- Ayak: 4 × 15 = 60 adet

Mevcut Stok:
- Kumaş: 100m ❌ (120m gerekiyor)
- Ayak: 50 adet ❌ (60 adet gerekiyor)

Sonuç: ❌ Üretim başlatılamaz
Hata: "Stok yetersiz! Kumaş (Gereken: 120m, Mevcut: 100m), Ayak (Gereken: 60, Mevcut: 50)"
```

## 🔒 Güvenlik Özellikleri

### 1. Çift Kontrol Sistemi
- **Ön Kontrol**: JavaScript seviyesinde (`checkBOMAvailability`)
- **Son Kontrol**: Database trigger seviyesinde (`update_stock_quantity`)

### 2. Race Condition Koruması
- Trigger, stok hareketi sırasında son kontrolü yapar
- Eksiye düşecekse transaction geri alınır

### 3. İptal Mekanizması
- Hata durumunda üretim emri otomatik iptal edilir
- Stoklar değişmez

## 📝 Kod Örnekleri

### Stok Kontrolü
```typescript
const check = await checkBOMAvailability('product-id', 10)
if (!check.canProduce) {
  console.log('Yetersiz hammaddeler:', check.insufficientItems)
}
```

### Üretim Başlatma
```typescript
const result = await createProductionOrderWithStockDeduction(
  'URE-001',
  'product-id',
  10
)

if (result.success) {
  console.log('Üretim başlatıldı:', result.orderId)
} else {
  console.error('Hata:', result.error)
}
```

## 🎓 Öğrenme Notları

1. **BOM = Reçete**: Bir ürünün hangi hammaddelerden oluştuğu
2. **Stok Düşüşü**: Reçete miktarı × Üretim miktarı
3. **Otomatik İşlem**: Trigger sayesinde manuel müdahale gerekmez
4. **Güvenlik**: Çift kontrol sistemi ile hata önleme


