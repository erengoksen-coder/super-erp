const base = 'http://localhost:3000';

async function login(){
  const res = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin1234' }),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error('LOGIN FAIL', res.status, text.slice(0, 200));
    process.exit(1);
  }
  const setCookie = res.headers.getSetCookie
    ? res.headers.getSetCookie()
    : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : []);
  const cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
  if (!cookie) {
    console.error('LOGIN NO COOKIE');
    process.exit(1);
  }
  return cookie;
}

async function fetchJson(path, headers){
  const res = await fetch(base + path, { headers });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { res, text, json };
}

async function sendJson(method, path, headers, body){
  const res = await fetch(base + path, {
    method,
    headers,
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { res, text, json };
}

function unwrapList(json){
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (json.data && Array.isArray(json.data)) return json.data;
  if (json.data && Array.isArray(json.data.data)) return json.data.data;
  return [];
}

(async()=>{
  const cookie = await login();
  const headers = { Cookie: cookie, 'Content-Type': 'application/json' };

  async function findProductionCandidate(){
    const productsRes = await fetchJson('/api/products', { Cookie: cookie });
    const products = unwrapList(productsRes.json);
    if (!products.length) return null;

    const materialsRes = await fetchJson('/api/materials', { Cookie: cookie });
    const materials = unwrapList(materialsRes.json);
    const materialMap = new Map(materials.map((m) => [m.id, m]));

    for (const product of products) {
      const bomRes = await fetchJson('/api/bom?product_id=' + product.id, { Cookie: cookie });
      const bomItems = Array.isArray(bomRes.json) ? bomRes.json : [];
      if (!bomItems.length) continue;

      let ok = true;
      for (const item of bomItems) {
        const material = materialMap.get(item.material_id);
        if (!material) { ok = false; break; }
        const fromUnit = (item.unit || item.material_unit || '').toString();
        const toUnit = (item.material_unit || '').toString();
        if (fromUnit && toUnit && fromUnit !== toUnit) { ok = false; break; }
        const fire = Number(item.fire_percentage || 0);
        const required = (Number(item.quantity_required || 0) || 0) * (1 + fire / 100);
        const available = (Number(material.stock_amount || 0) || 0) - (Number(material.reserved_quantity || 0) || 0);
        if (available < required) { ok = false; break; }
      }
      if (ok) return { productId: product.id };
    }

    return null;
  }

  // Orders create (transaction test) + cleanup
  const orderNumber = `TEST-${Date.now()}`;
  const orderBody = {
    orders: [
      {
        order_number: orderNumber,
        product_name: 'Test Ürün',
        quantity: 1,
        unit_price: 1,
        dealer_name: 'Test Bayi',
        customer_name: 'Test Müşteri',
      },
    ],
  };
  const orderCreate = await sendJson('POST', '/api/orders', headers, orderBody);
  console.log('orders create', orderCreate.res.status, (orderCreate.text || '').slice(0, 140));
  const createdOrderId = orderCreate.json?.data?.orders?.[0]?.id || orderCreate.json?.orders?.[0]?.id;
  if (createdOrderId) {
    const orderDelete = await fetch(base + '/api/orders?id=' + createdOrderId, {
      method: 'DELETE',
      headers,
    });
    console.log('orders delete', orderDelete.status, (await orderDelete.text()).slice(0, 140));
  }

  // Production create (barcode race test) - pick product with sufficient stock
  const candidate = await findProductionCandidate();
  if (candidate?.productId) {
    const prodBody = {
      order_number: `PROD-${Date.now()}`,
      product_id: candidate.productId,
      quantity: 1,
    };
    const prodCreate = await sendJson('POST', '/api/production', headers, prodBody);
    console.log('production create', prodCreate.res.status, (prodCreate.text || '').slice(0, 140));
  } else {
    console.log('production create: skipped (no product with sufficient stock)');
  }

  // Shipments: status + tax (no-op)
  const shipmentsRes = await fetchJson('/api/shipments', { Cookie: cookie });
  const shipments = unwrapList(shipmentsRes.json);
  if (shipments.length) {
    const shipmentId = shipments[0].id;
    const detailRes = await fetchJson('/api/shipments/' + shipmentId, { Cookie: cookie });
    const detail = detailRes.json?.data ?? detailRes.json;
    const currentStatus = detail?.status || shipments[0].status;
    const cancelReason = detail?.cancel_reason || null;
    const statusBody = currentStatus === 'cancelled'
      ? { status: currentStatus, cancel_reason: cancelReason || 'Test iptal nedeni' }
      : { status: currentStatus };
    const statusRes = await fetch(base + '/api/shipments/' + shipmentId + '/status', {
      method: 'PATCH',
      headers,
      body: JSON.stringify(statusBody),
    });
    console.log('shipments status', statusRes.status, (await statusRes.text()).slice(0, 140));

    const taxRate = detail?.tax_rate ?? shipments[0]?.tax_rate ?? 0;
    const taxRes = await fetch(base + '/api/shipments/' + shipmentId + '/tax', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ tax_rate: taxRate }),
    });
    console.log('shipments tax', taxRes.status, (await taxRes.text()).slice(0, 140));
  } else {
    console.log('shipments: no data');
  }

  // Users status (no-op)
  const usersRes = await fetchJson('/api/users', { Cookie: cookie });
  const users = unwrapList(usersRes.json);
  const nonAdmin = users.find((u) => String(u.role || '').toLowerCase() !== 'admin');
  const user = nonAdmin || users[0];
  if (user) {
    const status = user.is_approved ? 'approved' : 'pending';
    const res = await fetch(base + '/api/users/' + user.id + '/status', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    });
    console.log('users status', res.status, (await res.text()).slice(0, 140));
  } else {
    console.log('users: no data');
  }

  // Work-order operation (no-op)
  const workOrdersRes = await fetchJson('/api/work-orders', { Cookie: cookie });
  const workOrders = unwrapList(workOrdersRes.json);
  if (workOrders.length) {
    const woId = workOrders[0].id;
    const woDetail = await fetchJson('/api/work-orders/' + woId, { Cookie: cookie });
    const ops = woDetail.json?.operations || [];
    const op = ops.find((o) => o.status === 'pending') || ops[0];
    if (op) {
      const res = await fetch(base + '/api/work-orders/' + woId + '/operations', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ station: op.station, status: op.status }),
      });
      console.log('work-orders operations', res.status, (await res.text()).slice(0, 140));
    } else {
      console.log('work-orders: no operations');
    }
  } else {
    console.log('work-orders: no data');
  }

  // Stock-counts status (no-op)
  const countsRes = await fetchJson('/api/stock-counts', { Cookie: cookie });
  const counts = unwrapList(countsRes.json);
  if (counts.length) {
    const count = counts[0];
    const res = await fetch(base + '/api/stock-counts/' + count.id, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: count.status }),
    });
    console.log('stock-counts', res.status, (await res.text()).slice(0, 140));
  } else {
    console.log('stock-counts: no data');
  }
})();
