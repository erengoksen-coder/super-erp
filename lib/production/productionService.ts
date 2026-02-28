import { getDatabase, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID, DEFAULT_WAREHOUSE_ID } from '@/lib/database/db'
import { resolveUnitFactor } from '@/lib/units'
import { randomUUID } from 'crypto'
import { logger } from '@/lib/utils/logger'
import { applyMaterialStockChange } from '@/lib/materials/stock'
import { logAudit } from '@/lib/audit'
import { Database } from 'better-sqlite3'

export interface CreateProductionOrderParams {
    order_number: string
    product_id: string
    quantity: number
    due_date?: string | null
    actor_id: string
}

export interface BatchConversionParams {
    order_ids: string[]
    due_date?: string | null
    actor_id: string
}

export interface ProductionOrderResult {
    orderId: string
    order_number: string
    barcodes_generated: number
}

export interface BatchConversionResult {
    success: boolean
    message: string
    converted_orders: string[]
    skipped_orders: string[]
    errors: string[]
}

export class ProductionService {
    private db: Database

    constructor(db?: Database) {
        this.db = db || getDatabase()
    }

    /**
     * Ürün adından SKU ve temizleme işlemleri yapar
     */
    private extractProductName(fullName: string): string {
        if (!fullName) return ''
        if (fullName.includes(' - ')) {
            const parts = fullName.split(' - ')
            return parts[parts.length - 1].trim()
        }
        const skuMatch = fullName.match(/^PRD-\d+\s*-\s*(.+)$/i)
        if (skuMatch) {
            return skuMatch[1].trim()
        }
        return fullName.trim()
    }

    /**
     * Bir siparişi en uygun ürünle eşleştirir (Backend versiyonu)
     */
    public findProductForOrder(order: any): string | null {
        // 1. Ürün adı + konfigürasyon kombinasyonuna göre bul
        if (order.product_name && order.configuration) {
            const productNameLower = (order.product_name || '').toLowerCase().trim()
            const configLower = (order.configuration || '').toLowerCase().trim()

            const productBaseName = productNameLower
                .replace(/\([^)]*\)/g, '')
                .trim()
                .split(' ')[0]
                .trim()

            let configKeyword = ''
            if (configLower.includes('berjer')) configKeyword = 'berjer'
            else if (configLower.includes('üçlü') || configLower.includes('uclu') || configLower.includes('triple')) configKeyword = 'üçlü'
            else if (configLower.includes('köşe') || configLower.includes('kose') || configLower.includes('corner')) configKeyword = 'köşe'
            else if (configLower.includes('ikili') || configLower.includes('double') || configLower.includes('duo')) configKeyword = 'ikili'

            if (configKeyword) {
                const expectedProductName = `${productBaseName} ${configKeyword}`.toLowerCase()
                const otherConfigs = ['berjer', 'üçlü', 'köşe', 'ikili'].filter(c => c !== configKeyword)

                // Tam eşleşme dene
                const exactMatch = this.db.prepare(`
          SELECT id, name FROM products 
          WHERE LOWER(TRIM(name)) = ? AND deleted_at IS NULL
        `).get(expectedProductName) as any

                if (exactMatch) {
                    const pNameLower = (exactMatch.name || '').toLowerCase()
                    const hasOtherConfig = otherConfigs.some(c => pNameLower.includes(c))
                    if (!hasOtherConfig) return exactMatch.id
                }

                // Kısmi eşleşme dene
                const placeholders = otherConfigs.map(() => 'LOWER(name) NOT LIKE ?').join(' AND ')
                const params = [`%${productBaseName}%`, `%${configKeyword}%`, ...otherConfigs.map(c => `%${c}%`)]

                const matchingProducts = this.db.prepare(`
          SELECT id, name, sku FROM products 
          WHERE deleted_at IS NULL 
          AND LOWER(name) LIKE ? 
          AND LOWER(name) LIKE ? 
          AND (${placeholders})
        `).all(...params) as any[]

                if (matchingProducts.length > 0) {
                    // SKU'ya göre sırala (en yeni/yüksek olanı seç)
                    matchingProducts.sort((a, b) => {
                        const aNum = parseInt((a.sku || '').replace(/[^0-9]/g, '')) || 0
                        const bNum = parseInt((b.sku || '').replace(/[^0-9]/g, '')) || 0
                        return bNum - aNum
                    })
                    return matchingProducts[0].id
                }
            }
        }

        // 2. product_sku ile bul
        if (order.product_sku) {
            const pBySku = this.db.prepare('SELECT id FROM products WHERE sku = ? AND deleted_at IS NULL').get(order.product_sku) as any
            if (pBySku) return pBySku.id
        }

        // 3. Sadece ürün adına göre bul (fallback)
        if (order.product_name) {
            const pByName = this.db.prepare('SELECT id FROM products WHERE LOWER(name) LIKE ? AND deleted_at IS NULL LIMIT 1')
                .get(`%${this.extractProductName(order.product_name).toLowerCase()}%`) as any
            if (pByName) return pByName.id
        }

        return order.product_id || null
    }

    /**
     * Ürün için BOM reçetesini bulur (alternatif ürünler dahil)
     */
    public getBomWithFallbacks(productId: string, productName: string): { bom: any[], bomProductId: string } {
        const fetchBom = (pid: string, activeOnly = true) => {
            const query = `
        SELECT 
          b.material_id, b.quantity_required, b.unit as unit,
          m.name as material_name, m.code as material_code, m.category as material_category,
          m.stock_amount, m.unit as material_unit, m.reserved_quantity,
          COALESCE(b.fire_percentage, 0) as fire_percentage,
          COALESCE(m.purchase_price, 0) as purchase_price
        FROM bom b
        JOIN bom_versions bv ON b.version_id = bv.id AND bv.deleted_at IS NULL ${activeOnly ? 'AND bv.is_active = 1' : ''}
        JOIN materials m ON b.material_id = m.id
        WHERE b.product_id = ? AND b.deleted_at IS NULL
        ${!activeOnly ? 'ORDER BY bv.version_no DESC LIMIT 100' : ''}
      `
            return this.db.prepare(query).all(pid)
        }

        // 1. Direkt aktif BOM
        let bom = fetchBom(productId, true)
        if (bom.length > 0) return { bom, bomProductId: productId }

        // 2. Herhangi bir versiyon BOM
        bom = fetchBom(productId, false)
        if (bom.length > 0) return { bom, bomProductId: productId }

        // 3. İsim eşleşmesi ile alternatif ürün BOM'u
        const productNameOnly = this.extractProductName(productName)
        const fallbackIdRow = this.db.prepare(`
      SELECT p.id 
      FROM active_products p
      JOIN bom b ON b.product_id = p.id AND b.deleted_at IS NULL
      WHERE p.name LIKE ? AND p.id != ?
      LIMIT 1
    `).get(`%${productNameOnly}%`, productId) as { id: string } | undefined

        if (fallbackIdRow) {
            bom = fetchBom(fallbackIdRow.id, true)
            if (bom.length === 0) bom = fetchBom(fallbackIdRow.id, false)
            if (bom.length > 0) return { bom, bomProductId: fallbackIdRow.id }
        }

        return { bom: [], bomProductId: productId }
    }

    /**
     * Stok yeterliliğini kontrol eder
     */
    public checkStockAvailability(bom: any[], quantity: number, orderFabricMaterial?: any): { isAvailable: boolean, errors: string[] } {
        const errors: string[] = []

        for (const item of bom) {
            let materialToUse = item
            let currentStock = (item.stock_amount || 0) - (item.reserved_quantity || 0)

            // Siparişe özel kumaş varsa onu kullan
            if (item.material_category?.toLowerCase() === 'kumaş' && orderFabricMaterial) {
                materialToUse = { ...item, ...orderFabricMaterial }
                currentStock = (orderFabricMaterial.stock_amount || 0) - (orderFabricMaterial.reserved_quantity || 0)
            }

            const firePercentage = item.fire_percentage || 0
            const quantityWithFire = item.quantity_required * (1 + (firePercentage / 100))

            // Birim çevrimi
            const fromUnit = (item.unit || item.material_unit || '').toString()
            const toUnit = (materialToUse.material_unit || item.material_unit || '').toString()
            const factor = resolveUnitFactor(this.db, item.material_id || null, fromUnit, toUnit)
            const convertedQuantity = factor ? quantityWithFire * factor : quantityWithFire

            const totalRequired = convertedQuantity * quantity

            if (currentStock < totalRequired) {
                errors.push(`${materialToUse.material_name || materialToUse.name} yetersiz. Gereken: ${totalRequired.toFixed(2)}, Mevcut: ${currentStock.toFixed(2)}`)
            }
        }

        return { isAvailable: errors.length === 0, errors }
    }

    /**
   * Üretim emri oluşturma işlemini yürütür
   */
    public async createProductionOrder(params: CreateProductionOrderParams): Promise<ProductionOrderResult> {
        const { order_number, product_id, quantity, due_date, actor_id } = params
        const { generateBarcode, generateSerialNumber } = await import('@/lib/utils/barcodeGenerator')

        return this.db.transaction(() => {
            // 1. Ürün bilgilerini al
            const product = this.db.prepare('SELECT * FROM active_products WHERE id = ?').get(product_id) as any
            if (!product) throw new Error('Ürün bulunamadı')

            // 2. BOM ve Stok Kontrolü
            const { bom, bomProductId } = this.getBomWithFallbacks(product_id, product.name)
            if (bom.length === 0) throw new Error('Ürün reçetesi bulunamadı')

            const { isAvailable, errors } = this.checkStockAvailability(bom, quantity)
            if (!isAvailable) throw new Error(`Stok yetersiz: ${errors.join(', ')}`)

            // 3. Maliyetleri Hesapla
            let totalMaterialCost = 0
            for (const item of bom) {
                const firePercentage = item.fire_percentage || 0
                const quantityWithFire = item.quantity_required * (1 + firePercentage / 100)
                const fromUnit = (item.unit || item.material_unit || '').toString()
                const toUnit = (item.material_unit || '').toString()
                const factor = resolveUnitFactor(this.db, item.material_id || null, fromUnit, toUnit)
                const convertedQuantity = factor ? quantityWithFire * factor : quantityWithFire
                totalMaterialCost += convertedQuantity * (item.purchase_price || 0) * quantity
            }

            const laborCostPerUnit = product.labor_cost || 0
            const totalLaborCost = laborCostPerUnit * quantity
            const totalCost = totalMaterialCost + totalLaborCost
            const sellingPrice = (product.price || 0) * quantity
            const profit = sellingPrice - totalCost

            // 4. Üretim Emrini Kaydet
            const orderId = randomUUID()
            this.db.prepare(`
        INSERT INTO production_orders 
        (id, order_number, product_id, quantity, status, material_cost, labor_cost, total_cost, selling_price, profit, due_date, company_id, branch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
                orderId, order_number, product_id, quantity, 'in_progress',
                totalMaterialCost, totalLaborCost, totalCost, sellingPrice, profit,
                due_date || null, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID
            )

            // 5. Üretim Maliyet Kaydını Oluştur
            this.db.prepare(`
        INSERT INTO production_costs
        (id, production_order_id, material_cost, labor_cost, overhead_cost, total_cost)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(randomUUID(), orderId, totalMaterialCost, totalLaborCost, 0, totalCost)

            // 6. Stokları Düş ve Hareketleri Kaydet
            const insertMovement = this.db.prepare(`
        INSERT INTO stock_movements (id, material_id, movement_type, quantity, reference_type, reference_id, notes, company_id, branch_id, warehouse_id, from_warehouse_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

            const insertActualConsumption = this.db.prepare(`
        INSERT INTO production_actual_consumption 
        (id, production_order_id, material_id, planned_quantity, actual_quantity, fire_quantity, variance, variance_percentage)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)

            for (const item of bom) {
                const firePercentage = item.fire_percentage || 0
                const quantityWithFire = item.quantity_required * (1 + firePercentage / 100)
                const fromUnit = (item.unit || item.material_unit || '').toString()
                const toUnit = (item.material_unit || '').toString()
                const factor = resolveUnitFactor(this.db, item.material_id || null, fromUnit, toUnit)
                const totalRequired = (factor ? quantityWithFire * factor : quantityWithFire) * quantity

                applyMaterialStockChange(this.db, item.material_id, -totalRequired)

                insertMovement.run(
                    randomUUID(), item.material_id, 'out', totalRequired, 'production_order', orderId,
                    `Üretim emri: ${order_number} - ${item.material_name}`,
                    DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID, DEFAULT_WAREHOUSE_ID, DEFAULT_WAREHOUSE_ID
                )

                insertActualConsumption.run(
                    randomUUID(), orderId, item.material_id, totalRequired, null, null, null, null
                )
            }

            // 7. Barcode ve Seri Numaraları Üretim
            const todayCountRow = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM product_serial_numbers 
        WHERE product_id = ? AND date(created_at) = date('now')
      `).get(product_id) as { count: number }

            const startSequence = (todayCountRow?.count || 0) + 1
            const insertBarcode = this.db.prepare(`
        INSERT INTO product_serial_numbers 
        (id, product_id, serial_number, barcode, production_order_id, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)

            for (let i = 0; i < quantity; i++) {
                const sequence = startSequence + i
                const barcode = generateBarcode(product.sku, sequence)
                const serial = generateSerialNumber(sequence)
                insertBarcode.run(randomUUID(), product_id, serial, barcode, orderId, 'in_stock', `Üretim emri: ${order_number}`)
            }

            // 8. Log Audit
            logAudit(this.db, {
                tableName: 'production_orders',
                action: 'create',
                recordId: orderId,
                userId: actor_id,
                after: { id: orderId, order_number, product_id, quantity, status: 'in_progress' },
            })

            return { orderId, order_number, barcodes_generated: quantity }
        })()
    }

    /**
     * Satış siparişlerini toplu olarak üretime dönüştürür
     */
    public async convertOrdersToProduction(params: BatchConversionParams): Promise<BatchConversionResult> {
        const { order_ids, due_date, actor_id } = params
        const converted_orders: string[] = []
        const skipped_orders: string[] = []
        const errors: string[] = []

        for (const orderId of order_ids) {
            try {
                const order = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any
                if (!order) {
                    errors.push(`Sipariş bulunamadı: ${orderId}`)
                    continue
                }

                if (order.production_order_id || order.status === 'in_production' || order.status === 'completed') {
                    skipped_orders.push(`${order.order_number} zaten üretimde veya tamamlanmış.`)
                    continue
                }

                // Ürün eşleştirme
                const matchedProductId = this.findProductForOrder(order)
                if (!matchedProductId) {
                    errors.push(`${order.order_number} için uygun ürün bulunamadı.`)
                    continue
                }

                // Üretim emri oluştur (Service içindeki createProductionOrder'u çağırabiliriz veya direkt transaction yapabiliriz)
                // Basitlik için burada yeni bir üretim emri numarası üretip createProductionOrder kullanıyoruz
                const { generateProductionOrderNumber } = await import('@/lib/utils/codeGenerator.server')
                const newOrderNumber = await generateProductionOrderNumber()

                const result = await this.createProductionOrder({
                    order_number: newOrderNumber,
                    product_id: matchedProductId,
                    quantity: order.quantity,
                    due_date: due_date || order.due_date,
                    actor_id
                })

                // Siparişi güncelle
                this.db.prepare('UPDATE orders SET production_order_id = ?, status = ? WHERE id = ?')
                    .run(result.orderId, 'in_production', orderId)

                converted_orders.push(order.order_number)
            } catch (err: any) {
                errors.push(err.message)
            }
        }

        return {
            success: errors.length === 0,
            message: errors.length === 0 ? 'Tüm siparişler dönüştürüldü' : 'Bazı hatalar oluştu',
            converted_orders,
            skipped_orders,
            errors
        }
    }

    /**
     * Üretim emrini tamamlar ve muhasebe kayıtlarını oluşturur
     */
    public async completeProductionOrder(orderId: string, actorId: string): Promise<{ success: boolean, journalEntryId?: string }> {
        const { createProductionJournalEntry } = await import('@/lib/utils/accounting')

        // 1. Durum güncelleme ve Audit log (Transaction içinde)
        const order = this.db.prepare('SELECT * FROM production_orders WHERE id = ?').get(orderId) as any
        if (!order) throw new Error('Üretim emri bulunamadı')
        if (order.status === 'completed') return { success: true }

        const now = new Date().toISOString()

        this.db.transaction(() => {
            // 1. Üretim emri durumunu güncelle
            this.db.prepare(`
                UPDATE production_orders 
                SET status = 'completed', completed_at = ?, updated_at = ? 
                WHERE id = ?
            `).run(now, now, orderId)

            // 2. Mamül Stoklarını Güncelle (Üretilen miktar kadar artır)
            this.db.prepare(`
                UPDATE products 
                SET stock_amount = COALESCE(stock_amount, 0) + ? 
                WHERE id = ?
            `).run(order.quantity, order.product_id)

            // 3. Bağlı satış siparişlerini güncelle
            const linkedOrdersCount = this.db.prepare(`
                SELECT COUNT(*) as count FROM orders 
                WHERE production_order_id = ? AND status = 'in_production' AND deleted_at IS NULL
            `).get(orderId) as { count: number }

            if (linkedOrdersCount.count > 0) {
                // Siparişler tamamlanıyor, yani mamüller çıkıyor (stoktan düş)
                // Bu örnekte üretilen miktar kadar sipariş olduğunu varsayıyoruz (ya da sipariş miktarını düşür)
                this.db.prepare(`
                    UPDATE products 
                    SET stock_amount = COALESCE(stock_amount, 0) - ? 
                    WHERE id = ?
                `).run(order.quantity, order.product_id)

                this.db.prepare(`
                    UPDATE orders 
                    SET status = 'completed', updated_at = ? 
                    WHERE production_order_id = ? AND status = 'in_production' AND deleted_at IS NULL
                `).run(now, orderId)
            }

            // Audit Log
            logAudit(this.db, {
                tableName: 'production_orders',
                action: 'update',
                recordId: orderId,
                userId: actorId,
                before: { status: order.status },
                after: { status: 'completed', completed_at: now }
            })
        })()

        // 2. Muhasebe kaydı (Transaction dışında, çünkü async olabilir)
        let journalEntryId: string | undefined
        try {
            // A. Üretim Maliyet Kaydı
            const { createProductionJournalEntry } = await import('@/lib/utils/accounting')
            journalEntryId = await createProductionJournalEntry(
                orderId,
                order.material_cost || 0,
                order.labor_cost || 0,
                now.split('T')[0]
            )
            logger.info('[MUHASEBE] Üretim maliyet yevmiye kaydı oluşturuldu', { orderId, journalEntryId })

            // B. Satış Gelir Kaydı (Eğer bağlı sipariş varsa)
            const linkedOrders = this.db.prepare(`
                SELECT o.id, o.total_amount, a.id as customer_account_id, o.order_number
                FROM orders o
                JOIN accounts a ON o.dealer_name = a.name COLLATE NOCASE
                WHERE o.production_order_id = ? AND o.deleted_at IS NULL
            `).all(orderId) as any[]

            for (const orderInfo of linkedOrders) {
                const { createSaleJournalEntry } = await import('@/lib/utils/accounting')
                // KDV %20 varsayıyoruz (ERP ayarlarından da çekilebilir)
                const vatRate = 0.20
                const netAmount = orderInfo.total_amount / (1 + vatRate)
                const vatAmount = orderInfo.total_amount - netAmount

                // Maliyeti tahmin et (basitçe üretim maliyetini bu siparişe böl)
                // Bu örnekte sipariş başına tam maliyeti alıyoruz. 
                // Eğer 1 üretim emri birden fazla siparişi karşılıyorsa (şu an birebir eşleşme yaygın)
                const cogs = order.total_cost / (linkedOrders.length || 1)

                const saleJournalId = await createSaleJournalEntry(
                    orderInfo.id,
                    orderInfo.customer_account_id,
                    netAmount,
                    vatAmount,
                    cogs,
                    now.split('T')[0]
                )
                logger.info('[MUHASEBE] Satış geliri yevmiye kaydı oluşturuldu', { orderNumber: orderInfo.order_number, saleJournalId })
            }
        } catch (accError: any) {
            logger.error('[MUHASEBE HATA] Muhasebe kayıtları oluşturulamadı', { orderId, error: accError.message })
        }

        // 3. Webhook Dispatch
        try {
            const { dispatchWebhook } = await import('@/lib/webhooks/dispatch')
            await dispatchWebhook('production.completed', {
                production_order_id: orderId,
                production_order_number: order.order_number,
                product_id: order.product_id,
                quantity: order.quantity,
                completed_at: now,
                journal_entry_id: journalEntryId
            })
        } catch (webhookError: any) {
            logger.error('[WEBHOOK HATA] Üretim tamamlanma webhooku gönderilemedi', { error: webhookError.message })
        }

        return { success: true, journalEntryId }
    }
}
