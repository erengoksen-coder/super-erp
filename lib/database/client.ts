/**
 * Local Database Client
 * Supabase yerine local SQLite kullanır
 */

import { fetchApi } from '@/lib/api/fetch'

// Local network için API adresini otomatik algıla
const getApiBase = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api`
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
}

const API_BASE = getApiBase()

export const localDB = {
  // Materials
  async getMaterials() {
    return fetchApi(`${API_BASE}/materials`)
  },

  async createMaterial(data: { name: string; unit: string; stock_amount?: number; min_stock_level?: number }) {
    return fetchApi(`${API_BASE}/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  // Products
  async getProducts() {
    return fetchApi(`${API_BASE}/products`)
  },

  async createProduct(data: { name: string; sku: string; price?: number }) {
    return fetchApi(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  // BOM
  async getBOM(productId: string) {
    return fetchApi(`${API_BASE}/bom?product_id=${productId}`)
  },

  // Production Orders
  async getProductionOrders() {
    return fetchApi(`${API_BASE}/production`)
  },

  async createProductionOrder(data: { order_number: string; product_id: string; quantity: number; due_date?: string | null }) {
    return fetchApi(`${API_BASE}/production`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },
}

