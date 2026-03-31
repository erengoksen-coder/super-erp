# Performans uyarıları (Console)

## Forced reflow

**Uyarı:** `[Violation] Forced reflow while executing JavaScript took Xms`

**Anlamı:** JS çalışırken DOM ölçümü (offsetHeight, getBoundingClientRect, scrollTop okuma) veya hemen ardından layout değiştiren yazma (scrollTop atama, class/style değişikliği) yapılıyor. Tarayıcı layout'u tekrar hesaplamak zorunda kalıyor.

**Yapılan düzeltmeler:**
- **MainShell** ve **ScrollToTop:** Sayfa değişince scroll sıfırlama artık `requestAnimationFrame` içinde yapılıyor; böylece React commit fazı ile aynı frame’te çakışmıyor.
- Mümkünse layout okuyan kodu (getBoundingClientRect, offsetHeight vb.) ile layout yazan kodu (scrollTop, class değişikliği) ayrı frame’lere bölmek veya `requestAnimationFrame` ile ertelemek iyi pratiktir.

## setTimeout handler took Xms

**Uyarı:** `[Violation] 'setTimeout' handler took 168ms`

**Anlamı:** Bir `setTimeout` callback’i 50ms’den uzun sürdü; ana thread’i meşgul ediyor.

**Olası kaynaklar:**
- Grafik kütüphaneleri (Recharts vb.) ilk render’da ölçüm yapıyor.
- Çok sayıda state güncellemesi veya ağır hesaplama.

**Yapılan:** Dashboard’daki welcome banner kapatma timer’ı `requestAnimationFrame` ile ertelendi; ilk frame’teki iş yükü hafifletildi.

**Genel öneri:** Ağır işleri `requestIdleCallback` veya küçük parçalara bölüp `setTimeout(..., 0)` ile erteleyebilirsiniz.
