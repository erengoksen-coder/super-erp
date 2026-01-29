import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/api/response'
import { accountsRepo } from '@/lib/repositories/accounts'

type AccountIdRow = {
  id: string
  type?: string | null
}

type AccountUpdateInput = {
  name?: string
  type?: string
  tax_number?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  risk_limit?: number | null
  updated_by?: string | null
}

// GET: Tek cari hesap detayı
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const accountId = resolvedParams.id

    const account = accountsRepo.getById(accountId)

    if (!account) {
      return fail('Cari hesap bulunamadı', { status: 404 })
    }

    return ok(account)
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
}

// PUT: Cari hesap güncelle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const accountId = resolvedParams.id
    const body = await request.json() as AccountUpdateInput
    const { name, type, tax_number, phone, email, address, risk_limit, updated_by } = body

    // Cari hesabın var olup olmadığını kontrol et
    const existingAccount = accountsRepo.getById(accountId) as AccountIdRow | undefined
    if (!existingAccount) {
      return fail('Cari hesap bulunamadı', { status: 404 })
    }

    if (!name) {
      return fail('Müşteri/Tedarikçi adı gerekli', { status: 400 })
    }

    // Güncelle
    accountsRepo.update(accountId, {
      name,
      type: type || existingAccount.type || null,
      tax_number,
      phone,
      email,
      address,
      risk_limit: risk_limit ?? null,
      updated_by,
    })

    return ok(null, { message: 'Cari hesap güncellendi' })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
}

// DELETE: Cari hesap sil
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const accountId = resolvedParams.id

    // Cari hesabın var olup olmadığını kontrol et
    const existingAccount = accountsRepo.getById(accountId)
    if (!existingAccount) {
      return fail('Cari hesap bulunamadı', { status: 404 })
    }

    // Cari hesabın kullanılıp kullanılmadığını kontrol et (materials, orders, vb.)
    const usage = accountsRepo.getUsageCounts(accountId, existingAccount.name)
    
    if (usage.usedInMaterials > 0 || usage.usedInOrders > 0) {
      return fail('Bu cari hesap kullanılıyor, silinemez', { status: 400 })
    }

    // Sil
    accountsRepo.delete(accountId)

    return ok(null, { message: 'Cari hesap silindi' })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
}

