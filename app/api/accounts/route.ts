import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/api/response'
import { CACHE_HEADERS_SHORT } from '@/lib/api/cache'
import { accountsRepo } from '@/lib/repositories/accounts'

type AccountInput = {
  name?: string
  type?: string
  tax_number?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  created_by?: string | null
}

// GET: Tüm cari hesapları listele
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'customer' veya 'supplier'

    const accounts = accountsRepo.getAll(type)
    return ok(accounts, { headers: CACHE_HEADERS_SHORT })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
}

// POST: Yeni cari hesap oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as AccountInput
    const { name, type = 'customer', tax_number, phone, email, address, created_by } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Müşteri/Tedarikçi adı gerekli' },
        { status: 400 }
      )
    }

    // Kod oluştur
    const lastCode = accountsRepo.getLastCode(type)
    
    let codeNumber = 1
    if (lastCode) {
      const lastNum = parseInt(lastCode.replace(/[^0-9]/g, '')) || 0
      codeNumber = lastNum + 1
    }
    
    const prefix = type === 'customer' ? 'MUS' : 'TED'
    const code = `${prefix}-${String(codeNumber).padStart(4, '0')}`
    
    const id = `acc-${Date.now()}-${Math.random().toString(36).substring(7)}`
    
    accountsRepo.insert({
      id,
      code,
      name,
      type,
      tax_number,
      phone,
      email,
      address,
      created_by,
    })

    return ok({ id, code }, { message: 'Cari hesap oluşturuldu' })
  } catch (error: any) {
    return fail(error.message, { status: 500 })
  }
}


