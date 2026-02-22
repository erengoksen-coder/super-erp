# Sanal Kaydırma (Virtual Scroll) Kullanımı

Büyük listelerde (500+ satır) sadece görünen satırları render etmek için `@tanstack/react-virtual` kullanılır.

---

## Bileşen

- **`components/VirtualTableBody.tsx`:** `rows`, `renderRow`, `getRowKey`, `rowHeight` (ve isteğe bağlı `estimateSize`, `className`) alır. Scroll container olarak bir div kullanır; satırlar mutlak konumla render edilir.

## Tablo ile Kullanım

`VirtualTableBody` satırları `div` ile render ettiği için gerçek `<table>` ile doğrudan kullanılamaz. İki seçenek:

1. **Div tablo:** Dış container’da `display: table`, satırlarda `display: table-row`, hücrelerde `display: table-cell` kullanarak tablo görünümü verilebilir.
2. **Sayfalama:** Zaten sayfalı listelerde (örn. faturalar 20’şer) virtual scroll gerekmez; veri çok büyüdüğünde limit artırılıp tek istekte 500+ kayıt dönüyorsa, o sayfada `VirtualTableBody` veya `useVirtualizer` ile sadece görünen satırları render edin.

## useVirtualizer ile Özel Kullanım

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

const parentRef = useRef<HTMLDivElement>(null)
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 48,
  overscan: 5,
})
// virtualizer.getVirtualItems().map(...) ile sadece görünen öğeleri render edin
```

## Ne Zaman Kullanılmalı

- Tek seferde 200+ satır DOM’a basıldığında performans düşüyorsa.
- Sayfalama (limit/offset) kullanılmıyorsa veya kullanıcı “tümünü göster” seçeneğiyle çok satır getiriyorsa.

Projede sipariş, fatura, cari listeleri şu an sayfalı; ileride “tümünü getir” gibi bir mod eklenirse bu sayfada virtual list kullanılabilir.
