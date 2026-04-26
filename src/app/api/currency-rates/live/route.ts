import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'

const FRANKFURTER = 'https://api.frankfurter.app'

/** GET: Anlık kur (Frankfurter API). Query: from=USD&to=TRY */
export const GET = withAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const from = (searchParams.get('from') || 'USD').toUpperCase().slice(0, 3)
  const to = (searchParams.get('to') || 'TRY').toUpperCase().slice(0, 3)

  if (from === to) {
    return NextResponse.json({ rate: 1, date: new Date().toISOString().slice(0, 10), source: 'same' })
  }

  try {
    const url = `${FRANKFURTER}/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json(
        { error: 'Kur servisi yanıt vermedi', detail: text.slice(0, 200) },
        { status: 502 }
      )
    }
    const data = (await res.json()) as { base?: string; date?: string; rates?: Record<string, number> }
    const rate = data?.rates?.[to]
    const date = data?.date || new Date().toISOString().slice(0, 10)
    if (rate == null || !Number.isFinite(rate)) {
      return NextResponse.json({ error: 'Kur bulunamadı', rates: data?.rates }, { status: 502 })
    }
    return NextResponse.json({ rate, date, from, to, source: 'frankfurter' })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Kur servisi hatası'
    return NextResponse.json({ error: message }, { status: 502 })
  }
})
