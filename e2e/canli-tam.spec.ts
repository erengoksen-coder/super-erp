import { test, expect } from '@playwright/test'

/**
 * Komple canlı test: Tüm ana sayfalara gider, formlara test verisi girer.
 * Tek senaryo; tarayıcı açık çalıştırıp ekrandan izleyebilirsiniz.
 *
 * Çalıştırma: npm run test:e2e:tam (veya test:e2e:tam:yavas)
 * Önce: npm run dev:simple
 */
test.describe('Canlı tam test – tüm modüllere veri gir', () => {
  test.beforeEach(({}, testInfo) => {
    if (!process.env.PLAYWRIGHT_TEST_USER) testInfo.skip()
  })

  test('Tüm ana sayfalar ve formlara test verisi', async ({ page }, testInfo) => {
    test.setTimeout(300_000)
    page.on('dialog', (dialog) => dialog.accept())

    const delay = (ms: number) => page.waitForTimeout(ms)
    const go = async (path: string, wait = 2000) => {
      await page.goto(path, { waitUntil: 'networkidle' })
      await delay(wait)
    }

    await page.goto('/')
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }

    // —— 1. Dashboard ——
    await go('/')
    await expect(page.getByText(/hoş geldin|Kontrol Paneli|dashboard/i).first()).toBeVisible({ timeout: 15_000 })
    await delay(1500)

    // —— 2. Sipariş: Yeni Sipariş + veri ——
    await go('/orders')
    await page.getByRole('button', { name: 'Yeni Sipariş' }).click()
    await expect(page.getByRole('heading', { name: /Yeni Sipariş Oluştur/i })).toBeVisible({ timeout: 10_000 })
    const orderModal = page.locator('div.fixed.inset-0').filter({ has: page.getByRole('heading', { name: /Yeni Sipariş/i }) })
    await orderModal.getByPlaceholder('Bayi adı yazın...').fill('Canlı Tam Test Bayi')
    await orderModal.getByRole('textbox').nth(2).fill('Canlı Tam Test Müşteri')
    await orderModal.getByRole('textbox').nth(4).fill('atlas')
    await orderModal.locator('#order-configuration').fill('Klasik')
    await orderModal.locator('#order-fabric-code').fill('KUM-CANLI')
    await orderModal.getByRole('spinbutton').fill('1')
    await orderModal.locator('input[type="datetime-local"]').fill('2026-03-01T10:00')
    await orderModal.getByRole('button', { name: 'Sipariş Oluştur' }).click()
    await expect(page).toHaveURL(/\/orders/, { timeout: 15_000 })
    await delay(2000)

    // —— 3. Cari: Yeni cari ——
    await go('/accounts/new')
    await expect(page.getByRole('heading', { name: 'Yeni Cari Hesap' })).toBeVisible({ timeout: 10_000 })
    await page.getByPlaceholder('Müşteri veya tedarikçi adı').fill('Canlı Tam Test Cari')
    await page.locator('select').filter({ has: page.getByRole('option', { name: 'Müşteri' }) }).selectOption('customer')
    await page.getByPlaceholder('Örn: 100000').fill('60000')
    await page.getByPlaceholder('Telefon numarası').fill('05559876543')
    await page.getByPlaceholder('E-posta adresi').fill('canli-tam@test.local')
    await page.getByRole('button', { name: 'Kaydet' }).click()
    await expect(page).toHaveURL(/\/accounts/, { timeout: 15_000 })
    await delay(2000)

    // —— 4. Faturalar sayfası ——
    await go('/invoices')
    await expect(page.getByRole('heading', { name: 'Faturalar' })).toBeVisible({ timeout: 10_000 })
    await delay(1500)

    // —— 5. Ödemeler: Tahsilat/ödeme kaydı ——
    await go('/payments')
    await expect(page.getByRole('heading', { name: 'Ödemeler' })).toBeVisible({ timeout: 10_000 })
    const accountOptions = page.locator('select').first().locator('option')
    const optionCount = await accountOptions.count()
    if (optionCount > 1) {
      await page.locator('select').first().selectOption({ index: 1 })
      await delay(500)
      await page.getByPlaceholder('0.00').first().fill('1500')
      await page.getByRole('button', { name: /Ödeme Kaydet/i }).click()
      await delay(2000)
    }

    // —— 6. Stok / Hammadde: Yeni malzeme ——
    await go('/inventory/materials/new')
    await expect(page.getByRole('heading', { name: /Yeni Hammadde|Hammadde Ekle/i })).toBeVisible({ timeout: 10_000 })
    await page.getByPlaceholder('Örn: Kadife Kumaş').fill('Canlı Test Kumaş')
    await page.locator('select[name="unit"]').selectOption('metre')
    await page.getByRole('button', { name: 'Kaydet' }).click()
    await expect(page).toHaveURL(/\/inventory\/materials/, { timeout: 15_000 })
    await delay(2000)

    // —— 7. Malzemeler listesi (stok sekmesi) ——
    await go('/inventory/materials')
    await expect(page.getByText(/malzeme|stok|hammadde|envanter/i).first()).toBeVisible({ timeout: 10_000 })
    await delay(1500)

    // —— 8. Üretim ——
    await go('/production')
    await expect(page.getByText(/üretim|Üretim Yönetimi|Beklemede|Devam Eden/i).first()).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: /Devam Eden/i }).click().catch(() => {})
    await delay(1500)

    // —— 9. Sevkiyat ——
    await go('/shipments')
    await expect(page).toHaveURL(/\/shipments/)
    await delay(1500)

    // —— 10. Bildirimler ——
    await go('/notifications')
    await expect(page).toHaveURL(/\/notifications/)
    await delay(1500)

    // —— 11. Satın alma talepleri ——
    await go('/purchase-requests')
    await expect(page).toHaveURL(/\/purchase-requests/)
    await delay(1500)

    // —— 13. BOM (Ürün reçetesi) ——
    await go('/bom')
    await expect(page).toHaveURL(/\/bom/)
    await delay(1500)

    // —— 14. Raporlar / Stok hareketleri ——
    await go('/reports/stock-movements')
    await expect(page).toHaveURL(/\/reports\/stock-movements/)
    await delay(1500)

    // —— 15. Finans ana sayfa ——
    await go('/finance')
    await expect(page).toHaveURL(/\/finance/)
    await delay(1500)

    // —— 16. Usta Terminali (mobil) ——
    await go('/mobile/workstation')
    await expect(page.getByText(/Usta Terminali|İstasyon/i).first()).toBeVisible({ timeout: 10_000 })
    await delay(1500)

    await expect(page).toHaveURL(/\/mobile\/workstation/)
  })
})
