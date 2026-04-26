/**
 * Son görüntülenen kayıtlar (cari, fatura vb.) — localStorage tabanlı.
 */

const STORAGE_KEY = 'erp_recent_views'
const MAX_ITEMS = 8

export type RecentViewItem = {
  type: 'account' | 'invoice' | 'production'
  id: string
  label: string
  href: string
}

function getStored(): RecentViewItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function setStored(items: RecentViewItem[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
  } catch {}
}

/** Son görüntülenen listesine ekle (aynı href varsa en başa taşır). */
export function pushRecent(item: RecentViewItem): void {
  const list = getStored()
  const filtered = list.filter((x) => x.href !== item.href)
  setStored([item, ...filtered])
}

/** Son görüntülenen listesini döndür. */
export function getRecentViews(): RecentViewItem[] {
  return getStored()
}
