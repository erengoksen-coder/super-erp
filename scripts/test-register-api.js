/**
 * Canlı kayıt API testi - role "yönetici" ve "manager" ile dener
 * Kullanım: node scripts/test-register-api.js [BASE_URL]
 * Örnek: node scripts/test-register-api.js https://unexercisable-rickie-refreshful.ngrok-free.dev
 */
const base = process.argv[2] || 'http://localhost:3000'
const url = base.replace(/\/$/, '') + '/api/auth/register'

const testUser = {
  username: 'test_' + Date.now(),
  password: 'Test1234',
  full_name: 'Test Kullanici',
  email: 'test' + Date.now() + '@test.local',
  role: 'yönetici',  // Türkçe - API veya istemci bunu manager'a çevirmeli
}

async function run() {
  console.log('Kayit API testi:', url)
  console.log('Gönderilen body:', JSON.stringify(testUser, null, 2))
  console.log('')

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    })
    const data = await res.json().catch(() => ({}))
    console.log('HTTP', res.status)
    console.log('Yanit:', JSON.stringify(data, null, 2))
    if (res.ok) {
      console.log('\nOK: Kayit basarili.')
    } else {
      console.log('\nHATA:', data?.error || data?.message || res.statusText)
    }
  } catch (err) {
    console.error('Hata:', err.message)
  }
}

run()
