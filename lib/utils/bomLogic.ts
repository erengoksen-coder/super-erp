/**
 * BOM (Bill of Materials) Mantığı
 * Üretim emri oluşturulduğunda otomatik stok düşüşü yapar
 */

import { createClient } from '@/lib/supabase/client'

export interface BOMCheckResult {
  canProduce: boolean
  insufficientItems: Array<{
    stock_id: string
    stock_name: string
    required: number
    available: number
    unit: string
  }>
  totalCost?: number
}

/**
 * Üretim öncesi stok kontrolü
 * KRİTİK: Stok eksiye düşecekse üretim başlatılmaz
 * @param productId Üretilecek ürün ID
 * @param quantity Üretilecek miktar
 * @returns Stok kontrolü sonucu
 */
export async function checkBOMAvailability(
  productId: string,
  quantity: number
): Promise<BOMCheckResult> {
  const supabase = createClient()
  
  if (!supabase) {
    // Demo modu
    return {
      canProduce: true,
      insufficientItems: [],
    }
  }

  try {
    // BOM verilerini al
    const { data: bomData, error: bomError } = await supabase
      .from('product_bom_view')
      .select('*')
      .eq('product_id', productId)

    if (bomError) throw bomError

    if (!bomData || bomData.length === 0) {
      return {
        canProduce: false,
        insufficientItems: [{
          stock_id: '',
          stock_name: 'Reçete bulunamadı',
          required: 0,
          available: 0,
          unit: '',
        }],
      }
    }

    const insufficientItems: BOMCheckResult['insufficientItems'] = []
    let totalCost = 0

    // Her hammadde için kontrol et
    for (const item of bomData) {
      const required = parseFloat(item.quantity_required) * quantity
      const available = parseFloat(item.available_stock)

      // KRİTİK KONTROL: Stok eksiye düşecekse ekle
      if (available < required || available <= 0) {
        insufficientItems.push({
          stock_id: item.material_id,
          stock_name: item.material_name,
          required,
          available,
          unit: item.material_unit,
        })
      }

      // Maliyet hesapla (opsiyonel)
      const { data: stockData } = await supabase
        .from('materials')
        .select('unit_price')
        .eq('id', item.material_id)
        .single()

      if (stockData?.unit_price) {
        totalCost += parseFloat(stockData.unit_price) * required
      }
    }

    return {
      canProduce: insufficientItems.length === 0,
      insufficientItems,
      totalCost,
    }
  } catch (error) {
    console.error('Error checking BOM availability:', error)
    return {
      canProduce: false,
      insufficientItems: [{
        stock_id: '',
        stock_name: 'Kontrol sırasında hata oluştu',
        required: 0,
        available: 0,
        unit: '',
      }],
    }
  }
}

/**
 * Üretim emri oluştur ve stokları düş
 * KRİTİK: Stok eksiye düşecekse üretim başlatılmaz
 * 
 * Mantık:
 * 1. Stok kontrolü yapılır
 * 2. Yetersizse üretim başlatılmaz
 * 3. Yeterliyse:
 *    - Üretim emri oluşturulur
 *    - Her hammadde için stok düşüşü yapılır (reçete miktarı × üretim miktarı)
 *    - Trigger otomatik olarak stokları günceller
 * 
 * @param orderNumber Üretim emri numarası
 * @param productId Üretilecek ürün ID
 * @param quantity Üretilecek miktar
 * @returns Başarı durumu ve oluşturulan emir ID
 */
export async function createProductionOrderWithStockDeduction(
  orderNumber: string,
  productId: string,
  quantity: number
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const supabase = createClient()
  
  if (!supabase) {
    // Demo modu
    return { success: true }
  }

  try {
    // 1. ÖNCE STOK KONTROLÜ YAP - KRİTİK ADIM
    const stockCheck = await checkBOMAvailability(productId, quantity)
    
    // Stok yetersizse veya eksiye düşecekse üretim başlatma
    if (!stockCheck.canProduce) {
      const insufficientNames = stockCheck.insufficientItems
        .map(i => `${i.stock_name} (Gereken: ${i.required} ${i.unit}, Mevcut: ${i.available} ${i.unit})`)
        .join(', ')
      
      return {
        success: false,
        error: `❌ Stok yetersiz! Üretim başlatılamaz.\n\nYetersiz hammaddeler:\n${insufficientNames}`,
      }
    }

    // 2. ÜRETİM EMRİNİ OLUŞTUR
    const { data: order, error: orderError } = await supabase
      .from('production_orders')
      .insert({
        order_number: orderNumber,
        product_id: productId,
        quantity: quantity,
        status: 'in_progress',
        start_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (orderError) throw orderError

    // 3. BOM VERİLERİNİ AL (Reçete)
    const { data: bomData, error: bomError } = await supabase
      .from('product_bom_view')
      .select('*')
      .eq('product_id', productId)

    if (bomError) throw bomError

    if (!bomData || bomData.length === 0) {
      // Üretim emrini iptal et
      await supabase
        .from('production_orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id)
      
      return {
        success: false,
        error: 'Reçete bulunamadı. Üretim emri iptal edildi.',
      }
    }

    // 4. HER HAMMADDE İÇİN STOK DÜŞÜŞÜ YAP
    // Reçetedeki miktar × Üretim miktarı = Toplam gereken
    const stockMovements = []
    
    for (const item of bomData) {
      const requiredPerUnit = parseFloat(item.quantity_required)
      const totalRequired = requiredPerUnit * quantity

      // Son bir kontrol daha (race condition için)
      const { data: currentStock } = await supabase
        .from('materials')
        .select('stock_amount')
        .eq('id', item.material_id)
        .single()

      if (currentStock && parseFloat(currentStock.stock_amount) < totalRequired) {
        // Üretim emrini iptal et
        await supabase
          .from('production_orders')
          .update({ status: 'cancelled' })
          .eq('id', order.id)
        
        return {
          success: false,
          error: `${item.material_name} stoku yetersiz. Üretim emri iptal edildi.`,
        }
      }

      // Stok hareketi kaydı oluştur
      // Trigger otomatik olarak stokları düşecek
      stockMovements.push({
        stock_id: item.material_id,
        movement_type: 'out',
        quantity: totalRequired,
        reference_type: 'production',
        reference_id: order.id,
        notes: `Üretim emri: ${orderNumber}\nÜrün: ${item.material_name}\nReçete: ${requiredPerUnit} ${item.material_unit}/birim × ${quantity} adet = ${totalRequired} ${item.material_unit}`,
      })
    }

    // Tüm stok hareketlerini toplu ekle
    const { error: movementsError } = await supabase
      .from('stock_movements')
      .insert(stockMovements)

    if (movementsError) {
      // Hata durumunda üretim emrini iptal et
      await supabase
        .from('production_orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id)
      
      throw movementsError
    }

    return {
      success: true,
      orderId: order.id,
    }
  } catch (error: any) {
    console.error('Error creating production order:', error)
    return {
      success: false,
      error: error.message || 'Üretim emri oluşturulamadı',
    }
  }
}

/**
 * Üretim emrini iptal et ve stokları geri ekle
 * @param orderId Üretim emri ID
 */
export async function cancelProductionOrder(orderId: string): Promise<boolean> {
  const supabase = createClient()
  
  if (!supabase) return true

  try {
    // Üretim emrini al
    const { data: order, error: orderError } = await supabase
      .from('production_orders')
      .select('*, product_id, quantity')
      .eq('id', orderId)
      .single()

    if (orderError) throw orderError

    // BOM verilerini al
    const { data: bomData, error: bomError } = await supabase
      .from('product_bom_view')
      .select('*')
      .eq('product_id', order.product_id)

    if (bomError) throw bomError

    // Her hammadde için stok geri ekle
    for (const item of bomData || []) {
      const totalRequired = parseFloat(item.quantity_required) * order.quantity

      await supabase
        .from('stock_movements')
        .insert({
          material_id: item.material_id,
          movement_type: 'in',
          quantity: totalRequired,
          reference_type: 'production',
          reference_id: orderId,
          notes: `Üretim emri iptal: ${order.order_number} - ${item.material_name} geri eklendi`,
        })
    }

    // Üretim emrini iptal olarak işaretle
    await supabase
      .from('production_orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)

    return true
  } catch (error) {
    console.error('Error cancelling production order:', error)
    return false
  }
}

