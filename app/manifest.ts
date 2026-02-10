import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LIVASOFA - Süper ERP',
    short_name: 'Super ERP',
    description: 'Koltuk Üretim Yönetim Sistemi',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0f19',
    theme_color: '#0b0f19',
    // İkon uyarısını kaldırmak için boş; gerçek 192x192 ve 512x512 PNG ekleyince aşağıyı açın
    icons: [],
    // icons: [
    //   { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    //   { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    // ],
  }
}
