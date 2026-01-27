/**
 * Local Database Client
 * Supabase yerine local SQLite kullanır
 */

// Local network için IP adresini otomatik algıla
const getApiBase = () => {
  if (typeof window !== 'undefined') {
    // Browser'da çalışıyorsa
    const hostname = window.location.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000/api'
    }
    // Aynı ağdaki başka bir cihazdan erişiliyorsa
    return `http://${hostname}:3000/api`
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
}

const API_BASE = getApiBase()

export const localDB = {
  // Materials
  async getMaterials() {
    const res = await fetch(`${API_BASE}/materials`)
    if (!res.ok) throw new Error('Materials yüklenemedi')
    return res.json()
  },

  async createMaterial(data: { name: string; unit: string; stock_amount?: number; min_stock_level?: number }) {
    const res = await fetch(`${API_BASE}/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Material oluşturulamadı')
    return res.json()
  },

  // Products
  async getProducts() {
    const res = await fetch(`${API_BASE}/products`)
    if (!res.ok) throw new Error('Products yüklenemedi')
    return res.json()
  },

  async createProduct(data: { name: string; sku: string; price?: number }) {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Product oluşturulamadı')
    return res.json()
  },

  // BOM
  async getBOM(productId: string) {
    const res = await fetch(`${API_BASE}/bom?product_id=${productId}`)
    if (!res.ok) throw new Error('BOM yüklenemedi')
    return res.json()
  },

  // Production Orders
  async getProductionOrders() {
    const res = await fetch(`${API_BASE}/production`)
    if (!res.ok) throw new Error('Production orders yüklenemedi')
    return res.json()
  },

  async createProductionOrder(data: { order_number: string; product_id: string; quantity: number; due_date?: string | null }) {
    const res = await fetch(`${API_BASE}/production`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Production order oluşturulamadı')
    }
    return res.json()
  },
}

