# API Documentation — Super ERP

**Base URL:** `http://localhost:3000/api`  
**Auth:** HTTP-only cookie (`auth-token` JWT)  
**Format:** `application/json`

---

## Authentication

### POST /api/auth/login
Login and obtain a session token.

**Request Body:**
```json
{ "username": "admin", "password": "admin1234" }
```

**Success 200:**
```json
{ "success": true, "data": { "user": { "id": "...", "username": "admin", "role": "admin" } } }
```

**Error 401:**
```json
{ "success": false, "error": "Kullanıcı adı veya şifre hatalı" }
```

---

### POST /api/auth/logout
Clears the session cookie.

**Success 200:**
```json
{ "success": true, "data": {} }
```

---

### GET /api/auth/me
Returns the currently authenticated user and their permissions.

**Auth:** Required  

**Success 200:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "admin",
      "role": "admin",
      "permissions": [{ "page_path": "/orders", "can_view": 1, "can_create": 1 }]
    }
  }
}
```

---

## Users

### GET /api/users
Get all users. Admin only.

**Query Params:** `?page=1&limit=50&role=admin&search=ali`

**Success 200:**
```json
{
  "success": true,
  "data": { "users": [...], "total": 42 }
}
```

---

### POST /api/users
Create a new user. Admin only.

**Request Body:**
```json
{
  "username": "newuser",
  "password": "StrongPass1",
  "role": "user",
  "email": "user@example.com",
  "full_name": "Ali Veli"
}
```

**Error 400 (validation):**
```json
{ "success": false, "error": "Şifre en az 8 karakter olmalı" }
```

---

### PATCH /api/users/:id/status
Approve, lock, or unlock a user. Admin only.

**Request Body:**
```json
{ "action": "approve" }
```
Actions: `approve` | `lock` | `unlock`

---

## Orders

### GET /api/orders
Fetch all orders with optional filters.

**Query Params:** `?page=1&limit=50&status=pending&search=ahmet`

**Success 200:**
```json
{
  "success": true,
  "data": { "orders": [...] },
  "meta": { "total": 120, "limit": 50, "offset": 0 }
}
```

---

### POST /api/orders
Create a new order.

**Request Body:**
```json
{
  "customer_name": "Ahmet Müşteri",
  "dealer_name": "İstanbul Bayi",
  "product_name": "Koltuk Takımı",
  "configuration": "L Şekli",
  "fabric_code": "Gri-1023",
  "quantity": 2,
  "unit_price": 15000,
  "order_date": "2026-04-24"
}
```

---

## Standard Error Responses

| HTTP Status | Error Type | When |
|-------------|-----------|------|
| 400 | Validation Error | Invalid input (Zod) |
| 401 | Auth Error | Missing or expired token |
| 403 | Forbidden Error | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Rate Limit | Too many requests |
| 500 | Server Error | Unexpected exception |

**Error format:**
```json
{ "success": false, "error": "Human-readable message" }
```

---

## Rate Limiting

- **Global API limit:** 500 requests / minute per IP
- **Auth endpoints:** Stricter limits apply via middleware
- **Response on limit:** `HTTP 429` with `{ "error": "Çok fazla istek. Lütfen bekleyin." }`
