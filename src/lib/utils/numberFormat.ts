/**
 * Sayıları Türk Lirası formatında biçimlendirir
 */
export function formatCurrency(amount: number | string | null | undefined): string {
    const value = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0)
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value)
}

/**
 * Sayıları binlik ayırıcı ile biçimlendirir
 */
export function formatNumber(amount: number | string | null | undefined): string {
    const value = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0)
    return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(value)
}
