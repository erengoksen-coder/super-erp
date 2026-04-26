import { getDatabase } from '@/lib/database/db';
import { v4 as uuidv4 } from 'uuid';

export class ShipmentService {
    /**
     * Üretim emirlerinden sevkiyat ve çeki listesi oluşturur.
     */
    async createShipmentFromProduction(orderIds: string[], userId: string) {
        const db = getDatabase();
        try {
            const shipmentId = `ship_${uuidv4().replace(/-/g, '')}`;
            const shipmentNumber = `SHP-${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;
            
            const transaction = db.transaction(() => {
                // Sevkiyat üst kaydı
                db.prepare(`
                    INSERT INTO shipments (id, shipment_number, status, created_by, company_id)
                    VALUES (?, ?, ?, ?, ?)
                `).run(shipmentId, shipmentNumber, 'draft', userId, 'company_default');

                // Seçilen siparişleri sevkiyata bağla
                const updateOrder = db.prepare('UPDATE orders SET shipment_id = ?, status = ? WHERE id = ?');
                for (const id of orderIds) {
                    updateOrder.run(shipmentId, 'shipped', id);
                }
            });

            transaction();
            return { success: true, shipmentId, shipmentNumber };
        } catch (error: any) {
            console.error('Shipment creation error:', error);
            return { success: false, message: error.message };
        }
    }
}