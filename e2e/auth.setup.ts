import path from 'path'
import { test as setup, expect } from '@playwright/test'
import * as fs from 'fs'

const authDir = path.join(process.cwd(), 'e2e', '.auth')
const authFile = path.join(authDir, 'user.json')
if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })
const user = process.env.PLAYWRIGHT_TEST_USER
const pass = process.env.PLAYWRIGHT_TEST_PASSWORD

setup('giriş yap ve oturumu kaydet', async ({ page }) => {
  if (!user || !pass) {
    setup.skip()
    return
  }
  await page.goto('/auth/login')
  await expect(page.getByPlaceholder('Kullanıcı adınızı girin')).toBeVisible({ timeout: 15_000 })
  await page.getByPlaceholder('Kullanıcı adınızı girin').fill(user)
  await page.getByPlaceholder('Şifrenizi girin').fill(pass)
  await page.getByRole('button', { name: 'Giriş Yap' }).click()
  await expect(page).toHaveURL(/\/(dashboard)?(\?|$)/, { timeout: 15_000 })
  await expect(
    page.getByRole('heading', { name: /hoş geldin|kontrol paneli|dashboard/i }).first()
  ).toBeVisible({ timeout: 15_000 })
  await page.waitForLoadState('networkidle')
  // Oturumun yazılması için bekle: cookie (auth-token) veya localStorage
  await page.waitForFunction(() => !!window.localStorage.getItem('auth-token'), { timeout: 10_000 }).catch(() => null)
  // Cookie'nin set edilmesi için kısa bekleme (API Set-Cookie sonrası)
  await new Promise((r) => setTimeout(r, 1200))
  // Cookie varsa doğrula (middleware auth-token veya access_token kullanıyor)
  const cookies = await page.context().cookies()
  const hasAuthCookie = cookies.some((c) => c.name === 'auth-token' || c.name === 'access_token')
  if (!hasAuthCookie) {
    await new Promise((r) => setTimeout(r, 1000))
  }
  // Fatura testleri için en az bir fatura oluştur (tedarikçi yoksa oluştur, sonra alış faturası)
  try {
    const listRes = await page.request.get('/api/invoices?limit=1')
    const listJson = (await listRes.json()) as { data?: unknown[]; meta?: { total?: number } }
    const total = listJson?.meta?.total ?? (Array.isArray(listJson?.data) ? listJson.data.length : 0)
    if (total === 0) {
      let supplierId: string | null = null
      const accRes = await page.request.get('/api/accounts?type=supplier&limit=1')
      const accJson = (await accRes.json()) as { data?: { id: string }[] }
      const rows = accJson?.data ?? []
      const supplier = Array.isArray(rows) ? rows[0] : null
      if (supplier?.id) {
        supplierId = supplier.id
      } else {
        const createAccRes = await page.request.post('/api/accounts', {
          data: { name: 'E2E Tedarikçi', type: 'supplier' },
          headers: { 'Content-Type': 'application/json' },
        })
        if (createAccRes.ok()) {
          const created = (await createAccRes.json()) as { data?: { id: string }; id?: string }
          supplierId = created?.data?.id ?? created?.id ?? null
        }
      }
      if (supplierId) {
        await page.request.post('/api/invoices', {
          data: {
            type: 'purchase',
            customer_id: supplierId,
            items: [{ quantity: 1, unit_price: 1, description: 'E2E test fatura' }],
          },
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }
  } catch {
    // Fatura/hesap API hata verirse setup devam etsin
  }
  await page.context().storageState({ path: authFile })

  const raw = fs.readFileSync(authFile, 'utf-8')
  const state = JSON.parse(raw) as { cookies?: unknown[]; origins?: { origin: string; localStorage?: { name: string; value: string }[] }[] }
  const hasCookies = Array.isArray(state.cookies) && state.cookies.length > 0
  const hasStorage = Array.isArray(state.origins) && state.origins.some((o) => o.localStorage?.some((e) => e.name === 'auth-token'))
  if (!hasCookies && !hasStorage) {
    await new Promise((r) => setTimeout(r, 1500))
    await page.context().storageState({ path: authFile })
    const raw2 = fs.readFileSync(authFile, 'utf-8')
    const state2 = JSON.parse(raw2) as { origins?: { origin: string; localStorage?: { name: string; value: string }[] }[] }
    const hasStorage2 = Array.isArray(state2.origins) && state2.origins.some((o) => o.localStorage?.some((e) => e.name === 'auth-token'))
    expect(hasStorage2 || hasCookies, 'Auth state (auth-token) kaydedilmedi; E2E oturum kullanılamaz').toBe(true)
  }
})
