// Database Types
export type DatabaseUser = {
  id: string
  username: string
  email: string | null
  password_hash: string
  full_name: string | null
  role: 'admin' | 'user' | 'manager' | 'viewer'
  job_title: string | null
  is_approved: 0 | 1
  company_id: string
  branch_id: string
  created_at: string
  updated_at: string
  last_login: string | null
}

export type DatabaseMaterial = {
  id: string
  code: string
  name: string
  description: string | null
  category: string | null
  unit: string
  stock_amount: number
  unit_price: number
  min_stock_level: number
  max_stock_level: number
  created_at: string
  updated_at: string
}

export type DatabaseProduct = {
  id: string
  sku: string
  name: string
  description: string | null
  category: string | null
  unit: string
  unit_cost: number
  selling_price: number
  created_at: string
  updated_at: string
}

export type DatabaseOrder = {
  id: string
  customer_id: string
  order_date: string
  delivery_date: string | null
  status: 'pending' | 'confirmed' | 'in_production' | 'ready' | 'shipped' | 'cancelled'
  total_amount: number
  notes: string | null
  created_at: string
  updated_at: string
}

export type DatabaseOrderItem = {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export type DatabaseProduction = {
  id: string
  order_id: string
  product_id: string
  quantity: number
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  planned_start_date: string
  planned_end_date: string | null
  actual_start_date: string | null
  actual_end_date: string | null
  created_at: string
  updated_at: string
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Business Entity Types
export interface User {
  id: string
  username: string
  email: string | null
  full_name: string | null
  role: 'admin' | 'user' | 'manager' | 'viewer'
  job_title: string | null
  is_approved: boolean
  permissions?: Permission[]
}

export interface Material {
  id: string
  code: string
  name: string
  description: string | null
  category: string | null
  unit: string
  stock_amount: number
  unit_price: number
  min_stock_level: number
  max_stock_level: number
}

export interface Product {
  id: string
  sku: string
  name: string
  description: string | null
  category: string | null
  unit: string
  unit_cost: number
  selling_price: number
}

export interface Order {
  id: string
  customer_id: string
  customer?: Account
  order_date: string
  delivery_date: string | null
  status: 'pending' | 'confirmed' | 'in_production' | 'ready' | 'shipped' | 'cancelled'
  total_amount: number
  items: OrderItem[]
  notes: string | null
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product?: Product
  quantity: number
  unit_price: number
  total_price: number
}

export interface Production {
  id: string
  order_id: string
  order?: Order
  product_id: string
  product?: Product
  quantity: number
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  planned_start_date: string
  planned_end_date: string | null
  actual_start_date: string | null
  actual_end_date: string | null
}

export interface Account {
  id: string
  code: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  type: 'customer' | 'supplier'
  is_active: boolean
  created_at: string
  updated_at: string
}

// Permission Types
export interface Permission {
  page_path: string
  can_view: 0 | 1
  can_create: 0 | 1
  can_edit: 0 | 1
  can_delete: 0 | 1
}

// Stock Types
export interface StockMovement {
  id: string
  material_id: string
  product_id: string | null
  movement_type: 'in' | 'out' | 'transfer'
  quantity: number
  reference_type: string | null
  reference_id: string | null
  invoice_number: string | null
  shipment_number: string | null
  notes: string | null
  created_at: string
}

export interface StockAlert {
  id: string
  material_id: string
  level: 'warning' | 'critical'
  message: string
  status: 'open' | 'resolved'
  created_at: string
  resolved_at: string | null
}

// BOM Types
export interface BOM {
  id: string
  product_id: string
  version: number
  status: 'active' | 'draft' | 'archived'
  created_at: string
  updated_at: string
  items: BOMItem[]
}

export interface BOMItem {
  id: string
  bom_id: string
  material_id: string
  quantity: number
  unit_cost: number
  total_cost: number
}

// Invoice Types
export interface Invoice {
  id: string
  order_id: string | null
  shipment_id: string | null
  customer_id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  subtotal: number
  tax_amount: number
  total_amount: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  product_id: string
  quantity: number
  unit_price: number
  tax_rate: number
  tax_amount: number
  total_amount: number
}

// Shipment Types
export interface Shipment {
  id: string
  order_id: string
  customer_id: string
  shipment_number: string
  status: 'preparing' | 'ready' | 'shipped' | 'delivered' | 'cancelled'
  shipment_date: string | null
  tracking_number: string | null
  carrier: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ShipmentItem {
  id: string
  shipment_id: string
  product_id: string
  quantity: number
  serial_numbers: string[]
}

// Work Center Types
export interface WorkCenter {
  id: string
  code: string
  name: string
  description: string | null
  capacity: number
  status: 'active' | 'maintenance' | 'inactive'
  created_at: string
  updated_at: string
}

// Operation Types
export interface Operation {
  id: string
  code: string
  name: string
  description: string | null
  duration_minutes: number
  setup_time_minutes: number
  created_at: string
  updated_at: string
}

// Report Types
export interface StockSummary {
  total_products: number
  total_materials: number
  total_value: number
  low_stock_items: number
  critical_stock_items: number
}

export interface CostAnalysis {
  material_costs: number
  labor_costs: number
  overhead_costs: number
  total_costs: number
  profit_margin: number
}

// Utility Types
export type Create<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>
export type Update<T> = Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>
export type Id = string

// Filter Types
export interface DateRange {
  start: string
  end: string
}

export interface PaginationOptions {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface StockFilter {
  category?: string
  lowStock?: boolean
  criticalStock?: boolean
  dateRange?: DateRange
}

export interface OrderFilter {
  status?: string
  customer_id?: string
  dateRange?: DateRange
  pagination?: PaginationOptions
}

// Error Types
export interface AppError {
  code: string
  message: string
  statusCode: number
  details?: unknown
}

export interface ValidationError {
  field: string
  message: string
  value?: unknown
}

// Component Props Types
export interface TableColumn<T = any> {
  key: keyof T
  title: string
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
}

export interface FilterOption {
  value: string | number
  label: string
}

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

// Form Types
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'date' | 'checkbox'
  required?: boolean
  placeholder?: string
  options?: SelectOption[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
    custom?: (value: any) => string | null
  }
}

export interface FormConfig {
  fields: FormField[]
  initialValues?: Record<string, any>
  onSubmit: (values: Record<string, any>) => void | Promise<void>
  submitText?: string
  resetOnSubmit?: boolean
}