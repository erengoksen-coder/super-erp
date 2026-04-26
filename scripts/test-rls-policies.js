#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const requiredEnv = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RLS_TEST_USER1_TOKEN',
  'RLS_TEST_USER2_TOKEN',
  'RLS_TEST_USER1_ID',
  'RLS_TEST_USER2_ID',
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

const supabaseUser1 = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    global: {
      headers: {
        Authorization: `Bearer ${process.env.RLS_TEST_USER1_TOKEN}`,
      },
    },
  }
)

const supabaseUser2 = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    global: {
      headers: {
        Authorization: `Bearer ${process.env.RLS_TEST_USER2_TOKEN}`,
      },
    },
  }
)

const user1Id = process.env.RLS_TEST_USER1_ID
const user2Id = process.env.RLS_TEST_USER2_ID

async function run() {
  const testRunId = `rls-test-${Date.now()}`
  let productId
  let orderId
  let hasCreatedBy = false

  try {
    const { error: createdByCheckError } = await supabaseAdmin
      .from('production_orders')
      .select('created_by')
      .limit(1)

    if (!createdByCheckError) {
      hasCreatedBy = true
    } else if (
      createdByCheckError.message.includes("Could not find the 'created_by' column") ||
      createdByCheckError.message.includes('schema cache') ||
      createdByCheckError.message.includes('does not exist')
    ) {
      hasCreatedBy = false
    } else {
      throw new Error(`production_orders kontrol hatasi: ${createdByCheckError.message}`)
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .insert({
        sku: `RLS-${testRunId}`,
        name: `RLS Product ${testRunId}`,
      })
      .select('id')
      .single()

    if (productError) {
      throw new Error(`Urun olusturma hatasi: ${productError.message}`)
    }

    productId = product.id

    if (hasCreatedBy) {
      const { data: order, error: insertError } = await supabaseUser1
        .from('production_orders')
        .insert({
          order_number: `RLS-${testRunId}`,
          product_id: productId,
          quantity: 1,
          created_by: user1Id,
        })
        .select('id')
        .single()

      if (insertError) {
        throw new Error(`User1 insert hatasi: ${insertError.message}`)
      }

      orderId = order.id

      const { data: user1Orders, error: user1Error } = await supabaseUser1
        .from('production_orders')
        .select('id')
        .eq('id', orderId)

      if (user1Error) {
        throw new Error(`User1 select hatasi: ${user1Error.message}`)
      }

      const { data: user2Orders, error: user2Error } = await supabaseUser2
        .from('production_orders')
        .select('id')
        .eq('id', orderId)

      if (user2Error) {
        throw new Error(`User2 select hatasi: ${user2Error.message}`)
      }

      const { data: adminOrders, error: adminError } = await supabaseAdmin
        .from('production_orders')
        .select('id')
        .eq('id', orderId)

      if (adminError) {
        throw new Error(`Admin select hatasi: ${adminError.message}`)
      }

      const { error: updateError } = await supabaseUser2
        .from('production_orders')
        .update({ status: 'completed' })
        .eq('id', orderId)

      console.log('User1 sees:', user1Orders.length, 'orders')
      console.log('User2 sees:', user2Orders.length, 'orders')
      console.log('Admin sees:', adminOrders.length, 'orders')

      if (user1Orders.length !== 1) {
        throw new Error('User1 kendi kaydini goremedi.')
      }
      if (user2Orders.length !== 0) {
        throw new Error('User2 baska kullanicinin kaydini gorebildi.')
      }
      if (adminOrders.length !== 1) {
        throw new Error('Admin kaydi goremedi.')
      }
      if (!updateError) {
        throw new Error('User2 update islemi RLS ile engellenmedi.')
      }

      console.log('RLS testleri basarili.')
    } else {
      console.warn(
        'Uyari: production_orders.created_by bulunamadi. Read-only RLS testi calistiriliyor.'
      )

      const { data: user1Products, error: user1SelectError } = await supabaseUser1
        .from('products')
        .select('id')
        .eq('id', productId)

      if (user1SelectError) {
        throw new Error(`User1 products select hatasi: ${user1SelectError.message}`)
      }

      const { error: updateError } = await supabaseUser1
        .from('products')
        .update({ name: `RLS Update ${testRunId}` })
        .eq('id', productId)

      const { error: deleteError } = await supabaseUser1
        .from('products')
        .delete()
        .eq('id', productId)

      console.log('User1 sees products:', user1Products.length)

      if (user1Products.length !== 1) {
        throw new Error('User1 products kaydini goremedi.')
      }
      if (!updateError) {
        throw new Error('User1 products update islemi RLS ile engellenmedi.')
      }
      if (!deleteError) {
        throw new Error('User1 products delete islemi RLS ile engellenmedi.')
      }

      console.log('RLS read-only testleri basarili.')
    }
  } finally {
    if (orderId) {
      await supabaseAdmin.from('production_orders').delete().eq('id', orderId)
    }
    if (productId) {
      await supabaseAdmin.from('products').delete().eq('id', productId)
    }
  }
}

run().catch((error) => {
  console.error('RLS testleri basarisiz:', error.message)
  process.exit(1)
})
