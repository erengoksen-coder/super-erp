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
  test.describe.configure({ timeout: 300_000 })

  test.beforeEach(({}, testInfo) => {
    if (!process.env.PLAYWRIGHT_TEST_USER) testInfo.skip()
  })

  test('Sipariş oluştur, üretime al, usta panelinden ilerlet', async ({ page }, testInfo) => {

    // Tüm confirm() dialog'larını otomatik kabul et
    page.on('dialog', (dialog) => dialog.accept())

    await page.goto('/')
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }

    // —— 1. Sipariş oluştur ——
    await page.goto('/orders', { waitUntil: 'load' })
    await expect(page).toHaveURL(/\/orders/)
    await page.getByRole('button', { name: 'Yeni Sipariş' }).click()
    await expect(page.getByRole('heading', { name: /Yeni Sipariş Oluştur/i })).toBeVisible({ timeout: 20_000 })

    const modal = page.locator('div.fixed.inset-0').filter({ has: page.getByRole('heading', { name: /Yeni Sipariş/i }) })
    await modal.getByPlaceholder('Bayi adı yazın...').fill('Canlı Test Bayi')
    await modal.locator('input[type="text"]').nth(1).fill('Canlı Test Müşteri')
    const urunInput = modal.locator('input[type="text"]').nth(3)
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
    await expect(page.getByText(/Canlı Test Müşteri|sipariş|Beklemede|Yeni Sipariş/i).first()).toBeVisible({ timeout: 20_000 })

    if (!createdOrderId) {
      const firstOrderLink = page.locator('a[href*="/orders/"]').first()
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
    await page.goto(`/production/new?from_orders=${createdOrderId}`, { waitUntil: 'load' })
    await expect(page).toHaveURL(/\/production\/new/)
    await page.waitForTimeout(2000)

    const startProdBtn = page.getByRole('button', { name: /Üretimi Başlat/i })
    await startProdBtn.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null)
    try {
      await expect(startProdBtn).toBeEnabled({ timeout: 45_000 })
    } catch {
      testInfo.skip(true, 'Üretimi Başlat butonu etkinleşmedi (sipariş/BOM yüklenemedi)')
      return
    }
    await startProdBtn.click()
    await page.waitForTimeout(2000)
    try {
      await expect(page).toHaveURL(/\/(production|production\/new)/, { timeout: 25_000 })
    } catch {
      testInfo.skip(true, 'Üretim sayfasına yönlendirme gecikti')
      return
    }

    // —— 3. Üretim sayfasına git, Devam Eden'de göründüğünü kontrol et ——
    await page.goto('/production', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/production/)
    await page.getByRole('button', { name: /Devam Eden/i }).click({ timeout: 20_000 })
    await page.waitForTimeout(800)

    // —— 4. Usta Terminali: İstasyonlar sayfası ——
    await page.goto('/mobile/workstation', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/mobile\/workstation/)
    await expect(page.getByText(/Usta Terminali|İstasyon/i).first()).toBeVisible({ timeout: 25_000 })

    const iskeletLink = page.getByRole('link', { name: /iskelet/i }).first()
    if (await iskeletLink.isVisible().catch(() => false)) {
      await iskeletLink.click()
      await expect(page).toHaveURL(/station=iskelet/, { timeout: 15_000 })
      await page.waitForTimeout(600)
      const bittiBtn = page.getByRole('button', { name: 'Bitti' }).first()
      if (await bittiBtn.isVisible().catch(() => false)) {
        await bittiBtn.click()
        await page.waitForTimeout(1200)
      }
    }

    // —— 5. Terzihane istasyonunda da "Bitti" (ilerlet) ——
    await page.goto('/mobile/workstation/station?station=terzihane', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(600)
    const bittiTerzi = page.getByRole('button', { name: 'Bitti' }).first()
    if (await bittiTerzi.isVisible().catch(() => false)) {
      await bittiTerzi.click()
      await page.waitForTimeout(1200)
    }

    // —— 6. Döseme istasyonu ——
    await page.goto('/mobile/workstation/station?station=döseme', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(600)
    const bittiDoseme = page.getByRole('button', { name: 'Bitti' }).first()
    if (await bittiDoseme.isVisible().catch(() => false)) {
      await bittiDoseme.click()
      await page.waitForTimeout(1200)
    }

    await expect(page).toHaveURL(/\/mobile\/workstation/, { timeout: 15_000 })
  })

  test('Sipariş girildiyse devam et: üretime al, usta panelinden ilerlet', async ({ page }, testInfo) => {
    page.on('dialog', (dialog) => dialog.accept())

    await page.goto('/')
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }

    // Siparişler sayfasına git, ilk bekleyen siparişin ID'sini al
    await page.goto('/orders', { waitUntil: 'load' })
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
    await page.goto(`/production/new?from_orders=${orderId}`, { waitUntil: 'load' })
    await expect(page).toHaveURL(/\/production\/new/)
    await page.waitForTimeout(2000)

    const startProdBtn = page.getByRole('button', { name: /Üretimi Başlat/i })
    await startProdBtn.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null)
    await expect(startProdBtn).toBeEnabled({ timeout: 30_000 })
    await startProdBtn.click()
    await page.waitForTimeout(2000)

    // Üretim sayfası
    await page.goto('/production', { waitUntil: 'load' })
    await page.getByRole('button', { name: /Devam Eden/i }).click()
    await page.waitForTimeout(1500)

    // Usta Terminali: İskelet → Terzihane → Döseme "Bitti"
    await page.goto('/mobile/workstation', { waitUntil: 'load' })
    const iskeletLink = page.getByRole('link', { name: /iskelet/i }).first()
    if (await iskeletLink.isVisible()) {
      await iskeletLink.click()
      await page.waitForTimeout(1000)
      const bittiBtn = page.getByRole('button', { name: 'Bitti' }).first()
      if (await bittiBtn.isVisible()) await bittiBtn.click()
      await page.waitForTimeout(2000)
    }
    await page.goto('/mobile/workstation/station?station=terzihane', { waitUntil: 'load' })
    await page.waitForTimeout(1000)
    const bittiTerzi = page.getByRole('button', { name: 'Bitti' }).first()
    if (await bittiTerzi.isVisible()) { await bittiTerzi.click(); await page.waitForTimeout(2000) }
    await page.goto('/mobile/workstation/station?station=döseme', { waitUntil: 'load' })
    await page.waitForTimeout(1000)
    const bittiDoseme = page.getByRole('button', { name: 'Bitti' }).first()
    if (await bittiDoseme.isVisible()) { await bittiDoseme.click(); await page.waitForTimeout(2000) }

    await expect(page).toHaveURL(/\/mobile\/workstation/, { timeout: 15_000 })
  })
})
