# Mobil RTS Oyunu Kurulum ve Geliştirme Rehberi

## 🎯 Proje Özeti
Red Alert 2 tarzı gerçek zamanlı strateji (RTS) oyununun mobil versiyonunu React Native ve Phaser ile geliştiriyoruz.

## 📱 Kurulum Adımları

### 1. Gereksinimler
```bash
# Node.js 16+ yüklü olmalı
node --version

# React Native CLI
npm install -g @react-native-community/cli

# Android Studio (Android için)
# Xcode (iOS için - sadece macOS)
```

### 2. Proje Kurulumu
```bash
# Proje dizinine gir
cd mobile-rts-game

# Bağımlılıkları yükle
npm install

# iOS için (sadece macOS)
cd ios && pod install && cd ..

# Android için
npx react-native link
```

### 3. Çalıştırma
```bash
# Metro bundler'ı başlat
npm start

# Android
npm run android

# iOS (sadece macOS)
npm run ios
```

## 🎮 Oyun Özellikleri

### ✅ Tamamlanan Özellikler
1. **Temel Oyun Motoru**: Phaser + React Native entegrasyonu
2. **Grid Tabanlı Harita**: 32x32 pixel kareler
3. **Kaynak Sistemi**: Credits ve Power yönetimi
4. **Bina İnşa Etme**: Power Plant, Barracks
5. **Ünite Üretimi**: Soldier, Tank
6. **Touch Kontrolleri**: Seçim ve hareket
7. **UI Panel**: Kaynaklar ve kontroller

### 🚧 Geliştirilecek Özellikler
1. **Savaş Sistemi**: Üniteler arası çatışma
2. **Pathfinding**: Akıllı yol bulma
3. **AI Düşman**: Bilgisayar kontrollü rakip
4. **Farklı Fraksiyonlar**: Allies vs Soviets
5. **Grafikler**: Gerçek oyun assetleri
6. **Ses Efektleri**: Savaş ve inşa sesleri

## 🏗️ Proje Yapısı

```
mobile-rts-game/
├── src/
│   ├── components/
│   │   └── Game.tsx           # Phaser oyun motoru
│   ├── screens/
│   │   └── HomeScreen.tsx     # Ana oyun ekranı
│   └── utils/
│       └── gameLogic.ts       # Oyun mantığı
├── android/                   # Android projesi
├── ios/                       # iOS projesi
├── App.tsx                    # Ana uygulama
├── package.json
└── README.md
```

## 🎮 Oyun Mekanikleri

### Kaynak Yönetimi
- **Credits**: Bina ve ünite üretimi için
- **Power**: Binaların çalışması için gereken enerji
- **Ore Collection**: Maden toplama (gelecek)

### Binalar
- **Power Plant** ($100): +50 max power
- **Barracks** ($150): Piyade üretimi
- **War Factory** ($200): Araç üretimi (gelecek)
- **Ore Refinery** ($150): Maden işleme (gelecek)

### Üniteler
- **Soldier** ($50): Temel piyade
- **Tank** ($200): Ağır zırhlı araç
- **APC** ($150): Personel taşıyıcı (gelecek)

## 🔧 Geliştirme İpuçları

### Debug Modu
```typescript
// Game.tsx içinde
const DEBUG = true;
if (DEBUG) {
  console.log('Game state:', gameState);
}
```

### Performans Optimizasyonu
- GameObject havuzu kullan
- Texture atlasses ile draw call'ları azalt
- Sadece görünen alanı render et

## 📱 Mobil Optimizasyonları

### Touch Kontrolleri
- Tek parmak seçim
- Çift parmak zoom
- Sürüklemeyle kamera hareketi

### UI Boyutları
- Minimum 44px touch alanları
- Kontrastlı renkler
- Okunabilir fontlar

### Performans
- 60 FPS hedef
- Bellek kullanımı optimizasyonu
- Batarya dostu rendering

## 🚀 Gelecek Planlar

### Phase 1: Core Features (2 hafta)
- [x] Basic engine
- [x] Building system
- [x] Unit production
- [ ] Combat mechanics
- [ ] AI opponent

### Phase 2: Polish (1 hafta)
- [ ] Graphics & sounds
- [ ] UI/UX improvements
- [ ] Performance optimization
- [ ] Bug fixes

### Phase 3: Advanced Features (2 hafta)
- [ ] Multiplayer support
- [ ] Multiple factions
- [ ] Map editor
- [ ] Campaign mode

## 🤝 Katkıda Bulunma

1. Fork yap
2. Feature branch oluştur (`git checkout -b feature/new-feature`)
3. Commit yap (`git commit -m 'Add new feature'`)
4. Push yap (`git push origin feature/new-feature`)
5. Pull request aç

## 📄 Lisans
MIT License - istediğiniz gibi kullanabilirsiniz!