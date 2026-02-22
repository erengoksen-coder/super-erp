#!/usr/bin/env node
/**
 * Ana sayfaları ve API uçlarını canlı test eder (sunucu çalışıyor olmalı).
 * GET istekleri atar; 200/401/302 beklenen, 500/404 hata sayılır.
 *
 * Kullanım: node scripts/test-pages-and-apis.js [baseUrl]
 * Örnek:   node scripts/test-pages-and-apis.js http://localhost:3000
 */

const base = process.argv[2] || 'http://localhost:3000'

const pages = [
  '/',
  '/auth/login',
  '/auth/register',
  '/dashboard',
  '/orders',
  '/production',
  '/invoices',
  '/shipments',
  '/accounts',
  '/payments',
  '/inventory',
  '/inventory/materials',
  '/bom',
  '/barcodes',
  '/finance',
  '/users',
  '/settings',
  '/notifications',
  '/reports/stock-movements',
  '/finance/journal-entries',
]

const apisNoAuth = [
  { path: '/api/health', expect: [200] },
  { path: '/api/auth/ping', expect: [200] },
  { path: '/api/auth/login', method: 'POST', body: {}, expect: [200, 400, 401] },
]

const apisNeedAuth = [
  '/api/auth/me',
  '/api/dashboard/stats',
  '/api/orders',
  '/api/invoices',
  '/api/accounts',
  '/api/shipments',
  '/api/materials',
  '/api/production/board',
  '/api/notifications',
]

async function fetchOk(url, opts = {}) {
  try {
    const res = await fetch(url, { ...opts, redirect: 'manual' })
    return { status: res.status, ok: res.ok }
  } catch (e) {
    return { status: 0, ok: false, error: e.message }
  }
}

async function main() {
  console.log('Base URL:', base)
  console.log('--- Sayfalar (GET) ---')
  const pageResults = { ok: [], redirect: [], error: [], other: [] }
  for (const path of pages) {
    const url = base + path
    const { status } = await fetchOk(url)
    if (status === 200) pageResults.ok.push(path)
    else if (status === 302 || status === 301) pageResults.redirect.push(path)
    else if (status >= 500 || status === 0) pageResults.error.push({ path, status })
    else pageResults.other.push({ path, status })
  }
  console.log('200 OK:', pageResults.ok.length, pageResults.ok.slice(0, 8).join(', '), pageResults.ok.length > 8 ? '...' : '')
  console.log('302/301 (yönlendirme):', pageResults.redirect.length)
  if (pageResults.error.length) console.log('HATA (5xx veya bağlantı):', pageResults.error)
  if (pageResults.other.length) console.log('Diğer:', pageResults.other.slice(0, 5))

  console.log('\n--- API (oturumsuz) ---')
  for (const a of apisNoAuth) {
    const url = base + a.path
    const opts = a.method === 'POST' ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a.body || {}) } : {}
    const { status } = await fetchOk(url, opts)
    const expected = a.expect.includes(status)
    console.log(a.path, status, expected ? 'OK' : '?')
  }

  console.log('\n--- API (oturum gerekli, 401 beklenir) ---')
  for (const path of apisNeedAuth.slice(0, 6)) {
    const { status } = await fetchOk(base + path)
    console.log(path, status, status === 401 ? 'OK (yetkisiz)' : status === 200 ? '200 (oturum var?)' : '?')
  }

  const hasPageErrors = pageResults.error.length > 0
  console.log('\n--- Özet ---')
  if (hasPageErrors) {
    console.log('UYARI: Bazı sayfalar hata döndü veya açılamadı:', pageResults.error)
  } else {
    console.log('Tüm sayfa istekleri 200 veya yönlendirme (302) döndü.')
  }
  process.exit(hasPageErrors ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
