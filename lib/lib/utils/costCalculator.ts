/**
 * Üretim Maliyeti Hesaplama Fonksiyonları
 */

interface MaterialCost {
  material_id: string
  material_name: string
  quantity_required: number
  unit_price: number
  total_cost: number
}

interface ProductionCost {
  material_cost: number
  labor_cost: number
  total_cost: number
  material_breakdown: MaterialCost[]
}

/**
 * Ürün için toplam malzeme maliyetini hesaplar
 */
export function calculateMaterialCost(
  bom: Array<{
    material_id: string
    material_name: string
    quantity_required: number
    material_unit: string
    purchase_price: number
    fire_percentage?: number
  }>,
  quantity: number
): ProductionCost {
  let totalMaterialCost = 0
  const materialBreakdown: MaterialCost[] = []

  for (const item of bom) {
    // Fire yüzdesini hesaba kat
    const firePercentage = item.fire_percentage || 0
    const quantityWithFire = item.quantity_required * (1 + firePercentage / 100)
    const itemCost = quantityWithFire * item.purchase_price * quantity
    totalMaterialCost += itemCost

    materialBreakdown.push({
      material_id: item.material_id,
      material_name: item.material_name,
      quantity_required: quantityWithFire * quantity, // Fire dahil miktar
      unit_price: item.purchase_price,
      total_cost: itemCost,
    })
  }

  return {
    material_cost: totalMaterialCost,
    labor_cost: 0, // Ürün bazlı işçilik maliyeti ayrı hesaplanacak
    total_cost: totalMaterialCost,
    material_breakdown: materialBreakdown,
  }
}

/**
 * Üretim emri için toplam maliyeti hesaplar (malzeme + işçilik)
 */
export function calculateProductionCost(
  materialCost: number,
  laborCostPerUnit: number,
  quantity: number
): ProductionCost {
  const totalLaborCost = laborCostPerUnit * quantity
  const totalCost = materialCost + totalLaborCost

  return {
    material_cost: materialCost,
    labor_cost: totalLaborCost,
    total_cost: totalCost,
    material_breakdown: [],
  }
}

/**
 * Kar marjını hesaplar
 */
export function calculateProfit(sellingPrice: number, totalCost: number): {
  profit: number
  profitMargin: number
  profitPercentage: number
} {
  const profit = sellingPrice - totalCost
  const profitMargin = profit
  const profitPercentage = totalCost > 0 ? (profit / totalCost) * 100 : 0

  return {
    profit,
    profitMargin,
    profitPercentage,
  }
}

