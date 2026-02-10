import { NextRequest } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { withAuth } from '@/lib/api/withAuth'
import { ok, fail } from '@/lib/api/response'
import { accountsRepo } from '@/lib/repositories/accounts'
import { getDatabase } from '@/lib/database/db'

type AccountIdRow = {
  id: string
  type?: string | null
  tax_number?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  risk_limit?: number | null
  discount_rate?: number | null
  authorized_person_name?: string | null
  authorized_person_phone?: string | null
}

type AccountUpdateInput = {
  name?: string
  type?: string
  tax_number?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  risk_limit?: number | null
  discount_rate?: number | null
  authorized_person_name?: string | null
  authorized_person_phone?: string | null
  updated_by?: string | null
}

// GET: Tek cari hesap detayı (bayi sadece /api/bayi/account ile kendi carisini görür)
export const GET = withAuth(async (
  request: NextRequest,
  user: { role?: string },
  context?: unknown
) => {
  const role = (user?.role ?? '').toString().trim().toLowerCase()
  if (role === 'bayi') {
    return fail('Bayi kullanıcıları cari düzenleme sayfasına erişemez. Cari Hesabım sayfasında sadece bilgi görüntüleyebilirsiniz.', { status: 403 })
  }
  try {
    const resolvedParams = await Promise.resolve(
      (context as { params?: { id?: string } | Promise<{ id?: string }> } | undefined)?.params
    )
    const accountId = resolvedParams?.id ?? new URL(request.url).pathname.split('/').filter(Boolean).pop()
    if (!accountId) {
      return fail('ID gerekli', { status: 400 })
    }

    const account = accountsRepo.getById(accountId)

    if (!account) {
      return fail('Cari hesap bulunamadı', { status: 404 })
    }

    return ok(account)
  } catch (error: any) {
    // Hata mesajını Türkçe'ye çevir
    let errorMessage = error.message || 'Bilinmeyen hata'
    if (errorMessage.includes('no such column')) {
      errorMessage = 'Veritabanı kolonu bulunamadı. Lütfen veritabanını güncelleyin.'
    } else if (errorMessage.includes('not found') || errorMessage.includes('bulunamadı')) {
      errorMessage = 'Cari hesap bulunamadı'
    }
    return fail(errorMessage, { status: 500 })
  }
});

// PUT: Cari hesap güncelle (bayi sadece görüntüleme, düzenleme yapamaz)
export const PUT = withAuth(async (
  request: NextRequest,
  user: { userId: string; role?: string },
  context?: unknown
) => {
  const role = (user?.role ?? '').toString().trim().toLowerCase()
  if (role === 'bayi') {
    return fail('Bayi kullanıcıları cari düzenleyemez', { status: 403 })
  }
  try {
    const resolvedParams = await Promise.resolve(
      (context as { params?: { id?: string } | Promise<{ id?: string }> } | undefined)?.params
    )
    const accountId = resolvedParams?.id ?? new URL(request.url).pathname.split('/').filter(Boolean).pop()
    if (!accountId) {
      return fail('ID gerekli', { status: 400 })
    }
    const applyDiscountToShipments = new URL(request.url).searchParams.get('apply_discount_to_shipments') === '1' ||
      new URL(request.url).searchParams.get('apply_discount_to_shipments') === 'true'
    const body = await parseJsonBody(request) as AccountUpdateInput
    const { name, type, tax_number, phone, email, address, risk_limit, discount_rate, authorized_person_name, authorized_person_phone, updated_by } = body

    // İskonto oranı string veya number gelebilir; sayıya çevir (boş/NaN ise null)
    let discountRateValue: number | null = null
    if (body && Object.prototype.hasOwnProperty.call(body, 'discount_rate')) {
      const raw = (body as any).discount_rate
      if (typeof raw === 'number' && !Number.isNaN(raw)) discountRateValue = raw
      else if (typeof raw === 'string' && raw.trim() !== '') {
        const parsed = parseFloat(raw.trim().replace(',', '.'))
        if (!Number.isNaN(parsed)) discountRateValue = parsed
      }
    }

    // Cari hesabın var olup olmadığını kontrol et (mevcut iskonto vb. korumak için tam kayıt alınır)
    const existingAccount = accountsRepo.getById(accountId) as AccountIdRow | undefined
    if (!existingAccount) {
      return fail('Cari hesap bulunamadı', { status: 404 })
    }

    if (!name) {
      return fail('Müşteri/Tedarikçi adı gerekli', { status: 400 })
    }

    // Kaydedildiğinde gönderilen tüm alanlar güncel haliyle kabul edilir; alanlar birbirine bağlı değildir, zorunlu birlikte güncelleme yok
    accountsRepo.update(accountId, {
      name,
      type: type || existingAccount.type || null,
      tax_number: tax_number ?? null,
      phone: phone ?? null,
      email: email ?? null,
      address: address ?? null,
      risk_limit: risk_limit ?? null,
      discount_rate: discountRateValue ?? null,
      authorized_person_name: authorized_person_name ?? null,
      authorized_person_phone: authorized_person_phone ?? null,
      updated_by,
    })

    // Bir seferlik: iskonto oranını bu carinin tüm sevkiyat fişlerine uygula
    if (applyDiscountToShipments && discountRateValue != null) {
      const db = getDatabase()
      const newRate = Number(discountRateValue) || 0
      const shipments = db.prepare(`
        SELECT id, shipment_number, total_amount, discount_rate, discount_amount, tax_rate, tax_amount, final_amount
        FROM shipments WHERE customer_id = ? AND deleted_at IS NULL
      `).all(accountId) as Array<{
        id: string; shipment_number: string; total_amount: number; discount_rate: number | null;
        discount_amount: number | null; tax_rate: number | null; tax_amount: number | null; final_amount: number | null;
      }>
      db.transaction(() => {
        for (const s of shipments) {
          const totalAmount = s.total_amount ?? 0
          const newDiscountAmount = (totalAmount * newRate) / 100
          const amountAfterDiscount = totalAmount - newDiscountAmount
          const taxRate = s.tax_rate ?? 0
          const newTaxAmount = (amountAfterDiscount * taxRate) / 100
          const newFinalAmount = amountAfterDiscount + newTaxAmount
          db.prepare(`
            UPDATE shipments SET discount_rate = ?, discount_amount = ?, tax_amount = ?, final_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
          `).run(newRate, newDiscountAmount, newTaxAmount, newFinalAmount, s.id)

          const items = db.prepare(`
            SELECT id, quantity, unit_price, total_price
            FROM shipment_items WHERE shipment_id = ? AND (deleted_at IS NULL OR deleted_at = '')
          `).all(s.id) as Array<{ id: string; quantity: number; unit_price: number | null; total_price: number | null }>
          for (const item of items) {
            const unitPrice = item.unit_price ?? 0
            const itemTotalBefore = unitPrice * (item.quantity || 0)
            const itemDiscountAmount = (itemTotalBefore * newRate) / 100
            const newItemTotal = itemTotalBefore - itemDiscountAmount
            db.prepare(`UPDATE shipment_items SET total_price = ? WHERE id = ?`).run(newItemTotal, item.id)

            const itemTaxAmount = amountAfterDiscount > 0 ? (newItemTotal / amountAfterDiscount) * newTaxAmount : 0
            const itemFinalAmount = newItemTotal + itemTaxAmount
            const productRow = db.prepare(`
              SELECT p.name as product_name, p.sku as product_sku FROM shipment_items si
              JOIN active_products p ON si.product_id = p.id WHERE si.id = ?
            `).get(item.id) as { product_name?: string; product_sku?: string } | undefined
            const productName = productRow?.product_name || 'Ürün'
            const productSku = productRow?.product_sku || ''
            let description = `Sevkiyat: ${s.shipment_number} | Ürün: ${productName}${productSku ? ` (${productSku})` : ''} | Adet: ${item.quantity} | Birim Fiyat (BOM): ${unitPrice.toFixed(2)} ₺`
            if (newRate > 0 && itemDiscountAmount > 0) {
              description += ` | İskonto: %${newRate.toFixed(2)} (${itemDiscountAmount.toFixed(2)} ₺)`
            }
            if (taxRate > 0 && itemTaxAmount > 0) {
              description += ` | KDV: %${taxRate.toFixed(2)} (${itemTaxAmount.toFixed(2)} ₺)`
            }
            description += ` | Toplam: ${itemFinalAmount.toFixed(2)} ₺`
            db.prepare(`
              UPDATE account_transactions SET amount = ?, description = ? WHERE reference_type = 'shipment_item' AND reference_id = ?
            `).run(itemFinalAmount, description, item.id)
          }
        }
        // Cari bakiye = tüm debit - tüm credit (bu hesap için)
        const balanceRow = db.prepare(`
          SELECT COALESCE(SUM(CASE WHEN transaction_type = 'debit' THEN amount ELSE 0 END), 0) -
                 COALESCE(SUM(CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END), 0) AS balance
          FROM account_transactions WHERE account_id = ?
        `).get(accountId) as { balance: number }
        db.prepare(`UPDATE accounts SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(balanceRow.balance, accountId)
      })
    }

    return ok(null, {
      message: applyDiscountToShipments
        ? 'Cari hesap güncellendi; iskonto oranı sevkiyat fişlerine uygulandı.'
        : 'Cari hesap güncellendi'
    })
  } catch (error: any) {
    // Hata mesajını Türkçe'ye çevir
    let errorMessage = error.message || 'Bilinmeyen hata'
    if (errorMessage.includes('no such column')) {
      errorMessage = 'Veritabanı kolonu bulunamadı. Lütfen veritabanını güncelleyin.'
    } else if (errorMessage.includes('UNIQUE constraint')) {
      errorMessage = 'Bu kod zaten kullanılıyor. Lütfen farklı bir kod seçin.'
    } else if (errorMessage.includes('FOREIGN KEY')) {
      errorMessage = 'İlişkili kayıt bulunamadı.'
    } else if (errorMessage.includes('NOT NULL')) {
      errorMessage = 'Zorunlu alanlar eksik.'
    }
    return fail(errorMessage, { status: 500 })
  }
});

// DELETE: Cari hesap sil (bayi sadece görüntüleme, silme yapamaz)
export const DELETE = withAuth(async (
  request: NextRequest,
  user: { userId: string; role?: string },
  context?: unknown
) => {
  const role = (user?.role ?? '').toString().trim().toLowerCase()
  if (role === 'bayi') {
    return fail('Bayi kullanıcıları cari silemez', { status: 403 })
  }
  try {
    const resolvedParams = await Promise.resolve(
      (context as { params?: { id?: string } | Promise<{ id?: string }> } | undefined)?.params
    )
    const accountId = resolvedParams?.id ?? new URL(request.url).pathname.split('/').filter(Boolean).pop()
    if (!accountId) {
      return fail('ID gerekli', { status: 400 })
    }

    // Cari hesabın var olup olmadığını kontrol et
    const existingAccount = accountsRepo.getById(accountId)
    if (!existingAccount) {
      return fail('Cari hesap bulunamadı', { status: 404 })
    }

    const isAdmin = ['admin', 'yönetici', 'yonetici'].includes((user.role || '').toString().trim().toLowerCase())
    if (!isAdmin) {
      // Admin değilse: cari hesabın kullanılıp kullanılmadığını kontrol et
      const usage = accountsRepo.getUsageCounts(accountId, existingAccount.name)
      if (usage.usedInMaterials > 0 || usage.usedInOrders > 0) {
        return fail('Bu cari hesap kullanılıyor, silinemez', { status: 400 })
      }
    }

    // Sil
    accountsRepo.delete(accountId)

    return ok(null, { message: 'Cari hesap silindi' })
  } catch (error: any) {
    // Hata mesajını Türkçe'ye çevir
    let errorMessage = error.message || 'Bilinmeyen hata'
    if (errorMessage.includes('no such column')) {
      errorMessage = 'Veritabanı kolonu bulunamadı. Lütfen veritabanını güncelleyin.'
    } else if (errorMessage.includes('kullanılıyor')) {
      errorMessage = 'Bu cari hesap kullanılıyor, silinemez'
    }
    return fail(errorMessage, { status: 500 })
  }
});

