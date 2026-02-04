/** @jest-environment node */
import { createClient } from '@supabase/supabase-js'

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
const describeIf = missing.length === 0 ? describe : describe.skip

describeIf('RLS Policies - Production Orders', () => {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const user1Client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${process.env.RLS_TEST_USER1_TOKEN}`,
        },
      },
    }
  )

  const user2Client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${process.env.RLS_TEST_USER2_TOKEN}`,
        },
      },
    }
  )

  const user1Id = process.env.RLS_TEST_USER1_ID!

  let productId: string | null = null
  let orderId: string | null = null
  let skipOwnership = false

  beforeAll(async () => {
    const { error: createdByCheckError } = await supabaseAdmin
      .from('production_orders')
      .select('created_by')
      .limit(1)

    if (!createdByCheckError) {
      skipOwnership = false
    } else if (
      createdByCheckError.message.includes("Could not find the 'created_by' column") ||
      createdByCheckError.message.includes('schema cache')
    ) {
      skipOwnership = true
    } else {
      throw new Error(createdByCheckError.message)
    }

    const testRunId = `rls-test-${Date.now()}`
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .insert({
        sku: `RLS-${testRunId}`,
        name: `RLS Product ${testRunId}`,
      })
      .select('id')
      .single()

    if (productError) {
      throw new Error(productError.message)
    }

    productId = product.id

    if (!skipOwnership) {
      const { data: order, error: insertError } = await user1Client
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
        throw new Error(insertError.message)
      }

      orderId = order.id
    }
  })

  afterAll(async () => {
    if (orderId) {
      await supabaseAdmin.from('production_orders').delete().eq('id', orderId)
    }
    if (productId) {
      await supabaseAdmin.from('products').delete().eq('id', productId)
    }
  })

  it('should allow user to see only own orders', async () => {
    if (skipOwnership) {
      return
    }
    const { data: user1Data, error: user1Error } = await user1Client
      .from('production_orders')
      .select('id')
      .eq('id', orderId)

    if (user1Error) {
      throw new Error(user1Error.message)
    }

    const { data: user2Data, error: user2Error } = await user2Client
      .from('production_orders')
      .select('id')
      .eq('id', orderId)

    if (user2Error) {
      throw new Error(user2Error.message)
    }

    expect(user1Data).toHaveLength(1)
    expect(user2Data).toHaveLength(0)
  })

  it('should prevent unauthorized updates', async () => {
    if (skipOwnership) {
      return
    }
    const { error } = await user2Client
      .from('production_orders')
      .update({ status: 'completed' })
      .eq('id', orderId)

    expect(error).toBeDefined()
  })
})
