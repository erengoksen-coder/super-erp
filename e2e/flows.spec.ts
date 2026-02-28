import { test, expect } from '@playwright/test'

test.describe('Kullanıcı akışları (auth gerekli)', () => {
  test.beforeEach(({}, testInfo) => {
    if (!process.env.PLAYWRIGHT_TEST_USER) testInfo.skip()
  })

  test('anasayfada hoş geldin veya kontrol paneli görünür', async ({ page }, testInfo) => {
    await page.goto('/')
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }
    await expect(
      page.getByRole('heading', { name: /hoş geldin|kontrol paneli|dashboard/i }).or(page.getByText(/hoş geldin/i))
    ).toBeVisible({ timeout: 10_000 })
  })

  test('dashboard\'da stok veya üretim widget\'ı görünür', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }
    await expect(
      page.getByText(/Stok Değeri|Bekleyen Üretim|Kritik Stok|Stok Durumu|Üretim Durumu|Sipariş Takibi/i).first()
    ).toBeVisible({ timeout: 15_000 })
  })

  test('siparişler sayfasından sevkiyat sayfasına sidebar ile gidilir', async ({ page }, testInfo) => {
    await page.goto('/orders', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }
    await expect(page).toHaveURL(/\/orders/)
    await page.getByRole('link', { name: 'Sevkiyat' }).first().click()
    await expect(page).toHaveURL(/\/shipments/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Sevkiyat Yönetimi' })).toBeVisible({ timeout: 10_000 })
  })

  test('stok sayfasında depo veya hammadde içeriği görünür', async ({ page }, testInfo) => {
    await page.goto('/inventory', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }
    await expect(page).toHaveURL(/\/inventory/)
    await expect(
      page.getByText(/stok|envanter|depo|hammadde|mamül/i).first()
    ).toBeVisible({ timeout: 10_000 })
  })

  test('siparişler sayfasında Yeni Sipariş modalı açılır', async ({ page }, testInfo) => {
    await page.goto('/orders', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }
    await expect(page).toHaveURL(/\/orders/)
    await page.getByRole('button', { name: 'Yeni Sipariş' }).click()
    await expect(
      page.getByRole('heading', { name: /Yeni Sipariş Oluştur|Sipariş Düzenle/i })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('barkod tarama sayfası açılır ve okut alanı görünür', async ({ page }, testInfo) => {
    await page.goto('/barcodes/scan', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }
    await expect(page).toHaveURL(/\/barcodes\/scan/)
    await expect(
      page.getByRole('heading', { name: /Barkod|QR Kod Okut/i })
    ).toBeVisible({ timeout: 10_000 })
  })

  test('faturalar sayfası açılır ve liste veya başlık görünür', async ({ page }, testInfo) => {
    await page.goto('/invoices', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/invoices/, { timeout: 15_000 })
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }
    await expect(page.getByText(/Faturalar|fatura listesi|Toplam kayıt|\d+ fatura/).first()).toBeVisible({ timeout: 20_000 })
  })

  test('cari hesaplar sayfası açılır', async ({ page }, testInfo) => {
    await page.goto('/accounts', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }
    await expect(page).toHaveURL(/\/accounts/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Cari Hesaplar' })).toBeVisible({ timeout: 10_000 })
  })

  test('çıkış yapıldığında login sayfasına gidilir', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Çıkış' }).click()
    await expect(page.getByPlaceholder('Kullanıcı adınızı girin')).toBeVisible({ timeout: 20_000 })
    await expect(page).toHaveURL(/(auth\/login\/?|\/)$/, { timeout: 5000 })
  })
})
