import { getDatabase } from '@/lib/database/db'

/**
 * Bayi kullanıcısının bağlı olduğu cari/bayi adını döner.
 * Bayi değilse veya dealer_name yoksa null döner.
 * Bu fonksiyon, API endpointlerinde veri filtrelemesi için kullanılır.
 */
export function getBayiDealerName(userId: string, role: string): string | null {
    const normalizedRole = (role || '').toString().trim().toLowerCase()
    if (normalizedRole !== 'bayi') return null

    try {
        const db = getDatabase()
        const user = db.prepare(
            'SELECT dealer_name, full_name FROM users WHERE id = ? AND deleted_at IS NULL'
        ).get(userId) as { dealer_name?: string | null; full_name?: string | null } | undefined

        if (!user) return null

        // Önce dealer_name'e bak, yoksa full_name kullan
        const dealerName = (user.dealer_name || user.full_name || '').trim()
        return dealerName || null
    } catch {
        return null
    }
}

/**
 * Bayi kullanıcısı için SQL WHERE koşulu ve parametreleri üretir.
 * @param userId - Kullanıcı ID
 * @param role - Kullanıcı rolü
 * @param dealerColumn - SQL'deki dealer/customer sütunu (ör: 'o.dealer_name')
 * @returns { clause: string, params: string[] } - Boş string döner eğer filtre gerekmiyorsa
 */
export function bayiFilter(
    userId: string,
    role: string,
    dealerColumn = 'o.dealer_name'
): { clause: string; params: string[] } {
    const dealerName = getBayiDealerName(userId, role)
    if (!dealerName) {
        return { clause: '', params: [] }
    }
    return {
        clause: ` AND (${dealerColumn} = ? COLLATE NOCASE OR ${dealerColumn} LIKE ? COLLATE NOCASE)`,
        params: [dealerName, `%${dealerName}%`],
    }
}
