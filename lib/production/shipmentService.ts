import { Database } from 'better-sqlite3'
import { getDatabase, DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID } from '@/lib/database/db'
import { randomUUID } from 'crypto'
import { generateShipmentNumber } from '@/lib/utils/codeGenerator.server'

export interface ShipmentResult {
    success: boolean
    message: string
    shipmentId?: string
    shipmentNumber?: string
}

export class ShipmentService {
    private db: Database

    constructor(db?: Database) {
        this.db = db || getDatabase()
    }

    /**
     * Üretim emirlerinden sevkiyat ve çeki listesi oluşturur
     */
    public async createShipmentFromProduction(orderIds: string[], actorId: string): Promise<ShipmentResult> {
        if (!orderIds || orderIds.length === 0) {
            throw new Error('Sevkiyat için en az bir üretim emri seçilmelidir.')
        }

        const shipmentNumber = await generateShipmentNumber()
        const shipmentId = randomUUID()
        const now = new Date().toISOString()

        try {
            return this.db.transaction(() => {
                // 1. Üretim emirlerini doğrula ve bilgilerini al
                const placeholders = orderIds.map(() => '?').join(',')
                const productionOrders = this.db.prepare(`
          SELECT po.*, p.name as product_name, p.id as product_id, o.customer_id, o.total_amount
          FROM production_orders po
          JOIN products p ON po.product_id = p.id
          LEFT JOIN orders o ON po.production_order_id = o.production_order_id
          WHERE po.id IN (${placeholders}) AND po.current_station = 'Sevkiyat'
        `).all(...orderIds) as any[]

                if (productionOrders.length === 0) {
                    throw new Error('Seçilen üretim emirleri sevkiyat aşamasında değil.')
                }

                // 2. Sevkiyat kaydını oluştur
                // Müşteri bazlı gruplama yapılabilir ama bu örnekte toplu sevkiyat yapıyoruz
                // Eğer birden fazla müşteri varsa, ilk müşteriyi baz alalım (veya genel yapalım)
                const primaryCustomerId = productionOrders[0].customer_id || 'SYSTEM'
                const totalQty = productionOrders.reduce((sum, po) => sum + po.quantity, 0)

                this.db.prepare(`
          INSERT INTO shipments (
            id, shipment_number, customer_id, shipment_date, status, total_quantity, 
            company_id, branch_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
                    shipmentId, shipmentNumber, primaryCustomerId, now.split('T')[0], 'pending', totalQty,
                    DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID, now, now
                )

                // 3. Sevkiyat kalemlerini (Çeki Listesi) ve üretim emri güncellemelerini yap
                const insertItem = this.db.prepare(`
          INSERT INTO shipment_items (
            id, shipment_id, product_id, production_order_id, quantity, created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `)

                const updateProductionOrder = this.db.prepare(`
          UPDATE production_orders 
          SET status = 'completed', sevkiyat_completed_at = ?, updated_at = ?
          WHERE id = ?
        `)

                for (const po of productionOrders) {
                    insertItem.run(randomUUID(), shipmentId, po.product_id, po.id, po.quantity, now)
                    updateProductionOrder.run(now, now, po.id)
                }

                // 4. Bildirim Gönder (Sevkiyat Bildirimi)
                const notificationId = randomUUID()
                this.db.prepare(`
          INSERT INTO notifications (
            id, user_id, title, message, type, is_read, created_at
          ) VALUES (?, ?, ?, ?, ?, 0, ?)
        `).run(
                    notificationId, actorId, 'Yeni Sevkiyat Hazır',
                    `${shipmentNumber} numaralı sevkiyat ve çeki listesi oluşturuldu.`,
                    'success', now
                )

                return {
                    success: true,
                    message: 'Sevkiyat ve çeki listesi başarıyla oluşturuldu.',
                    shipmentId,
                    shipmentNumber
                }
            })()
        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'Sevkiyat oluşturulurken bir hata oluştu.'
            }
        }
    }
}
