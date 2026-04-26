insertMovement.run(
                        randomUUID(), materialIdToUse, 'out', totalRequired, 'production_order', orderId,
                        `Ãœretim emri: ${order_number} - ${materialNameToUse}`,
                        DEFAULT_COMPANY_ID, DEFAULT_BRANCH_ID, DEFAULT_WAREHOUSE_ID, DEFAULT_WAREHOUSE_ID
                    )

                    insertActualConsumption.run(
                        randomUUID(), orderId, materialIdToUse, totalRequired, null, null, null, null
                    )
                } catch (bomItemErr: any) {
                    logger.error(`BOM Kalem Ä°ÅŸleme HatasÄ±: ${bomItemErr.message}`)
                }
            }

            // 7. Barcode ve Seri NumaralarÄ± Ãœretim
            const todayCountRow = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM product_serial_numbers 
        WHERE product_id = ? AND date(created_at) = date('now')
      `).get(product_id) as { count: number }

            const startSequence = (todayCountRow?.count || 0) + 1
            const insertBarcode = this.db.prepare(`
        INSERT INTO product_serial_numbers 
        (id, product_id, serial_number, barcode, production_order_id, status, notes, current_station)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)

            for (let i = 0; i < quantity; i++) {
                const sequence = startSequence + i
                const barcode = generateBarcode(product.sku, sequence)
                const serial = generateSerialNumber(sequence)
                try {
                    insertBarcode.run(randomUUID(), product_id, serial, barcode, orderId, 'in_stock', `Ãœretim emri: ${order_number}`, startingStation)
                } catch {
                    // Barkod zaten varsa atla (unique constraint)
                    logger.error(`Barkod zaten mevcut, atlanÄ±yor: ${barcode}`)
                }
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
     * SatÄ±ÅŸ sipariÅŸlerini toplu olarak Ã¼retime dÃ¶nÃ¼ÅŸtÃ¼rÃ¼r
     */
    public async convertOrdersToProduction(params: BatchConversionParams): Promise<BatchConversionResult> {
        const { order_ids, due_date, actor_id } = params
        const converted_orders: string[] = []
        const skipped_orders: string[] = []
        const errors: string[] = []

        for (const inputId of order_ids) {
            try {
                // Determine if input is an order or order_item
                let order = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(inputId) as any
                let targetItemId: string | null = null

                if (!order) {
                    // If not an order, check if it's an order_item (B2B multi-item pending order)
                    const item = this.db.prepare('SELECT * FROM order_items WHERE id = ? AND deleted_at IS NULL').get(inputId) as any
                    if (item) {
                        order = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(item.order_id) as any
                        targetItemId = item.id
                    }
                }

                if (!order) {
                    errors.push(`SipariÅŸ veya Kalem bulunamadÄ±: ${inputId}`)
                    continue
                }

                // Check order status - only 'pending' orders can be converted
                if (order.status !== 'pending' && order.status !== 'in_production') {
                    errors.push(`${order.order_number} henÃ¼z onaylanmamÄ±ÅŸ veya geÃ§ersiz durumda (Mevcut Durum: ${order.status})`)
                    continue
                }

                // Alt kalemle       converted_orders.push(order.order_number)
                }
            } catch (err: any) {
                errors.push(`${inputId} hatasÄ±: ${err.message}`)
            }
        }

        return {
            success: errors.length === 0,
            message: errors.length === 0 ? 'Ä°ÅŸlem tamamlandÄ±' : 'BazÄ± kalemlerde hatalar oluÅŸtu',
            converted_orders,
            skipped_orders,
            errors
        }
    }

    /**
     * SipariÅŸ notlarÄ±ndan kumaÅŸ kodunu ve karÅŸÄ±lÄ±k gelen malzeme ID'sini bulur
     */
    private extractFabricMaterialId(notes: string | null): string | undefined {
        if (!notes) return undefined
        const fabricMatch = notes.match(/KumaÅŸ:\s*([^|]+)/i)
        if (!fabricMatch) return undefined

        const fabricCode = fabricMatch[1].trim()

        // Ã–nce tam kod eÅŸleÅŸmesi ara, sonra tam isim, sonra benzer isim
        // Stok miktarÄ± en yÃ¼ksek olanÄ± ve silinmemiÅŸ olanÄ± tercih et
        const mat = this.db.prepare(`
            SELECT id FROM materials 
            WHERE (code = ? OR name = ? OR name = ? OR name LIKE ?) 
              AND category = 'KumaÅŸ' 
              AND deleted_at IS NULL 
            ORDER BY 
              (CASE WHEN code = ? THEN 0 WHEN name = ? THEN 1 ELSE 2 END) ASC,
              stock_amount DESC
            LIMIT 1
        `).get(fabricCode, fabricCode, `KumaÅŸ ${fabricCode}`, `KumaÅŸ ${fabricCode}%`, fabricCode, fabricCode) as { id: string } | undefined

        return mat?.id
    }

    /**
     * Ãœretim emrini tamamlar ve muhasebe kayÄ±tlarÄ±nÄ± oluÅŸturur
     */
    public async completeProductionOrder(orderId: string, actorId: string): Promise<{ success: boolean, journalEntryId?: string | undefined }> {
        const { createProductionJournalEntry } = await import('@/lib/utils/accounting')

        // 1. Durum gÃ¼ncelleme ve Audit log (Transaction iÃ§inde)
        const order = this.db.prepare('SELECT * FROM production_orders WHERE id = ?').get(orderId) as any
        if (!order) throw new Error('Ãœretim emri bulunamadÄ±')
        if (order.status === 'completed') return { success: true }

        const now = new Date().toISOString()

        this.db.transaction(() => {
            // 1. Ãœretim emri durumunu gÃ¼ncelle
            this.db.prepare(`
                UPDATE production_orders 
                SET status = 'completed', completed_at = ?, updated_at = ? 
                WHERE id = ?
            `).run(now, now, orderId)

            // 2. MamÃ¼l StoklarÄ±nÄ± GÃ¼ncelle (Ãœretilen miktar kadar artÄ±r)
            this.db.prepare(`
                UPDATE products 
                SET stock_amount = COALESCE(stock_amount, 0) + ? 
                WHERE id = ?
            `).run(order.quantity, order.product_id)

            // 3. BaÄŸlÄ± satÄ±ÅŸ sipariÅŸlerini gÃ¼ncelle
            const linkedOrdersCount = this.db.prepare(`
                SELECT COUNT(*) as count FROM orders 
                WHERE production_order_id = ? AND status = 'in_production' AND deleted_at IS NULL
            `).get(orderId) as { count: number }

            if (linkedOrdersCount.count > 0) {
                // SipariÅŸler tamamlanÄ±yor, yani mamÃ¼ller Ã§Ä±kÄ±yor (stoktan dÃ¼ÅŸ)
                // Bu Ã¶rnekte Ã¼retilen miktar kadar sipariÅŸ olduÄŸunu varsayÄ±yoruz (ya da sipariÅŸ miktarÄ±nÄ± dÃ¼ÅŸÃ¼r)
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
                a
