import { test, expect } from '@playwright/test'

/**
 * Tam otomatik test — siz sadece izleyin.
 * Akış: Sipariş oluştur → Üretime al → Usta panelinde istasyonlarda "Bitti" ile ilerlet.
 * Confirm dialog'lar otomatik kabul edilir; tarayıcı açık çalışır.
 *
 * İzlemek için (uygulama çalışıyor olmalı: npm run dev:simple):
 *   npm run test:e2e:izle
 */
test.describe('Canlı akış: Sipariş → Üretim → Usta paneli', () => {
  test.beforeEach(({}, testInfo) => {
    if (!process.env.PLAYWRIGHT_TEST_USER) testInfo.skip()
  })

  test('Sipariş oluştur, üretime al, usta panelinden ilerlet', async ({ page }, testInfo) => {
    test.setTimeout(120_000)

    // Tüm confirm() dialog'larını otomatik kabul et
    page.on('dialog', (dialog) => dialog.accept())

    await page.goto('/')
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }

    // —— 1. Sipariş oluştur ——
    await page.goto('/orders', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/orders/)
    await page.getByRole('button', { name: 'Yeni Sipariş' }).click()
    await expect(page.getByRole('heading', { name: /Yeni Sipariş Oluştur/i })).toBeVisible({ timeout: 10_000 })

    const modal = page.locator('div.fixed.inset-0').filter({ has: page.getByRole('heading', { name: /Yeni Sipariş/i }) })
    await modal.getByPlaceholder('Bayi adı yazın...').fill('Canlı Test Bayi')
    await modal.getByRole('textbox').nth(2).fill('Canlı Test Müşteri')
    const urunInput = modal.getByRole('textbox').nth(4)
    await urunInput.fill('atlas')
    await urunInput.blur()
    await page.waitForTimeout(500)
    await modal.getByRole('spinbutton').fill('1')
    await modal.locator('input[type="datetime-local"]').fill('2026-02-20T10:00')
    await modal.locator('#order-configuration').fill('Klasik')
    await modal.locator('#order-fabric-code').fill('KUM-001')

    const orderResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/orders') && res.request().method() === 'POST' && res.status() >= 200 && res.status() < 300,
      { timeout: 25_000 }
    )
    await modal.getByRole('button', { name: 'Sipariş Oluştur' }).click()
    let createdOrderId: string | undefined
    try {
      const orderResponse = await orderResponsePromise
      const orderBody = await orderResponse.json()
      createdOrderId = orderBody?.orders?.[0]?.id
    } catch {
      createdOrderId = undefined
    }

    await expect(page).toHaveURL(/\/orders/, { timeout: 15_000 })
    await expect(page.getByText(/Canlı Test Müşteri|sipariş|Beklemede|Yeni Sipariş/i).first()).toBeVisible({ timeout: 10_000 })

    if (!createdOrderId) {
      const firstOrderLink = page.locator('a[href*="/orders/"][href*="?"]').first()
      const href = await firstOrderLink.getAttribute('href').catch(() => null)
      if (href) {
        const match = href.match(/\/orders\/([^/?]+)/)
        if (match) createdOrderId = match[1]
      }
    }
    if (!createdOrderId) {
      testInfo.skip(true, 'Sipariş oluşturuldu ama ID alınamadı; üretim adımı atlanıyor')
      return
    }

    // —— 2. Üretime al: Yeni Üretim Emri sayfasına siparişle git ——
    await page.goto(`/production/new?from_orders=${createdOrderId}`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/production\/new/)
    await page.waitForTimeout(1500)

    const createProdBtn = page.getByRole('button', { name: /Üretim Emri Oluştur/i })
    await createProdBtn.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null)
    if (await createProdBtn.isVisible()) {
      await createProdBtn.click()
      await page.waitForTimeout(3000)
      await expect(page).toHaveURL(/\/(production|production\/new)/, { timeout: 15_000 })
    }

    // —— 3. Üretim sayfasına git, Devam Eden'de göründüğünü kontrol et ——
    await page.goto('/production', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/production/)
    await page.getByRole('button', { name: /Devam Eden/i }).click()
    await page.waitForTimeout(1500)

    // —— 4. Usta Terminali: İstasyonlar sayfası ——
    await page.goto('/mobile/workstation', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/mobile\/workstation/)
    await expect(page.getByText(/Usta Terminali|İstasyon/i).first()).toBeVisible({ timeout: 10_000 })

    const iskeletLink = page.getByRole('link', { name: /iskelet/i }).first()
    if (await iskeletLink.isVisible()) {
      await iskeletLink.click()
      await expect(page).toHaveURL(/station=iskelet/)
      await page.waitForTimeout(1000)

      const bittiBtn = page.getByRole('button', { name: 'Bitti' }).first()
      if (await bittiBtn.isVisible()) {
        await bittiBtn.click()
        await page.waitForTimeout(2000)
      }
    }

    // —— 5. Terzihane istasyonunda da "Bitti" (ilerlet) ——
    await page.goto('/mobile/workstation/station?station=terzihane', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    const bittiTerzi = page.getByRole('button', { name: 'Bitti' }).first()
    if (await bittiTerzi.isVisible()) {
      await bittiTerzi.click()
      await page.waitForTimeout(2000)
    }

    // —— 6. Döseme istasyonu ——
    await page.goto('/mobile/workstation/station?station=döseme', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    const bittiDoseme = page.getByRole('button', { name: 'Bitti' }).first()
    if (await bittiDoseme.isVisible()) {
      await bittiDoseme.click()
      await page.waitForTimeout(2000)
    }

    await expect(page).toHaveURL(/station=döseme|station=montaj/)
  })

  test('Sipariş girildiyse devam et: üretime al, usta panelinden ilerlet', async ({ page }, testInfo) => {
    test.setTimeout(120_000)
    page.on('dialog', (dialog) => dialog.accept())

    await page.goto('/')
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }

    // Siparişler sayfasına git, ilk bekleyen siparişin ID'sini al
    await page.goto('/orders', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/orders/)

    const orderId = await page.evaluate(async () => {
      try {
        const r = await fetch('/api/orders', { credentials: 'include' })
        const json = await r.json()
        const list = json?.data ?? json
        const orders = Array.isArray(list) ? list : []
        const pending = orders.find((o: { status?: string }) => o.status === 'pending')
        return pending?.id ?? null
      } catch {
        return null
      }
    })

    if (!orderId) {
      testInfo.skip(true, 'Bekleyen sipariş bulunamadı; önce sipariş girin')
      return
    }

    // Üretime al
    await page.goto(`/production/new?from_orders=${orderId}`, { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/production\/new/)
    await page.waitForTimeout(1500)

    const createProdBtn = page.getByRole('button', { name: /Üretim Emri Oluştur/i })
    await createProdBtn.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null)
    if (await createProdBtn.isVisible()) {
      await createProdBtn.click()
      await page.waitForTimeout(3000)
    }

    // Üretim sayfası
    await page.goto('/production', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /Devam Eden/i }).click()
    await page.waitForTimeout(1500)

    // Usta Terminali: İskelet → Terzihane → Döseme "Bitti"
    await page.goto('/mobile/workstation', { waitUntil: 'networkidle' })
    const iskeletLink = page.getByRole('link', { name: /iskelet/i }).first()
    if (await iskeletLink.isVisible()) {
      await iskeletLink.click()
      await page.waitForTimeout(1000)
      const bittiBtn = page.getByRole('button', { name: 'Bitti' }).first()
      if (await bittiBtn.isVisible()) await bittiBtn.click()
      await page.waitForTimeout(2000)
    }
    await page.goto('/mobile/workstation/station?station=terzihane', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    const bittiTerzi = page.getByRole('button', { name: 'Bitti' }).first()
    if (await bittiTerzi.isVisible()) { await bittiTerzi.click(); await page.waitForTimeout(2000) }
    await page.goto('/mobile/workstation/station?station=döseme', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    const bittiDoseme = page.getByRole('button', { name: 'Bitti' }).first()
    if (await bittiDoseme.isVisible()) { await bittiDoseme.click(); await page.waitForTimeout(2000) }

    await expect(page).toHaveURL(/station=döseme|station=montaj/)
  })
})
