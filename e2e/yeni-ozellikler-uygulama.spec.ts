import { test, expect } from '@playwright/test'

/**
 * Son eklenen özelliklerin hızlı doğrulaması:
 * - Satış Siparişleri: sayfa + sıralanabilir tablo başlıkları
 * - KDV/Vergi raporu: sayfa + tarih filtresi (Bugün vb.)
 * - Cari / Siparişler: klavye kısayolları sayfa açıldığı için UI hazır
 */
test.describe('Yeni özellikler (güncellemeler)', () => {
  test.beforeEach(({}, testInfo) => {
    if (!process.env.PLAYWRIGHT_TEST_USER) testInfo.skip()
  })

  test('Satış Siparişleri sayfası açılır ve tablo başlıkları (sıralama) görünür', async ({ page }, testInfo) => {
    await page.goto('/sales-orders', { waitUntil: 'networkidle', timeout: 15_000 })
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }
    await expect(page.getByRole('heading', { name: /Satış Siparişleri/i })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Sipariş No').first()).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Tarih').first()).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Müşteri').first()).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Tutar').first()).toBeVisible({ timeout: 5_000 })
  })

  test('KDV / Vergi Özeti raporu açılır ve tarih filtresi (Bugün, Bu ay) görünür', async ({ page }, testInfo) => {
    await page.goto('/reports/tax-summary', { waitUntil: 'networkidle', timeout: 15_000 })
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }
    await expect(page.getByRole('heading', { name: /KDV|Vergi/i })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /Güncelle/i })).toBeVisible({ timeout: 5_000 })
    const presetSelect = page.locator('select').filter({ hasNot: page.locator('[multiple]') }).first()
    await expect(presetSelect).toBeVisible({ timeout: 5_000 })
    await expect(presetSelect.locator('option:has-text("Bugün")')).toHaveCount(1)
  })

  test('Siparişler sayfasında Yeni Sipariş butonu ve liste görünür', async ({ page }, testInfo) => {
    await page.goto('/orders', { waitUntil: 'networkidle', timeout: 15_000 })
    if (page.url().includes('/auth/login')) {
      testInfo.skip(true, 'Oturum yok')
      return
    }
    await expect(page.getByRole('button', { name: /Yeni Sipariş/i })).toBeVisible({ timeout: 10_000 })
  })
})
