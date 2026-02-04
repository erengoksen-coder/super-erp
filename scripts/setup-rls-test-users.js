#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const { randomBytes } = require('crypto')

const requiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RLS_TEST_USER1_EMAIL',
  'RLS_TEST_USER2_EMAIL',
]

const missing = requiredEnv.filter((key) => !process.env[key])
if (missing.length > 0) {
  console.error('Eksik ortam degiskenleri:', missing.join(', '))
  process.exit(1)
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

function generatePassword() {
  return `Rls!${randomBytes(12).toString('hex')}`
}

async function findUserByEmail(email) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  })

  if (error) {
    throw new Error(`Kullanici listeleme hatasi: ${error.message}`)
  }

  return data.users.find((user) => user.email === email) || null
}

async function ensureUser(email, password) {
  const existing = await findUserByEmail(email)
  if (existing) {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      existing.id,
      { password, email_confirm: true }
    )

    if (error) {
      throw new Error(`Kullanici guncelleme hatasi (${email}): ${error.message}`)
    }

    return { user: data.user, password, created: false, updated: true }
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    throw new Error(`Kullanici olusturma hatasi (${email}): ${error.message}`)
  }

  return { user: data.user, password, created: true, updated: false }
}

async function signIn(email, password) {
  const { data, error } = await supabaseAnon.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(`Giris hatasi (${email}): ${error.message}`)
  }

  if (!data.session?.access_token) {
    throw new Error(`Token alinmadi (${email}).`)
  }

  return data.session.access_token
}

async function run() {
  const user1Email = process.env.RLS_TEST_USER1_EMAIL
  const user2Email = process.env.RLS_TEST_USER2_EMAIL

  const user1Password = process.env.RLS_TEST_USER1_PASSWORD || generatePassword()
  const user2Password = process.env.RLS_TEST_USER2_PASSWORD || generatePassword()

  const user1 = await ensureUser(user1Email, user1Password)
  const user2 = await ensureUser(user2Email, user2Password)

  const user1Token = await signIn(user1Email, user1Password)
  const user2Token = await signIn(user2Email, user2Password)

  console.log('RLS test kullanicilari hazir.')
  console.log('')
  console.log('RLS_TEST_USER1_ID=' + user1.user.id)
  console.log('RLS_TEST_USER2_ID=' + user2.user.id)
  console.log('RLS_TEST_USER1_TOKEN=' + user1Token)
  console.log('RLS_TEST_USER2_TOKEN=' + user2Token)

  if (!process.env.RLS_TEST_USER1_PASSWORD || !process.env.RLS_TEST_USER2_PASSWORD) {
    console.log('')
    console.log('Parolalar (saklayin):')
    console.log('RLS_TEST_USER1_PASSWORD=' + user1Password)
    console.log('RLS_TEST_USER2_PASSWORD=' + user2Password)
  }

  if (user1.created || user2.created || user1.updated || user2.updated) {
    console.log('')
    console.log('Test kullanicilari guncellendi veya olusturuldu.')
  }
}

run().catch((error) => {
  console.error('RLS test kullanicisi kurulumu basarisiz:', error.message)
  process.exit(1)
})
