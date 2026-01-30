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

  const ordersRes = await fetch(base + '/api/orders', { headers: { Cookie: cookie } })
  const ordersText = await ordersRes.text()
  let ordersJson = null
  try { ordersJson = JSON.parse(ordersText) } catch {}
  const orders = ordersJson?.data || ordersJson || []
  if (!Array.isArray(orders) || orders.length === 0) {
    console.log('No orders to delete')
    return
  }

  const order = orders[0]
  const delRes = await fetch(base + `/api/orders?id=${order.id}`, {
    method: 'DELETE',
    headers: { Cookie: cookie },
  })
  const delText = await delRes.text()
  console.log('DELETE', delRes.status, delText.slice(0, 200))

  const Database = require('better-sqlite3')
  const db = new Database('data/erp.db')
  const rows = db.prepare(`
    SELECT table_name, record_id, action, user_id, created_at,
           COALESCE(new_data, after_data) as new_data
    FROM audit_logs
    WHERE table_name = 'orders' AND record_id = ?
    ORDER BY created_at DESC
    LIMIT 3
  `).all(order.id)
  console.log('audit_logs', rows)
  db.close()
})()
