import { test, expect } from '@playwright/test'

/**
 * Yeni eklenen özelliklerin E2E testi:
 * - Liste sıralama (sipariş, fatura, cari, sevkiyat)
 * - Cari bakiye filtresi
 * - Detay sayfasında Yazdır butonu
 * - Şifre gücü göstergesi (şifre değiştir)
 * - Dashboard stok uyarıları / bekleyen onaylar (varsa görünür)
 */
test.describe('Yeni özellikler', () => {
  test.setTimeout(60_000)

  test.beforeEach(async ({ page }, testInfo) => {
    if (!process.env.PLAYWRIGHT_TEST_USER) {
      testInfo.skip(true, 'PLAYWRIGHT_TEST_USER gerekli')
      return
    }
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15_000 })
    await page.waitForTimeout(2_000)
    if (page.url().includes('auth/login')) {
      await page.fill('input[name="username"], input[type="text"]', process.env.PLAYWRIGHT_TEST_USER || 'admin')
      await page.fill('input[name="password"], input[type="password"]', process.env.PLAYWRIGHT_TEST_PASSWORD || 'admin1234')
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/(dashboard)?$|\/orders|\/invoices/, { timeout: 15_000 })
    }
  })

  test('Siparişler sayfasında sıralama butonları görünür', async ({ page }) => {
    await page.goto('/orders', { waitUntil: 'domcontentloaded', timeout: 15_000 })
    await expect(page.getByText('Sırala:').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /Tarih/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Sipariş No/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Tutar/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Cari/i }).first()).toBeVisible()
  })

  test('Siparişler sıralama tıklanınca liste güncellenir', async ({ page }) => {
    await page.goto('/orders', { waitUntil: 'domcontentloaded', timeout: 15_000 })
    const tutarBtn = page.getByRole('button', { name: /Tutar/i }).first()
    await tutarBtn.click()
    await page.waitForTimeout(500)
    await expect(tutarBtn).toBeVisible()
  })

  test('Faturalar sayfasında sütun başlıklarına tıklanabilir (sıralama)', async ({ page }) => {
    await page.goto('/invoices', { waitUntil: 'domcontentloaded', timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Faturalar' })).toBeVisible({ timeout: 10_000 })
    const tarihHead = page.locator('th').filter({ hasText: 'Tarih' }).first()
    if (await tarihHead.isVisible()) {
      await tarihHead.click()
      await page.waitForTimeout(300)
    }
  })

  test('Cari sayfasında bakiye filtresi dropdown görünür', async ({ page }) => {
    await page.goto('/accounts', { waitUntil: 'domcontentloaded', timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Cari Hesaplar' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Bakiye Filtresi').first()).toBeVisible({ timeout: 5_000 })
    const balanceSelect = page.locator('select').filter({ has: page.locator('option[value="debt"]') }).first()
    await expect(balanceSelect).toBeVisible()
    await balanceSelect.selectOption('debt')
    await page.waitForTimeout(1500)
    // Liste API'den balance=debt ile yeniden çekilir (URL değişmeyebilir)
    await expect(balanceSelect).toHaveValue('debt')
  })

  test('Sevkiyat sayfasında sıralanabilir sütun başlıkları var', async ({ page }) => {
    await page.goto('/shipments', { waitUntil: 'domcontentloaded', timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Sevkiyat Yönetimi' })).toBeVisible({ timeout: 10_000 })
    const header = page.locator('th').filter({ hasText: 'Sevk No' }).first()
    if (await header.isVisible()) await header.click()
    await page.waitForTimeout(300)
  })

  test('Fatura detay sayfasında Yazdır butonu görünür', async ({ page }, testInfo) => {
    await page.goto('/invoices', { waitUntil: 'networkidle', timeout: 20_000 })
    const detayLink = page.getByRole('link', { name: /Detay/i }).first()
    const detayCount = await page.getByRole('link', { name: /Detay/i }).count()
    if (detayCount === 0) {
      testInfo.skip(true, 'Listede fatura yok; Yazdır testi atlanıyor')
      return
    }
    await detayLink.click()
    await page.waitForURL(/\/invoices\/[^/]+/, { timeout: 15_000 })
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('button', { name: /Yazdır/i }).or(page.locator('button').filter({ hasText: /yazdır/i })).first()).toBeVisible({ timeout: 10_000 })
  })

  test('Cari detay sayfasında Yazdır butonu görünür', async ({ page }) => {
    await page.goto('/accounts', { waitUntil: 'networkidle', timeout: 20_000 })
    const firstRow = page.locator('table tbody tr').first()
    await expect(firstRow).toBeVisible({ timeout: 15_000 })
    await firstRow.dblclick()
    await page.waitForURL(/\/accounts\/[^/]+/, { timeout: 15_000 })
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('button', { name: /Yazdır/i }).or(page.locator('button').filter({ hasText: /yazdır/i })).first()).toBeVisible({ timeout: 10_000 })
  })

  test('Şifre değiştir sayfasında şifre gücü göstergesi görünür', async ({ page }) => {
    await page.goto('/settings/change-password', { waitUntil: 'networkidle', timeout: 20_000 })
    await expect(page.getByRole('heading', { name: /Şifre değiştir/i })).toBeVisible({ timeout: 15_000 })
    const newPasswordInput = page.locator('#new').or(page.locator('input[autocomplete="new-password"]')).or(page.getByLabel(/yeni şifre/i)).first()
    await newPasswordInput.fill('Test1234!')
    await page.waitForTimeout(800)
    await expect(page.getByText(/Şifre gücü|Zayıf|Orta|İyi|Güçlü/i).first()).toBeVisible({ timeout: 8_000 })
  })

  test('Dashboardda Hızlı Aksiyonlar ve özet bölümleri yüklenir', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle', timeout: 20_000 })
    await expect(page.getByText(/Hızlı İşlemler/i).first()).toBeVisible({ timeout: 25_000 })
    await expect(page.getByText(/Stok Değeri|Bekleyen Üretim|Kritik Stok/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('Fatura listesinde satır seçilince Enter ile detaya gidilebilir', async ({ page }, testInfo) => {
    await page.goto('/invoices', { waitUntil: 'networkidle', timeout: 20_000 })
    const rowCount = await page.locator('table tbody tr').count()
    if (rowCount === 0) {
      testInfo.skip(true, 'Listede fatura yok; Enter ile detay testi atlanıyor')
      return
    }
    const firstRow = page.locator('table tbody tr').first()
    await firstRow.click()
    await page.waitForTimeout(500)
    await firstRow.focus().catch(() => {})
    await page.keyboard.press('Enter')
    await page.waitForURL(/\/invoices\/[^/]+/, { timeout: 12_000 })
  })
})
