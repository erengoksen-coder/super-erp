import path from 'path'
import { test as setup, expect } from '@playwright/test'
import * as fs from 'fs'

const authDir = path.join(process.cwd(), 'e2e', '.auth')
const authFile = path.join(authDir, 'user.json')
if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })
const user = process.env.PLAYWRIGHT_TEST_USER
const pass = process.env.PLAYWRIGHT_TEST_PASSWORD

setup('giriş yap ve oturumu kaydet', async ({ page }) => {
  if (!user || !pass) {
    setup.skip()
    return
  }
  await page.goto('/auth/login')
  await expect(page.getByPlaceholder('Kullanıcı adınızı girin')).toBeVisible({ timeout: 15_000 })
  await page.getByPlaceholder('Kullanıcı adınızı girin').fill(user)
  await page.getByPlaceholder('Şifrenizi girin').fill(pass)
  await page.getByRole('button', { name: 'Giriş Yap' }).click()
  await expect(page).toHaveURL(/\/(dashboard)?(\?|$)/, { timeout: 15_000 })
  await expect(
    page.getByRole('heading', { name: /hoş geldin|kontrol paneli|dashboard/i }).first()
  ).toBeVisible({ timeout: 15_000 })
  await page.waitForLoadState('networkidle')
  // Oturumun yazılması için bekle: cookie (auth-token) veya localStorage
  await page.waitForFunction(() => !!window.localStorage.getItem('auth-token'), { timeout: 10_000 }).catch(() => null)
  // Cookie'nin set edilmesi için kısa bekleme (API Set-Cookie sonrası)
  await new Promise((r) => setTimeout(r, 1200))
  // Cookie varsa doğrula (middleware auth-token veya access_token kullanıyor)
  const cookies = await page.context().cookies()
  const hasAuthCookie = cookies.some((c) => c.name === 'auth-token' || c.name === 'access_token')
  if (!hasAuthCookie) {
    await new Promise((r) => setTimeout(r, 1000))
  }
  await page.context().storageState({ path: authFile })

  const raw = fs.readFileSync(authFile, 'utf-8')
  const state = JSON.parse(raw) as { cookies?: unknown[]; origins?: { origin: string; localStorage?: { name: string; value: string }[] }[] }
  const hasCookies = Array.isArray(state.cookies) && state.cookies.length > 0
  const hasStorage = Array.isArray(state.origins) && state.origins.some((o) => o.localStorage?.some((e) => e.name === 'auth-token'))
  if (!hasCookies && !hasStorage) {
    await new Promise((r) => setTimeout(r, 1500))
    await page.context().storageState({ path: authFile })
    const raw2 = fs.readFileSync(authFile, 'utf-8')
    const state2 = JSON.parse(raw2) as { origins?: { origin: string; localStorage?: { name: string; value: string }[] }[] }
    const hasStorage2 = Array.isArray(state2.origins) && state2.origins.some((o) => o.localStorage?.some((e) => e.name === 'auth-token'))
    expect(hasStorage2 || hasCookies, 'Auth state (auth-token) kaydedilmedi; E2E oturum kullanılamaz').toBe(true)
  }
})
