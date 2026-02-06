import { NextRequest, NextResponse } from 'next/server'

/**
 * Puantaj QR görseli (PNG) döndürür.
 * GET /api/hr/clock-qr?location=WORKPLACE_ID
 * İndirilebilir QR; okutulunca /hr/clock?location=... sayfası açılır.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location')
    if (!location) {
      return NextResponse.json({ error: 'location gerekli' }, { status: 400 })
    }

    const host = request.headers.get('host') || request.headers.get('x-forwarded-host') || 'localhost:3000'
    const proto = request.headers.get('x-forwarded-proto') || (request.headers.get('host')?.includes('localhost') ? 'http' : 'https')
    const baseUrl = `${proto}://${host}`
    const clockUrl = `${baseUrl}/hr/clock?location=${encodeURIComponent(location)}`

    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(clockUrl)}`
    const res = await fetch(qrImageUrl)
    if (!res.ok) {
      return NextResponse.json({ error: 'QR oluşturulamadı' }, { status: 502 })
    }

    const blob = await res.blob()
    const filename = `puantaj-qr-${location}.png`

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'QR alınamadı' }, { status: 500 })
  }
}
