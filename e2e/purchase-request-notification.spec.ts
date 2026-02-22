import { test, expect } from '@playwright/test'

/**
 * Satın alma talebi oluşturulunca bildirim düşmesi akışı.
 * Auth gerekir (PLAYWRIGHT_TEST_USER / PLAYWRIGHT_TEST_PASSWORD).
 *
 * Çalıştırma: npm run test:e2e (veya PLAYWRIGHT_TEST_USER=admin PLAYWRIGHT_TEST_PASSWORD=... npx playwright test e2e/purchase-request-notification.spec.ts)
 */
test.describe('Satın alma talebi → bildirim', () => {
  test.beforeEach(({}, testInfo) => {
    if (!process.env.PLAYWRIGHT_TEST_USER) testInfo.skip()
  })

  test('Talep oluşturulunca bildirim listesinde görünür', async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto('/')
    if (page.url().includes('/auth/login')) {
      test.skip(true, 'Oturum yok')
      return
    }

    // Malzeme listesinden ilk malzeme id'sini al
    const materialId = await page.evaluate(async () => {
      const r = await fetch('/api/materials')
      if (!r.ok) return null
      const list = await r.json()
      const first = Array.isArray(list) ? list[0] : null
      return first?.id ?? null
    })
    if (!materialId) {
      test.skip(true, 'Malzeme bulunamadı')
      return
    }

    // Satın alma talebi oluştur (sayfa cookie'leri ile)
    const created = await page.evaluate(
      async (mid: string) => {
        const r = await fetch('/api/purchase-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            material_id: mid,
            requested_quantity: 1,
            unit_price: 0,
          }),
        })
        return r.ok
      },
      materialId
    )
    expect(created, 'Satın alma talebi oluşturulmalı').toBe(true)

    // Bildirimler sayfasına git
    await page.goto('/notifications')
    await page.waitForLoadState('networkidle')

    // "Yeni satın alma talebi" veya "satın alma talebi" metni listelenmeli
    await expect(
      page.getByText(/yeni satın alma talebi|satın alma talebi oluşturuldu/i).first()
    ).toBeVisible({ timeout: 15_000 })
  })
})
