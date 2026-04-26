import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import { parseJsonBody } from '@/lib/api/validate'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('production_orders')
    .select('*, products(name, sku)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const normalized = (data || []).map((row: any) => ({
    ...row,
    product_name: row.products?.name ?? row.product_name ?? '-',
    sku: row.products?.sku ?? row.sku ?? null,
  }))

  return NextResponse.json(normalized)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await parseJsonBody(request as any)
  const { data: userData } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('production_orders')
    .insert({
      ...body,
      created_by: userData.user?.id,
    })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data, { status: 201 })
}
