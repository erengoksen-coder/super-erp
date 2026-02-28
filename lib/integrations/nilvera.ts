/**
 * Nilvera E-Fatura / E-Arşiv API İstemcisi
 * Dokümantasyon: https://www.nilvera.com/docs
 *
 * Ortamlar:
 *   Test: https://apitest.nilvera.com
 *   Canlı: https://api.nilvera.com
 */

export interface NilveraConfig {
    apiKey: string
    environment: 'test' | 'production'
    taxNumber?: string // Vergi numarası (VKN)
    companyAlias?: string // Firma etiket
}

export interface NilveraInvoice {
    InvoiceHeader: {
        InvoiceId?: string
        ProfileId: 'TEMELFATURA' | 'TICARIFATURA' | 'EARSIVFATURA'
        InvoiceTypeCode: 'SATIS' | 'IADE' | 'ISTISNA' | 'OZELMATRAH' | 'TEVKIFAT'
        IssueDate: string // YYYY-MM-DD
        CurrencyCode: string // TRY, USD, EUR
        LineCountNumeric: number
    }
    AccountingSupplierParty: {
        Party: {
            PartyIdentification: Array<{ SchemeID: string; Value: string }>
            PartyName: { Name: string }
            PostalAddress: {
                CityName: string
                CitySubdivisionName: string
                Country: { Name: string }
            }
        }
    }
    AccountingCustomerParty: {
        Party: {
            PartyIdentification: Array<{ SchemeID: string; Value: string }>
            PartyName: { Name: string }
            PostalAddress: {
                CityName: string
                CitySubdivisionName: string
                Country: { Name: string }
            }
        }
    }
    InvoiceLine: Array<{
        InvoicedQuantity: { Value: number; unitCode: string }
        LineExtensionAmount: { Value: number; currencyID: string }
        Item: { Name: string }
        Price: { PriceAmount: { Value: number; currencyID: string } }
        TaxTotal?: {
            TaxAmount: { Value: number; currencyID: string }
            TaxSubtotal: Array<{
                TaxableAmount: { Value: number; currencyID: string }
                TaxAmount: { Value: number; currencyID: string }
                Percent: number
                TaxCategory: { TaxScheme: { TaxTypeCode: string } }
            }>
        }
    }>
    TaxTotal?: {
        TaxAmount: { Value: number; currencyID: string }
    }
    LegalMonetaryTotal: {
        LineExtensionAmount: { Value: number; currencyID: string }
        TaxExclusiveAmount: { Value: number; currencyID: string }
        TaxInclusiveAmount: { Value: number; currencyID: string }
        PayableAmount: { Value: number; currencyID: string }
    }
}

export interface NilveraResponse {
    Data?: any
    IsSucceded?: boolean
    Message?: string
    Errors?: string[]
}

function getBaseUrl(env: 'test' | 'production'): string {
    return env === 'production'
        ? 'https://api.nilvera.com'
        : 'https://apitest.nilvera.com'
}

async function nilveraFetch(
    config: NilveraConfig,
    path: string,
    options: {
        method?: string
        body?: any
    } = {}
): Promise<NilveraResponse> {
    const baseUrl = getBaseUrl(config.environment)
    const url = `${baseUrl}${path}`

    const res = await fetch(url, {
        method: options.method || 'GET',
        headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    })

    if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Nilvera API hatası (${res.status}): ${errorText}`)
    }

    return res.json()
}

/**
 * E-Fatura gönder
 */
export async function sendEInvoice(
    config: NilveraConfig,
    invoice: NilveraInvoice
): Promise<NilveraResponse> {
    return nilveraFetch(config, '/einvoice/Send', {
        method: 'POST',
        body: invoice,
    })
}

/**
 * E-Arşiv fatura gönder
 */
export async function sendEArchiveInvoice(
    config: NilveraConfig,
    invoice: NilveraInvoice
): Promise<NilveraResponse> {
    return nilveraFetch(config, '/earchive/Send', {
        method: 'POST',
        body: invoice,
    })
}

/**
 * Fatura durumunu sorgula
 */
export async function getInvoiceStatus(
    config: NilveraConfig,
    uuid: string
): Promise<NilveraResponse> {
    return nilveraFetch(config, `/einvoice/Invoices/${uuid}`)
}

/**
 * Fatura PDF'ini al
 */
export async function getInvoicePdf(
    config: NilveraConfig,
    uuid: string
): Promise<ArrayBuffer> {
    const baseUrl = getBaseUrl(config.environment)
    const res = await fetch(`${baseUrl}/einvoice/Invoices/${uuid}/pdf`, {
        headers: { 'Authorization': `Bearer ${config.apiKey}` },
    })
    if (!res.ok) throw new Error(`PDF alınamadı: ${res.status}`)
    return res.arrayBuffer()
}

/**
 * GİB mükellef sorgusu (firma e-fatura mükellefi mi?)
 */
export async function checkTaxPayer(
    config: NilveraConfig,
    taxNumber: string
): Promise<NilveraResponse> {
    return nilveraFetch(config, `/einvoice/GibUsers/${taxNumber}`)
}

/**
 * Gelen faturaları listele
 */
export async function getIncomingInvoices(
    config: NilveraConfig,
    params?: { StartDate?: string; EndDate?: string }
): Promise<NilveraResponse> {
    let path = '/einvoice/Invoices/Incoming'
    if (params) {
        const qs = new URLSearchParams()
        if (params.StartDate) qs.set('StartDate', params.StartDate)
        if (params.EndDate) qs.set('EndDate', params.EndDate)
        path += '?' + qs.toString()
    }
    return nilveraFetch(config, path)
}

/**
 * ERP faturasını Nilvera formatına dönüştür
 */
export function mapInvoiceToNilvera(
    invoice: any,
    items: any[],
    supplier: { name: string; taxNumber: string; city: string; district: string },
    customer: { name: string; taxNumber: string; city: string; district: string },
    isEArchive: boolean = false
): NilveraInvoice {
    const lines = items.map((item: any) => ({
        InvoicedQuantity: { Value: item.quantity || 1, unitCode: 'C62' },
        LineExtensionAmount: { Value: item.amount || 0, currencyID: 'TRY' },
        Item: { Name: item.name || item.description || 'Ürün' },
        Price: { PriceAmount: { Value: item.unit_price || 0, currencyID: 'TRY' } },
        TaxTotal: {
            TaxAmount: { Value: item.tax_amount || 0, currencyID: 'TRY' },
            TaxSubtotal: [{
                TaxableAmount: { Value: item.amount || 0, currencyID: 'TRY' },
                TaxAmount: { Value: item.tax_amount || 0, currencyID: 'TRY' },
                Percent: item.tax_rate || 20,
                TaxCategory: { TaxScheme: { TaxTypeCode: '0015' } }, // KDV
            }],
        },
    }))

    const subtotal = items.reduce((s: number, i: any) => s + (i.amount || 0), 0)
    const totalTax = items.reduce((s: number, i: any) => s + (i.tax_amount || 0), 0)
    const total = subtotal + totalTax

    return {
        InvoiceHeader: {
            ProfileId: isEArchive ? 'EARSIVFATURA' : 'TEMELFATURA',
            InvoiceTypeCode: 'SATIS',
            IssueDate: invoice.invoice_date || new Date().toISOString().split('T')[0],
            CurrencyCode: 'TRY',
            LineCountNumeric: lines.length,
        },
        AccountingSupplierParty: {
            Party: {
                PartyIdentification: [{ SchemeID: 'VKN', Value: supplier.taxNumber }],
                PartyName: { Name: supplier.name },
                PostalAddress: {
                    CityName: supplier.city,
                    CitySubdivisionName: supplier.district,
                    Country: { Name: 'Türkiye' },
                },
            },
        },
        AccountingCustomerParty: {
            Party: {
                PartyIdentification: [{ SchemeID: 'VKN', Value: customer.taxNumber }],
                PartyName: { Name: customer.name },
                PostalAddress: {
                    CityName: customer.city,
                    CitySubdivisionName: customer.district,
                    Country: { Name: 'Türkiye' },
                },
            },
        },
        InvoiceLine: lines,
        TaxTotal: { TaxAmount: { Value: totalTax, currencyID: 'TRY' } },
        LegalMonetaryTotal: {
            LineExtensionAmount: { Value: subtotal, currencyID: 'TRY' },
            TaxExclusiveAmount: { Value: subtotal, currencyID: 'TRY' },
            TaxInclusiveAmount: { Value: total, currencyID: 'TRY' },
            PayableAmount: { Value: total, currencyID: 'TRY' },
        },
    }
}
