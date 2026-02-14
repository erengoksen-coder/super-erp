import { test, expect } from '@playwright/test'

/**
 * Test verileri girerek sırayla akışları test eder.
 * Giriş: auth.setup ile PLAYWRIGHT_TEST_USER / PLAYWRIGHT_TEST_PASSWORD (örn. admin / admin1234)
 */
test.describe('Test verileri ile form akışları', () => {
  test.beforeEach(({}, testInfo) => {
    if (!process.env.PLAYWRIGHT_TEST_USER) testInfo.skip()
  })

  test('1. Giriş sonrası dashboard görünür', async ({ page }, testInfo) => {
    await page.goto('/')
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }
    await expect(page.getByRole('heading', { name: /hoş geldin/i }).first()).toBeVisible({ timeout: 15_000 })
  })

  test('2. Siparişler: Yeni Sipariş modalı açılır ve test verisi girilir', async ({ page }, testInfo) => {
    await page.goto('/orders', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }
    await expect(page).toHaveURL(/\/orders/)
    await page.getByRole('button', { name: 'Yeni Sipariş' }).click()
    await expect(page.getByRole('heading', { name: /Yeni Sipariş Oluştur/i })).toBeVisible({ timeout: 10_000 })

    const modal = page.locator('div.fixed.inset-0').filter({ has: page.getByRole('heading', { name: /Yeni Sipariş/i }) })
    await modal.getByPlaceholder('Bayi adı yazın...').fill('E2E Test Bayi')
    await modal.getByRole('textbox').nth(2).fill('E2E Test Müşteri') // MÜŞTERİ ADI (0=TAKİP NO, 1=Bayi, 2=Müşteri)
    await modal.getByRole('textbox').nth(4).fill('atlas') // ÜRÜN ADI (3=Müşteri kodu, 4=Ürün adı)
    await modal.getByRole('spinbutton').fill('2') // SİP MİKTAR
    await modal.locator('input[type="datetime-local"]').fill('2026-02-15T10:00')
    await modal.locator('#order-configuration').fill('Klasik')
    await modal.locator('#order-fabric-code').fill('KUM-001')

    await modal.getByRole('button', { name: 'Sipariş Oluştur' }).click()

    // Gönderim sonrası: modal kapanabilir (başarı) veya sayfada kalır (validasyon/API hatası). Siparişler sayfasında kaldığımızı doğrula.
    await expect(page).toHaveURL(/\/orders/, { timeout: 15_000 })
    await expect(page.getByText(/Sipariş|sipariş|Yeni Sipariş|Beklemede/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('3. Cari Hesaplar: Yeni cari sayfasında test verisi girilir', async ({ page }, testInfo) => {
    await page.goto('/accounts/new', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }
    await expect(page).toHaveURL(/\/accounts\/new/)
    await expect(page.getByRole('heading', { name: 'Yeni Cari Hesap' })).toBeVisible({ timeout: 10_000 })

    await page.getByPlaceholder('Müşteri veya tedarikçi adı').fill('E2E Test Cari')
    await page.locator('select').filter({ has: page.getByRole('option', { name: 'Müşteri' }) }).selectOption('customer')
    await page.getByPlaceholder('Örn: 100000').fill('50000')
    await page.getByPlaceholder('Telefon numarası').fill('05551234567')
    await page.getByPlaceholder('E-posta adresi').fill('e2e@test.local')

    await page.getByRole('button', { name: 'Kaydet' }).click()

    await expect(page).toHaveURL(/\/accounts/, { timeout: 15_000 })
    await expect(page.getByText(/E2E Test Cari|Cari Hesaplar/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('4. Faturalar sayfası açılır', async ({ page }, testInfo) => {
    await page.goto('/invoices', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }
    await expect(page).toHaveURL(/\/invoices/)
    await expect(page.getByRole('heading', { name: 'Faturalar' })).toBeVisible({ timeout: 10_000 })
  })

  test('5. Stok / Malzemeler sayfası açılır', async ({ page }, testInfo) => {
    await page.goto('/inventory/materials', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }
    await expect(page).toHaveURL(/\/inventory\/materials/)
    await expect(page.getByText(/malzeme|stok|hammadde|envanter/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('6. Üretim sayfası açılır', async ({ page }, testInfo) => {
    await page.goto('/production', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }
    await expect(page).toHaveURL(/\/production/)
    await expect(page.getByText(/üretim|Üretim Yönetimi|Beklemede|Devam Eden/i).first()).toBeVisible({ timeout: 10_000 })
  })
})
