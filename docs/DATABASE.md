# Database Documentation — Super ERP (SQLite)

**Engine:** `better-sqlite3` (local SQLite file)  
**Primary DB:** `data/erp.db`  
**ORM:** None (raw SQL via prepared statements)  
**Migration Tool:** Custom migration scripts in `/migrations`

---

## Table Groups

### 🔐 Authentication & Users
| Table | Description |
|-------|-------------|
| `users` | Core user accounts (id, username, role, password_hash, is_approved, is_locked) |
| `user_permissions` | Page-level CRUD permissions per user |
| `user_sessions` | Active JWT session tracking |
| `user_roles` | Many-to-many user → role mapping |
| `roles` | Role definitions |
| `permissions` | Permission definitions |
| `role_permissions` | Role → permission mapping |
| `password_reset_tokens` | Tokens for password recovery |
| `user_notification_preferences` | Per-user notification settings |

### 🏢 Organization
| Table | Description |
|-------|-------------|
| `companies` | Multi-company support |
| `branches` | Company branches |
| `app_settings` | App-wide settings (telegram, notifications, etc.) |
| `system_settings` | System-level configuration |
| `_app_meta` | Internal versioning metadata |
| `audit_logs` | Full audit trail of all write operations |
| `announcements` | System announcements |

### 📦 Inventory
| Table | Description |
|-------|-------------|
| `materials` | Raw materials catalog |
| `material_stocks` | Stock levels per material/warehouse |
| `material_prices` | Material purchase price history |
| `material_reservations` | Stock reservations for production |
| `products` | Finished goods catalog |
| `product_serial_numbers` | Serial number tracking per product |
| `stock_movements` | All stock in/out movements |
| `stock_alerts` | Low-stock threshold alerts |
| `stock_counts` | Inventory count sessions |
| `stock_count_items` | Items within a stock count |
| `stock_transfers` | Inter-warehouse transfer records |
| `stock_transfer_items` | Line items for transfers |
| `stock_reservations` | Reservations per order |
| `warehouses` | Warehouse definitions |
| `warehouse_locations` | Bin/shelf locations within warehouses |
| `unit_conversions` | Unit conversion rules |

### 🛒 Sales
| Table | Description |
|-------|-------------|
| `orders` | Core sales orders |
| `order_items` | Line items within orders |
| `order_approvals` | Approval records per order |
| `approval_rules` | Auto-approval threshold rules |
| `approval_requests` | Pending approval requests |
| `sales_orders` | Extended sales order records |
| `sales_order_items` | Line items for sales orders |
| `quotations` | Price quotations / teklif |
| `quotation_items` | Items within quotations |
| `price_lists` | Price list definitions |
| `price_list_items` | Products and prices per list |
| `customer_groups` | Customer segmentation groups |
| `customer_returns` | Return (iade) records |
| `customer_return_items` | Line items for returns |
| `dealer_targets` | Monthly/quarterly dealer targets |

### 🏭 Production
| Table | Description |
|-------|-------------|
| `production_orders` | Manufacturing orders |
| `production_order_operations` | Operations within a production order |
| `production_order_times` | Time tracking per operation |
| `production_actual_consumption` | Actual material consumption |
| `production_costs` | Cost breakdown per order |
| `mobile_scan_results` | Barcode scan results from mobile workstations |
| `bom` | Bill of Materials |
| `bom_versions` | BOM version control |
| `operations` | Standard operations catalog |
| `work_centers` | Production work centers |
| `work_orders` | Work orders linked to production |
| `work_order_operations` | Operations within work orders |
| `personnel` | Production floor personnel |

### 🚚 Logistics
| Table | Description |
|-------|-------------|
| `shipments` | Outbound shipment records |
| `shipment_items` | Items within shipments |
| `waybills` | İrsaliye (delivery note) records |
| `waybill_items` | Line items for waybills |

### 🛍️ Purchasing
| Table | Description |
|-------|-------------|
| `purchase_requests` | Internal purchase requests |
| `purchase_orders` | Purchase orders sent to suppliers |
| `purchase_order_items` | Line items for purchase orders |

### 💰 Finance
| Table | Description |
|-------|-------------|
| `invoices` | Sales / purchase invoices |
| `invoice_items` | Line items for invoices |
| `e_invoice_integrations` | E-invoice provider config |
| `e_invoice_logs` | E-invoice transmission logs |
| `chart_of_accounts` | Muhasebe hesap planı |
| `journal_entries` | Yevmiye fişleri |
| `journal_entry_lines` | Muhasebe fişi satırları |
| `general_ledger` | Büyük defter kayıtları |
| `account_transactions` | Cari hesap hareketleri |
| `cash_boxes` | Kasa tanımları |
| `banks` | Banka hesapları |
| `payments` | Tahsilat / ödeme kayıtları |
| `checks_and_notes` | Çek ve senet takibi |
| `budgets` | Bütçe tanımları |
| `actual_expenses` | Gerçekleşen giderler |
| `currency_rates` | Döviz kur geçmişi |

### 🤝 CRM
| Table | Description |
|-------|-------------|
| `crm_opportunities` | Fırsatlar / Teklifler |
| `crm_leads` | Potansiyel müşteriler |

### 📋 Quality & HR
| Table | Description |
|-------|-------------|
| `quality_controls` | Kalite kontrol kayıtları |
| `service_tickets` | Servis/destek talepleri |
| `hr_leave_requests` | İzin talepleri |
| `hr_payroll_records` | Maaş bordroları |
| `hr_employee_documents` | Çalışan belgeleri |

### 🔔 Notifications & Integrations
| Table | Description |
|-------|-------------|
| `notifications` | In-app bildirimler |
| `push_subscriptions` | PWA push abonelikleri |
| `direct_messages` | Kullanıcılar arası mesajlar |
| `webhooks` | Webhook tanımları |
| `webhook_endpoints` | Webhook endpoint kayıtları |
| `documents` | Belge / dosya kayıtları |
| `contracts` | Sözleşme kayıtları |

---

## Key Relationships

```
users           ──< user_permissions
users           ──< user_sessions
users           ──< audit_logs
orders          ──< order_items
orders          ──< order_approvals
orders          ──< shipments
orders          ──< production_orders
production_orders ──< production_order_operations
production_orders ──< production_actual_consumption
materials       ──< material_stocks
materials       ──< bom
bom             ──< bom_versions
purchase_orders ──< purchase_order_items
invoices        ──< invoice_items
waybills        ──< waybill_items
```

---

## Common Column Conventions

| Column | Type | Convention |
|--------|------|------------|
| `id` | TEXT (UUID) | `crypto.randomUUID()` at insert |
| `created_at` | TEXT | `CURRENT_TIMESTAMP` default |
| `updated_at` | TEXT | Updated via trigger or app logic |
| `deleted_at` | TEXT | Soft-delete (NULL = active) |
| `is_approved` | INTEGER | `1` = approved, `0` = pending |
| `is_locked` | INTEGER | `1` = locked, `0` = active |
| `status` | TEXT | Enum-like string (e.g., `active`, `completed`, `cancelled`) |

---

## Notes

> [!NOTE]
> This database is a **single SQLite file** at `data/erp.db`. For production environments with high concurrency, consider migrating to a client/server database (PostgreSQL) in a future phase.

> [!TIP]
> Always use **prepared statements** when querying to prevent SQL injection. The project uses `db.prepare().get()`, `db.prepare().all()`, and `db.prepare().run()` throughout `lib/database/`.

> [!CAUTION]
> The `accounts_backup` table is a legacy backup copy and should not be used in production queries. Treat as read-only.
