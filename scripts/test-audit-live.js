const base = 'http://localhost:3000'

;(async()=>{
  const login = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin1234' }),
  })
  const loginText = await login.text()
  if (!login.ok) {
    console.error('LOGIN FAIL', login.status, loginText.slice(0, 200))
    process.exit(1)
  }
  const setCookie = login.headers.getSetCookie
    ? login.headers.getSetCookie()
    : (login.headers.get('set-cookie') ? [login.headers.get('set-cookie')] : [])
  const cookie = setCookie.map((c) => c.split(';')[0]).join('; ')

  const productsRes = await fetch(base + '/api/products', { headers: { Cookie: cookie } })
  const productsText = await productsRes.text()
  let productsJson = null
  try { productsJson = JSON.parse(productsText) } catch {}
  const products = productsJson?.data || productsJson || []
  if (!Array.isArray(products) || products.length === 0) {
    console.log('No products to create test order')
    return
  }
  const product = products[0]

  const orderBody = {
    orders: [{
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      quantity: 1,
      unit_price: 1,
      dealer_name: 'TEST DEALER',
      customer_name: 'TEST CUSTOMER',
      order_date: new Date().toISOString().slice(0, 10),
      notes: 'Audit test order',
    }],
  }

  const createRes = await fetch(base + '/api/orders', {
    method: 'POST',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify(orderBody),
  })
  const createText = await createRes.text()
  console.log('CREATE', createRes.status, createText.slice(0, 200))
  let createJson = null
  try { createJson = JSON.parse(createText) } catch {}
  const createdOrderId = createJson?.orders?.[0]?.id || createJson?.data?.orders?.[0]?.id
  if (!createdOrderId) {
    console.log('Order not created; abort delete')
    return
  }

  const delRes = await fetch(base + `/api/orders?id=${createdOrderId}`, {
    method: 'DELETE',
    headers: { Cookie: cookie },
  })
  const delText = await delRes.text()
  console.log('DELETE', delRes.status, delText.slice(0, 200))

  const Database = require('better-sqlite3')
  const db = new Database('data/erp.db')
  const rows = db.prepare(`
    SELECT table_name, record_id, action, user_id, created_at,
           COALESCE(new_data, after_data) as new_data,
           COALESCE(old_data, before_data) as old_data
    FROM audit_logs
    WHERE table_name = 'orders' AND record_id = ?
    ORDER BY created_at DESC
    LIMIT 5
  `).all(createdOrderId)
  console.log('audit_logs', rows)
  db.close()
})()
