import { test, expect } from '@playwright/test'

test.describe('Smoke (giriş gerekmez)', () => {
  test('login sayfası açılır ve form görünür', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page).toHaveURL(/\/auth\/login/)
    await expect(page.getByPlaceholder('Kullanıcı adınızı girin')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByPlaceholder('Şifrenizi girin')).toBeVisible()
    await expect(page.getByRole('button', { name: 'GİRİŞ PORTALI' })).toBeVisible()
  })

  test('anasayfa yönlendirme: giriş yoksa login\'e gider', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/(auth\/login|auth\/login\?)/)
  })

  test('hatalı giriş: yanlış şifre ile hata mesajı görünür', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByPlaceholder('Kullanıcı adınızı girin')).toBeVisible({ timeout: 10_000 })
    await page.getByPlaceholder('Kullanıcı adınızı girin').fill('olmayan_kullanici')
    await page.getByPlaceholder('Şifrenizi girin').fill('yanlis_sifre')
    await page.getByRole('button', { name: 'GİRİŞ PORTALI' }).click()
    await expect(page).toHaveURL(/\/auth\/login/)
    await expect(
      page.getByText(/hatalı|geçersiz|bulunamadı|başarısız|incorrect|invalid/i)
    ).toBeVisible({ timeout: 10_000 })
  })
})
