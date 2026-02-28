import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database/db'

export async function GET() {
    try {
        const db = getDatabase()

        // Ödenmemiş faturalar + vade analizi
        const rows = db.prepare(`
      SELECT 
        a.id as account_id,
        a.name as account_name,
        a.code as account_code,
        i.id as invoice_id,
        i.invoice_number,
        i.total_amount,
        i.invoice_date,
        i.due_date,
        CAST(julianday('now') - julianday(COALESCE(i.due_date, i.invoice_date)) AS INTEGER) as days_overdue
      FROM invoices i
      LEFT JOIN accounts a ON i.customer_id = a.id
      WHERE i.deleted_at IS NULL
        AND i.status != 'paid'
        AND i.type = 'sales'
      ORDER BY days_overdue DESC
    `).all() as any[]

        // Yaşlandırma grupları
        const aging = {
            current: { count: 0, amount: 0, accounts: [] as any[] },      // 0-30 gün
            thirtyDay: { count: 0, amount: 0, accounts: [] as any[] },     // 30-60 gün  
            sixtyDay: { count: 0, amount: 0, accounts: [] as any[] },      // 60-90 gün
            ninetyPlus: { count: 0, amount: 0, accounts: [] as any[] },    // 90+ gün
        }

        const accountMap = new Map<string, any>()

        for (const row of rows) {
            const days = row.days_overdue || 0
            const key = days <= 30 ? 'current' : days <= 60 ? 'thirtyDay' : days <= 90 ? 'sixtyDay' : 'ninetyPlus'
            aging[key].count++
            aging[key].amount += row.total_amount || 0

            if (!accountMap.has(`${row.account_id}-${key}`)) {
                accountMap.set(`${row.account_id}-${key}`, {
                    account_id: row.account_id,
                    account_name: row.account_name || 'Bilinmeyen',
                    account_code: row.account_code,
                    amount: 0,
                    invoice_count: 0,
                })
            }
            const acc = accountMap.get(`${row.account_id}-${key}`)!
            acc.amount += row.total_amount || 0
            acc.invoice_count++
        }

        // Her grup için account toplamlarını ata
        for (const [key, acc] of accountMap) {
            const group = key.split('-').pop()!
            if (group in aging) {
                (aging as any)[group].accounts.push(acc)
            }
        }

        // Her grupta account'ları tutara göre sırala
        for (const group of Object.values(aging)) {
            group.accounts.sort((a: any, b: any) => b.amount - a.amount)
        }

        const totalOverdue = rows.reduce((s, r) => s + (r.total_amount || 0), 0)

        return NextResponse.json({
            data: {
                aging,
                totalOverdue,
                totalInvoices: rows.length,
            }
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
