import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api/withAuth'
import { getDatabase } from '@/lib/database/db'
import { ok, fail } from '@/lib/api/response'
import { CACHE_HEADERS_SHORT } from '@/lib/api/cache'

/**
 * Bayi kullanıcısının cari hesabı: bakiye + son işlemler.
 * accounts.name = kullanıcının dealer_name.
 */
export const GET = withAuth(async (request: NextRequest, user: { userId: string; role: string }) => {
  const normalizedRole = (user.role || '').toString().trim().toLowerCase()
  if (normalizedRole !== 'bayi') {
    return fail('Bu alan sadece bayi kullanıcıları içindir', { status: 403 })
  }

  const db = getDatabase()
  const u = db.prepare('SELECT dealer_name FROM users WHERE id = ? AND deleted_at IS NULL').get(user.userId) as { dealer_name: string | null } | undefined
  const dealerName = (u?.dealer_name || '').trim()
  if (!dealerName) {
    return ok({ account: null, transactions: [] })
  }

  const account = db.prepare(`
    SELECT id, code, name, type, balance, risk_limit, tax_number, phone, email, address
    FROM accounts
    WHERE TRIM(name) = ? AND (deleted_at IS NULL OR deleted_at = '')
  `).get(dealerName) as { id: string; code: string; name: string; type: string; balance: number; risk_limit: number | null; tax_number: string | null; phone: string | null; email: string | null; address: string | null } | undefined

  if (!account) {
    return ok({ account: null, transactions: [] }, { headers: CACHE_HEADERS_SHORT })
  }

  const limit = Math.min(Math.max(1, parseInt(new URL(request.url).searchParams.get('limit') || '50', 10)), 100)
  const transactions = db.prepare(`
    SELECT at.id, at.transaction_type, at.amount, at.reference_type, at.reference_id, at.description, at.created_at
    FROM account_transactions at
    WHERE at.account_id = ?
    ORDER BY at.created_at DESC
    LIMIT ?
  `).all(account.id, limit) as any[]

  return ok(
    {
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        balance: account.balance,
        risk_limit: account.risk_limit,
        tax_number: account.tax_number,
        phone: account.phone,
        email: account.email,
        address: account.address,
      },
      transactions,
    },
    { headers: CACHE_HEADERS_SHORT }
  )
})
