/**
 * Stok hareketi / yevmiye referans tiplerinin Türkçe etiketleri.
 * Uygulama genelinde İngilizce referans kodu kullanıcıya Türkçe gösterilir.
 */
const REFERENCE_TYPE_LABELS: Record<string, string> = {
  // Stok / üretim
  production_order: 'Üretim Emri',
  production_order_return: 'Üretim Emri İadesi',
  production: 'Üretim',
  adjustment: 'Düzeltme',
  manual: 'Manuel',
  initial: 'İlk Stok',
  transfer: 'Transfer',
  // Satış / sevkiyat
  sale: 'Satış',
  shipment: 'Sevkiyat',
  shipment_item: 'Sevkiyat Kalemi',
  shipment_return: 'Sevkiyat İadesi',
  invoice: 'Fatura',
  // Satın alma
  purchase: 'Satın Alma',
  // Muhasebe / finans
  stock: 'Stok',
  payment: 'Ödeme',
  bank_deposit: 'Banka Yatırımı',
  equipment_purchase: 'Ekipman Alımı',
  depreciation: 'Amortisman',
  tax_payment: 'Vergi Ödemesi',
  loan: 'Kredi',
  loan_repayment: 'Kredi Geri Ödemesi',
  equity_contribution: 'Sermaye Girişi',
  retained_earnings: 'Dağıtılmamış Kâr',
  service_revenue: 'Hizmet Geliri',
  other_revenue: 'Diğer Gelir',
  other_expense: 'Diğer Gider',
  salary: 'Maaş',
  rent: 'Kira',
  utilities: 'Faturalar',
  supplies: 'Malzeme',
  interest: 'Faiz',
  dividend: 'Temettü',
  investment: 'Yatırım',
  equipment_sale: 'Ekipman Satışı',
}

/**
 * Referans tipi kodunu Türkçe etikete çevirir. Bilinmeyen kodlar olduğu gibi döner.
 */
export function getReferenceTypeLabel(referenceType: string | null | undefined): string {
  if (referenceType == null || referenceType === '') return '–'
  const key = String(referenceType).trim().toLowerCase()
  return REFERENCE_TYPE_LABELS[key] ?? REFERENCE_TYPE_LABELS[referenceType] ?? referenceType
}
