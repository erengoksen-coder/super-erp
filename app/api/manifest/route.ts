import { NextResponse } from 'next/server'

/**
 * Web app manifest – JSON olarak döner; tarayıcı "Syntax error" almaz.
 * Layout'ta manifest: '/api/manifest' kullanın.
 */
export async function GET() {
  const manifest = {
    name: 'LIVASOFA - Süper ERP',
    short_name: 'LIVASOFA ERP',
    description: 'Koltuk Üretim Yönetim Sistemi',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0f19',
    theme_color: '#0b0f19',
    icons: [
      { src: '/api/icon', sizes: 'any', type: 'image/png', purpose: 'any' },
    ],
  }
  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'no-cache, must-revalidate',
    },
  })
}
