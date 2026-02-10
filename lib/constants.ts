/**
 * Uygulama genelinde kullanılan sabitler (magic string azaltma).
 */

/** Sayfa yolları */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  ORDERS: '/orders',
  INVENTORY: '/inventory',
  PRODUCTION: '/production',
  BOM: '/bom',
  BARCODES: '/barcodes',
  BARCODES_SCAN: '/barcodes/scan',
  INVOICES: '/invoices',
  SHIPMENTS: '/shipments',
  ACCOUNTS: '/accounts',
  FINANCE: '/finance',
  HR: '/hr',
  USERS: '/users',
  SETTINGS: '/settings',
  REPORTS: '/reports',
} as const

/** API path önekleri */
export const API_PREFIX = '/api'

/** Kullanıcı rolleri */
export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  BAYI: 'bayi',
} as const

/** Varsayılan sayfalama */
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 500,
} as const

/** Export sayfa limiti (Excel/CSV) */
export const EXPORT_MAX_LIMIT = 10_000
