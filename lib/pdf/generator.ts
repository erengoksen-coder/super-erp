/**
 * PDF Generator - Merkezi PDF Şablon Motoru
 * Fatura, İrsaliye ve Sevk Fişi PDF oluşturma
 * pdfmake kullanır
 */

// @ts-nocheck
import path from 'path'
import PdfPrinter from 'pdfmake'

const getVfs = () => {
    try {
        const vfsContent = require('pdfmake/build/vfs_fonts')
        if (vfsContent && vfsContent.pdfMake && vfsContent.pdfMake.vfs) {
            return vfsContent.pdfMake.vfs['Roboto-Regular.ttf']
        }
    } catch {
        return null
    }
    return null
}

const getFontPath = (fontName: string) => {
    return path.join(process.cwd(), 'node_modules', 'pdfmake', 'fonts', 'Roboto', fontName)
}

const fonts = {
    Roboto: {
        normal: getVfs()
            ? getFontPath('Roboto-Regular.ttf')
            : getFontPath('Roboto-Regular.ttf'),
        bold: getFontPath('Roboto-Medium.ttf'),
        italics: getFontPath('Roboto-Italic.ttf'),
        bolditalics: getFontPath('Roboto-MediumItalic.ttf'),
    },
}

let printer: any = null
function getPrinter() {
    if (!printer) printer = new PdfPrinter(fonts)
    return printer
}

function formatCurrency(amount: number | null | undefined): string {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount || 0)
}

function formatDate(date: string | null | undefined): string {
    if (!date) return '-'
    try {
        return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date))
    } catch { return date }
}

// ========== Ortak Layout ==========
function createHeader(title: string, docNumber: string, date: string) {
    const headerCols: any[] = []

    // Eger logo varsa goster
    if (logoBase64) {
        headerCols.push({
            image: logoBase64,
            width: 120,
            margin: [0, 0, 20, 0]
        })
    }

    // Firma bilgileri
    headerCols.push({
        width: '*',
        stack: [
            { text: 'LIVASOFA', style: 'companyName' },
            { text: 'Mobilya Üretim & Satış', style: 'companySubtitle' },
        ],
        margin: [0, 5, 0, 0]
    })

    // Belge bilgileri
    headerCols.push({
        width: 'auto',
        stack: [
            { text: title, style: 'docTitle', alignment: 'right' },
            { text: docNumber, style: 'docNumber', alignment: 'right' },
            { text: `Tarih: ${formatDate(date)}`, style: 'docDate', alignment: 'right' },
        ],
    })

    return {
        columns: headerCols,
        margin: [0, 0, 0, 20] as [number, number, number, number],
    }
}

function createCustomerBlock(customer: { name?: string; code?: string; address?: string; tax_number?: string; tax_office?: string }) {
    return {
        table: {
            widths: ['auto', '*'],
            body: [
                [{ text: 'Müşteri:', bold: true }, customer.name || '-'],
                [{ text: 'Cari Kodu:', bold: true }, customer.code || '-'],
                ...(customer.tax_number ? [[{ text: 'VKN/TCKN:', bold: true }, customer.tax_number]] : []),
                ...(customer.tax_office ? [[{ text: 'Vergi Dairesi:', bold: true }, customer.tax_office]] : []),
                ...(customer.address ? [[{ text: 'Adres:', bold: true }, customer.address]] : []),
            ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 15] as [number, number, number, number],
    }
}

const defaultStyles = {
    companyName: { fontSize: 18, bold: true, color: '#1a365d' },
    companySubtitle: { fontSize: 10, color: '#718096', margin: [0, 2, 0, 0] as number[] },
    docTitle: { fontSize: 16, bold: true, color: '#2d3748' },
    docNumber: { fontSize: 12, bold: true, color: '#4a5568', margin: [0, 4, 0, 0] as number[] },
    docDate: { fontSize: 10, color: '#718096', margin: [0, 4, 0, 0] as number[] },
    tableHeader: { bold: true, fontSize: 9, color: 'white', fillColor: '#2d3748' },
    tableCell: { fontSize: 9 },
    totalLabel: { bold: true, fontSize: 10, alignment: 'right' as const },
    totalValue: { bold: true, fontSize: 11, alignment: 'right' as const, color: '#1a365d' },
}
import fs from 'fs'

// Logo Base64 stringini hazirla (optimizasyon icin bir kere yukle)
let logoBase64: string | null = null
try {
    const logoPath = path.join(process.cwd(), 'public', 'logo.png')
    if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath)
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`
    }
} catch (e) {
    console.warn('PDF Logo yÃ¼klenemedi:', e)
}

function generatePdfBuffer(docDefinition: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const p = getPrinter()
            const doc = p.createPdfKitDocument(docDefinition)
            const chunks: Buffer[] = []
            doc.on('data', (chunk: Buffer) => chunks.push(chunk))
            doc.on('end', () => resolve(Buffer.concat(chunks)))
            doc.on('error', reject)
            doc.end()
        } catch (e) { reject(e) }
    })
}

// ========== FATURA PDF ==========
export async function generateInvoicePDF(invoice: any, items: any[], customer: any): Promise<Buffer> {
    const tableBody = [
        [
            { text: '#', style: 'tableHeader' },
            { text: 'Ürün', style: 'tableHeader' },
            { text: 'Miktar', style: 'tableHeader' },
            { text: 'Birim Fiyat', style: 'tableHeader' },
            { text: 'Toplam', style: 'tableHeader' },
        ],
        ...items.map((item: any, i: number) => [
            { text: String(i + 1), style: 'tableCell' },
            { text: item.product_name || item.description || '-', style: 'tableCell' },
            { text: String(item.quantity || 0), style: 'tableCell', alignment: 'center' },
            { text: formatCurrency(item.unit_price), style: 'tableCell', alignment: 'right' },
            { text: formatCurrency(item.total_price), style: 'tableCell', alignment: 'right' },
        ]),
    ]

    const docDef = {
        pageSize: 'A4' as const,
        pageMargins: [40, 40, 40, 60] as [number, number, number, number],
        content: [
            createHeader('FATURA', invoice.invoice_number || '-', invoice.invoice_date),
            createCustomerBlock(customer),
            {
                table: { headerRows: 1, widths: [25, '*', 50, 80, 80], body: tableBody },
                layout: {
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0.5,
                    hLineColor: () => '#e2e8f0',
                    vLineColor: () => '#e2e8f0',
                    paddingLeft: () => 6,
                    paddingRight: () => 6,
                    paddingTop: () => 4,
                    paddingBottom: () => 4,
                },
            },
            { text: '', margin: [0, 10, 0, 0] },
            {
                columns: [
                    { width: '*', text: '' },
                    {
                        width: 'auto',
                        table: {
                            body: [
                                [{ text: 'Ara Toplam:', style: 'totalLabel' }, { text: formatCurrency(invoice.total_amount), style: 'totalValue' }],
                                ...(invoice.discount_amount > 0 ? [[{ text: `İskonto (%${invoice.discount_rate || 0}):`, style: 'totalLabel' }, { text: `-${formatCurrency(invoice.discount_amount)}`, style: 'totalValue', color: '#e53e3e' }]] : []),
                                ...(invoice.tax_amount > 0 ? [[{ text: `KDV (%${invoice.tax_rate || 0}):`, style: 'totalLabel' }, { text: formatCurrency(invoice.tax_amount), style: 'totalValue' }]] : []),
                                [{ text: 'GENEL TOPLAM:', style: 'totalLabel', fontSize: 12 }, { text: formatCurrency(invoice.final_amount), style: 'totalValue', fontSize: 14, color: '#2b6cb0' }],
                            ],
                        },
                        layout: 'noBorders',
                    },
                ],
            },
            ...(invoice.notes ? [{ text: `Not: ${invoice.notes}`, margin: [0, 20, 0, 0], fontSize: 9, color: '#718096' }] : []),
        ],
        styles: defaultStyles,
        footer: (currentPage: number, pageCount: number) => ({
            text: `Sayfa ${currentPage} / ${pageCount} — LIVASOFA ERP`,
            alignment: 'center' as const,
            fontSize: 8,
            color: '#a0aec0',
            margin: [40, 10, 40, 0] as number[],
        }),
    }

    return generatePdfBuffer(docDef)
}

// ========== İRSALİYE PDF ==========
export async function generateWaybillPDF(waybill: any, items: any[], customer: any): Promise<Buffer> {
    const tableBody = [
        [
            { text: '#', style: 'tableHeader' },
            { text: 'Ürün Kodu', style: 'tableHeader' },
            { text: 'Ürün Adı', style: 'tableHeader' },
            { text: 'Miktar', style: 'tableHeader' },
            { text: 'Birim', style: 'tableHeader' },
        ],
        ...items.map((item: any, i: number) => [
            { text: String(i + 1), style: 'tableCell' },
            { text: item.product_sku || '-', style: 'tableCell' },
            { text: item.product_name || '-', style: 'tableCell' },
            { text: String(item.quantity || 0), style: 'tableCell', alignment: 'center' },
            { text: item.unit || 'ADET', style: 'tableCell' },
        ]),
    ]

    const docDef = {
        pageSize: 'A4' as const,
        pageMargins: [40, 40, 40, 60] as [number, number, number, number],
        content: [
            createHeader('SEVK İRSALİYESİ', waybill.waybill_number || '-', waybill.waybill_date),
            createCustomerBlock(customer),
            // Nakliye bilgileri
            {
                table: {
                    widths: ['auto', '*', 'auto', '*'],
                    body: [
                        [
                            { text: 'Şoför:', bold: true }, waybill.driver_name || '-',
                            { text: 'Araç Plakası:', bold: true }, waybill.vehicle_plate || '-',
                        ],
                        [
                            { text: 'Teslimat Adresi:', bold: true, colSpan: 1 }, { text: waybill.delivery_address || '-', colSpan: 3 }, {}, {},
                        ],
                    ],
                },
                layout: 'noBorders',
                margin: [0, 0, 0, 15] as [number, number, number, number],
            },
            {
                table: { headerRows: 1, widths: [25, 80, '*', 50, 50], body: tableBody },
                layout: {
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0.5,
                    hLineColor: () => '#e2e8f0',
                    vLineColor: () => '#e2e8f0',
                    paddingLeft: () => 6,
                    paddingRight: () => 6,
                    paddingTop: () => 4,
                    paddingBottom: () => 4,
                },
            },
            {
                columns: [
                    { width: '*', text: '' },
                    { width: 'auto', text: `Toplam Miktar: ${waybill.total_quantity || items.reduce((s: number, i: any) => s + (i.quantity || 0), 0)}`, bold: true, fontSize: 11, margin: [0, 10, 0, 0] },
                ],
            },
            ...(waybill.notes ? [{ text: `Not: ${waybill.notes}`, margin: [0, 20, 0, 0], fontSize: 9, color: '#718096' }] : []),
            // İmza alanları
            {
                columns: [
                    { width: '*', stack: [{ text: '', margin: [0, 50, 0, 0] }, { text: '______________________', alignment: 'center' }, { text: 'Teslim Eden', alignment: 'center', fontSize: 9, margin: [0, 4, 0, 0] }] },
                    { width: '*', stack: [{ text: '', margin: [0, 50, 0, 0] }, { text: '______________________', alignment: 'center' }, { text: 'Teslim Alan', alignment: 'center', fontSize: 9, margin: [0, 4, 0, 0] }] },
                ],
                margin: [0, 30, 0, 0] as [number, number, number, number],
            },
        ],
        styles: defaultStyles,
        footer: (currentPage: number, pageCount: number) => ({
            text: `Sayfa ${currentPage} / ${pageCount} — LIVASOFA ERP`,
            alignment: 'center' as const,
            fontSize: 8,
            color: '#a0aec0',
            margin: [40, 10, 40, 0] as number[],
        }),
    }

    return generatePdfBuffer(docDef)
}

// ========== SEVK FİŞİ PDF ==========
export async function generateShipmentPDF(shipment: any, items: any[], customer: any): Promise<Buffer> {
    const tableBody = [
        [
            { text: '#', style: 'tableHeader' },
            { text: 'Ürün Kodu', style: 'tableHeader' },
            { text: 'Ürün Adı', style: 'tableHeader' },
            { text: 'Miktar', style: 'tableHeader' },
            { text: 'Birim Fiyat', style: 'tableHeader' },
            { text: 'Toplam', style: 'tableHeader' },
        ],
        ...items.map((item: any, i: number) => [
            { text: String(i + 1), style: 'tableCell' },
            { text: item.product_sku || '-', style: 'tableCell' },
            { text: item.product_name || '-', style: 'tableCell' },
            { text: String(item.quantity || 0), style: 'tableCell', alignment: 'center' },
            { text: formatCurrency(item.unit_price), style: 'tableCell', alignment: 'right' },
            { text: formatCurrency((item.quantity || 0) * (item.unit_price || 0)), style: 'tableCell', alignment: 'right' },
        ]),
    ]

    const docDef = {
        pageSize: 'A4' as const,
        pageMargins: [40, 40, 40, 60] as [number, number, number, number],
        content: [
            createHeader('SEVK FİŞİ', shipment.shipment_number || '-', shipment.shipment_date),
            createCustomerBlock(customer),
            {
                table: { headerRows: 1, widths: [25, 70, '*', 45, 70, 70], body: tableBody },
                layout: {
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0.5,
                    hLineColor: () => '#e2e8f0',
                    vLineColor: () => '#e2e8f0',
                    paddingLeft: () => 6,
                    paddingRight: () => 6,
                    paddingTop: () => 4,
                    paddingBottom: () => 4,
                },
            },
            ...(shipment.notes ? [{ text: `Not: ${shipment.notes}`, margin: [0, 15, 0, 0], fontSize: 9, color: '#718096' }] : []),
        ],
        styles: defaultStyles,
        footer: (currentPage: number, pageCount: number) => ({
            text: `Sayfa ${currentPage} / ${pageCount} — LIVASOFA ERP`,
            alignment: 'center' as const,
            fontSize: 8,
            color: '#a0aec0',
            margin: [40, 10, 40, 0] as number[],
        }),
    }

    return generatePdfBuffer(docDef)
}
