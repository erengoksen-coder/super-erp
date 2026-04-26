/**
 * Yevmiye referans tipine göre ilgili sayfa linki
 */
export function getReferenceLink(
  referenceType: string,
  referenceId: string | null | undefined
): { href: string; label: string } | null {
  if (!referenceId || !referenceType || referenceType === 'manual') return null
  const id = String(referenceId).trim()
  if (!id) return null
  switch (referenceType) {
    case 'sale':
    case 'invoice':
      return { href: `/invoices/${id}`, label: `Fatura` }
    case 'shipment':
      return { href: `/shipments/${id}`, label: `Sevkiyat` }
    case 'production':
      return { href: `/production/${id}`, label: `Üretim` }
    case 'purchase':
      return { href: `/invoices/${id}`, label: `Fatura` }
    default:
      return null
  }
}
