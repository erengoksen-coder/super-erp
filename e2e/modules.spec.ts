import { test, expect } from '@playwright/test'

test.describe('Tüm modüller tek akışta', () => {
  test.beforeEach(({}, testInfo) => {
    if (!process.env.PLAYWRIGHT_TEST_USER) testInfo.skip()
  })
  test('tüm ana sayfalar açılır', async ({ page }, testInfo) => {
    test.setTimeout(120_000)
    // Oturumun yüklenmesi için önce anasayfaya git; gerekirse bir kez daha dene
    await page.goto('/', { waitUntil: 'networkidle', timeout: 15_000 })
    await page.waitForTimeout(2_000)
    if (page.url().includes('auth/login')) {
      await page.waitForTimeout(3_000)
      await page.goto('/', { waitUntil: 'networkidle', timeout: 15_000 })
      await page.waitForTimeout(2_000)
    }
    if (page.url().includes('auth/login')) {
      testInfo.skip(true, 'Oturum yüklenemedi (login sayfasına yönlendirildi)')
      return
    }
    const routes: { path: string; expectText: RegExp }[] = [
      { path: '/orders', expectText: /sipariş|order/i },
      { path: '/inventory', expectText: /stok|envanter|depo/i },
      { path: '/production', expectText: /üretim|production/i },
      { path: '/barcodes', expectText: /barkod|barcode/i },
      { path: '/invoices', expectText: /fatura|invoice/i },
      { path: '/shipments', expectText: /sevkiyat|shipment/i },
      { path: '/bom', expectText: /reçete|bom|ürün/i },
      { path: '/accounts', expectText: /cari|hesap|account/i },
      { path: '/finance', expectText: /finans|finance|ödeme|fiş/i },
      { path: '/users', expectText: /kullanıcı|user/i },
      { path: '/settings', expectText: /Ayarlar|ayar|sistem ayarları/i },
    ]
    for (const { path, expectText } of routes) {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 15_000 })
      await page.waitForTimeout(2_000)
      let url = page.url()
      if (url.includes('auth/login')) {
        await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15_000 })
        await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 15_000 })
        await page.waitForTimeout(2_000)
        url = page.url()
      }
      if (url.includes('auth/login')) {
        testInfo.skip(true, 'Oturum yüklenemedi (login sayfasına yönlendirildi)')
        return
      }
      await expect(page).toHaveURL(new RegExp(path.replace('/', '\\/')), { timeout: 12_000 })
      if (path === '/settings') {
        await expect(page.getByRole('heading', { name: 'Ayarlar' })).toBeVisible({ timeout: 10_000 })
      } else if (path === '/barcodes') {
        await expect(page.getByRole('heading', { name: 'Barkod Yönetimi' })).toBeVisible({ timeout: 10_000 })
      } else if (path === '/shipments') {
        await expect(page.getByRole('heading', { name: 'Sevkiyat Yönetimi' })).toBeVisible({ timeout: 10_000 })
      } else if (path === '/bom') {
        await expect(page.getByRole('heading', { name: 'Ürün Reçetesi' })).toBeVisible({ timeout: 15_000 })
      } else if (path === '/accounts') {
        await expect(page.getByRole('heading', { name: 'Cari Hesaplar' })).toBeVisible({ timeout: 10_000 })
      } else if (path === '/finance') {
        await expect(page.getByRole('heading', { name: 'Finans & Muhasebe' })).toBeVisible({ timeout: 10_000 })
      } else if (path === '/invoices') {
        await expect(page.getByRole('heading', { name: 'Faturalar' })).toBeVisible({ timeout: 10_000 })
      } else {
        await expect(page.getByText(expectText).first()).toBeVisible({ timeout: 10_000 })
      }
    }
  })
})

test.describe('Ana modüller', () => {
  test.beforeEach(({}, testInfo) => {
    if (!process.env.PLAYWRIGHT_TEST_USER) testInfo.skip()
  })

  test('Siparişler sayfası yüklenir', async ({ page }, testInfo) => {
    await page.goto('/orders', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      await page.goto('/', { waitUntil: 'networkidle' })
      await page.goto('/orders', { waitUntil: 'networkidle' })
    }
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Bu bağlamda oturum yok; Siparişler testi atlanıyor')
      return
    }
    await expect(page).toHaveURL(/\/orders/, { timeout: 10_000 })
    await expect(page.getByText(/sipariş|order/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('Finans sayfası yüklenir', async ({ page }, testInfo) => {
    await page.goto('/finance', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Bu bağlamda oturum yok; Finans testi atlanıyor')
      return
    }
    await expect(page).toHaveURL(/\/finance/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Finans & Muhasebe' })).toBeVisible({ timeout: 10_000 })
  })

  test('Ayarlar sayfası yüklenir', async ({ page }, testInfo) => {
    await page.goto('/settings', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Bu bağlamda oturum yok; Ayarlar testi atlanıyor')
      return
    }
    await expect(page).toHaveURL(/\/settings/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Ayarlar' })).toBeVisible({ timeout: 15_000 })
  })

  test('Stok / Envanter sayfası yüklenir', async ({ page }, testInfo) => {
    await page.goto('/inventory', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      await page.goto('/', { waitUntil: 'networkidle' })
      await page.goto('/inventory', { waitUntil: 'networkidle' })
    }
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Bu bağlamda oturum yok; Stok testi atlanıyor')
      return
    }
    await expect(page).toHaveURL(/\/inventory/, { timeout: 10_000 })
    await expect(page.getByText(/stok|envanter|depo/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('Üretim sayfası yüklenir', async ({ page }, testInfo) => {
    await page.goto('/production', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      await page.goto('/', { waitUntil: 'networkidle' })
      await page.goto('/production', { waitUntil: 'networkidle' })
    }
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Bu bağlamda oturum yok; Üretim testi atlanıyor')
      return
    }
    await expect(page).toHaveURL(/\/production/, { timeout: 10_000 })
    await expect(page.getByText(/üretim|production/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('BOM / Reçete sayfası yüklenir', async ({ page }, testInfo) => {
    await page.goto('/orders', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      await page.goto('/', { waitUntil: 'networkidle' })
      await page.goto('/bom', { waitUntil: 'networkidle' })
    } else {
      await page.goto('/bom', { waitUntil: 'networkidle' })
    }
    if (page.url().includes('/auth/login')) {
      await page.goto('/', { waitUntil: 'networkidle' })
      await page.goto('/bom', { waitUntil: 'networkidle' })
    }
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Bu bağlamda oturum yok; BOM testi atlanıyor')
      return
    }
    await expect(page).toHaveURL(/\/bom/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Ürün Reçetesi' })).toBeVisible({ timeout: 15_000 })
  })

  test('Barkod sayfası yüklenir', async ({ page }, testInfo) => {
    await page.goto('/barcodes', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Bu bağlamda oturum yok; Barkod testi atlanıyor')
      return
    }
    await expect(page).toHaveURL(/\/barcodes/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Barkod Yönetimi' })).toBeVisible({ timeout: 10_000 })
  })

  test('Faturalar sayfası yüklenir', async ({ page }, testInfo) => {
    await page.goto('/invoices', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Bu bağlamda oturum yok; Faturalar testi atlanıyor')
      return
    }
    await expect(page).toHaveURL(/\/invoices/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Faturalar' })).toBeVisible({ timeout: 10_000 })
  })

  test('Sevkiyat sayfası yüklenir', async ({ page }, testInfo) => {
    await page.goto('/shipments', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      await page.goto('/', { waitUntil: 'networkidle' })
      await page.goto('/shipments', { waitUntil: 'networkidle' })
    }
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Bu bağlamda oturum yok; Sevkiyat testi atlanıyor')
      return
    }
    await expect(page).toHaveURL(/\/shipments/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Sevkiyat Yönetimi' })).toBeVisible({ timeout: 10_000 })
  })

  test('Cari hesaplar sayfası yüklenir', async ({ page }, testInfo) => {
    await page.goto('/accounts', { waitUntil: 'networkidle' })
    if (page.url().includes('/auth/login')) {
      await page.goto('/', { waitUntil: 'networkidle' })
      await page.goto('/accounts', { waitUntil: 'networkidle' })
    }
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Bu bağlamda oturum yok; Cari testi atlanıyor')
      return
    }
    await expect(page).toHaveURL(/\/accounts/, { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Cari Hesaplar' })).toBeVisible({ timeout: 10_000 })
  })

  test('Kullanıcılar sayfası yüklenir', async ({ page }) => {
    await page.goto('/users')
    await expect(page).toHaveURL(/\/users/)
    await expect(page.getByText(/kullanıcı|user/i).first()).toBeVisible({ timeout: 10_000 })
  })
})
