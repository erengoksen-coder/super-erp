process.env.NEXT_DISABLE_TURBO = '1'
process.env.NEXT_DISABLE_TURBOPACK = '1'

const { createServer: createHttpsServer } = require('https')
const { createServer: createHttpServer } = require('http')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')
const path = require('path')
const selfsigned = require('selfsigned')
const { networkInterfaces } = require('os')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const httpsPort = 3444
const httpPort = 3001
const httpPort3000 = 3000

// IP adresini otomatik algıla
function getLocalIP() {
  const interfaces = networkInterfaces()
  let ip = 'localhost'
  
  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name]
    if (!nets) continue
    
    for (const net of nets) {
      if (net.family === 'IPv4' && !net.internal) {
        ip = net.address
        break
      }
    }
    if (ip !== 'localhost') break
  }
  
  if (ip === 'localhost') {
    for (const name of Object.keys(interfaces)) {
      const nets = interfaces[name]
      if (!nets) continue
      
      for (const net of nets) {
        if (net.family === 'IPv4' && net.internal) {
          if (net.address.startsWith('192.168.') || net.address.startsWith('10.')) {
            ip = net.address
            break
          }
        }
      }
      if (ip !== 'localhost') break
    }
  }
  
  return ip
}

const localIP = getLocalIP()

// Sertifika dosyalarını kontrol et (mkcert ile oluşturulmuşsa onları kullan)
// mkcert dosya isimleri: localhost+2.pem ve localhost+2-key.pem
const certPath = path.join(__dirname, 'localhost+2.pem')
const keyPath = path.join(__dirname, 'localhost+2-key.pem')
// Alternatif isimler
const certPathAlt = path.join(__dirname, 'cert.pem')
const keyPathAlt = path.join(__dirname, 'key.pem')

let httpsOptions = {}

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  // mkcert sertifikası varsa onu kullan (daha güvenilir)
  console.log('✅ mkcert sertifikası bulundu, kullanılıyor')
  httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  }
} else if (fs.existsSync(certPathAlt) && fs.existsSync(keyPathAlt)) {
  // Alternatif sertifika dosyaları
  console.log('✅ Alternatif sertifika bulundu, kullanılıyor')
  httpsOptions = {
    key: fs.readFileSync(keyPathAlt),
    cert: fs.readFileSync(certPathAlt),
  }
} else {
  // Yoksa self-signed oluştur (IP adresini de ekle)
  console.log('⚠️  mkcert sertifikası bulunamadı, self-signed oluşturuluyor...')
  const attrs = [
    { name: 'commonName', value: 'localhost' },
    { name: 'countryName', value: 'TR' },
    { name: 'organizationName', value: 'Local Development' }
  ]
  
  // Alt names listesi (localhost, IP adresi, vs.)
  const altNames = [
    { type: 2, value: 'localhost' },
    { type: 2, value: '127.0.0.1' },
    { type: 7, ip: '127.0.0.1' },
    { type: 7, ip: '::1' },
  ]
  
  // Eğer IP adresi bulunduysa, onu da ekle
  if (localIP && localIP !== 'localhost') {
    altNames.push({ type: 2, value: localIP })
    altNames.push({ type: 7, ip: localIP })
    console.log(`📱 IP adresi sertifikaya eklendi: ${localIP}`)
  }
  
  const pems = selfsigned.generate(attrs, { 
    days: 365,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [
      {
        name: 'basicConstraints',
        cA: true,
      },
      {
        name: 'keyUsage',
        keyCertSign: true,
        digitalSignature: true,
        keyEncipherment: true,
      },
      {
        name: 'subjectAltName',
        altNames: altNames,
      },
    ],
  })
  httpsOptions = {
    key: pems.private,
    cert: pems.cert,
  }
}

// Next.js'i başlat
const app = next({ dev })
const handle = app.getRequestHandler()

 const publicPagePaths = new Set(['/auth/login', '/auth/register'])
 const publicApiPrefixes = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout', '/api/health', '/api/financial']
const adminPagePrefixes = ['/users']
const adminApiPrefixes = ['/api/users', '/api/admin']
const apiPermissionMap = new Map([
  ['/api/materials', '/inventory/materials'],
  ['/api/products', '/inventory/products'],
  ['/api/inventory', '/inventory'],
  ['/api/orders', '/orders'],
  ['/api/sales-orders', '/orders'],
  ['/api/purchase-orders', '/orders'],
  ['/api/production', '/production'],
  ['/api/work-orders', '/production/work-orders'],
  ['/api/shipments', '/shipments'],
  ['/api/accounts', '/accounts'],
  ['/api/payments', '/payments'],
  ['/api/barcodes', '/barcodes'],
  ['/api/purchase', '/purchase-requests'],
  ['/api/finance', '/finance'],
  ['/api/accounting', '/finance'],
  ['/api/bom', '/bom'],
  ['/api/units', '/units/conversions'],
  ['/api/notifications', '/notifications'],
  ['/api/operations', '/production/operations'],
  ['/api/work-centers', '/production/work-centers'],
  ['/api/reports', '/reports/costs'],
  ['/api/production/costs', '/reports/costs'],
])

function parseCookies(cookieHeader) {
  const cookies = {}
  if (!cookieHeader) return cookies
  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const [rawKey, ...rawValue] = part.split('=')
    const key = rawKey ? rawKey.trim() : ''
    if (!key) continue
    cookies[key] = decodeURIComponent(rawValue.join('=').trim())
  }
  return cookies
}

function isPublicPath(pathname) {
  if (publicPagePaths.has(pathname)) return true
  if (publicApiPrefixes.some((prefix) => pathname.startsWith(prefix))) return true
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/images/') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js'
  ) {
    return true
  }
  return false
}

function normalizeRole(role) {
  const raw = String(role || '').trim().toLowerCase()
  if (raw === 'admin' || raw === 'yönetici' || raw === 'yonetici') return 'admin'
  return raw
}

function mapApiPathToPermission(pathname) {
  let match = null
  for (const [prefix, permissionPath] of apiPermissionMap.entries()) {
    if (pathname.startsWith(prefix)) {
      if (!match || prefix.length > match.prefix.length) {
        match = { prefix, permission: permissionPath }
      }
    }
  }
  return match ? match.permission : null
}

function canAccessPath(permissions, pathname, action) {
  if (!Array.isArray(permissions) || !permissions.length) return false
  const matched = permissions
    .filter((perm) => {
      if (perm.page_path === '/') {
        return pathname === '/'
      }
      return pathname === perm.page_path || pathname.startsWith(`${perm.page_path}/`)
    })
    .sort((a, b) => b.page_path.length - a.page_path.length)[0]
  if (!matched) return false
  switch (action) {
    case 'create':
      return (matched.can_create ?? 0) > 0
    case 'edit':
      return (matched.can_edit ?? 0) > 0
    case 'delete':
      return (matched.can_delete ?? 0) > 0
    default:
      return (matched.can_view ?? 0) > 0
  }
}

function getActionFromMethod(method) {
  const normalized = String(method || 'GET').toUpperCase()
  if (normalized === 'GET' || normalized === 'HEAD' || normalized === 'OPTIONS') return 'view'
  if (normalized === 'POST') return 'create'
  if (normalized === 'PUT' || normalized === 'PATCH') return 'edit'
  if (normalized === 'DELETE') return 'delete'
  return 'view'
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET ortam değişkeni gerekli')
    }
    return new TextEncoder().encode('fallback-secret-degistir')
  }
  return new TextEncoder().encode(secret)
}

function setSecurityHeaders(res) {
  const supabaseOrigins = []
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (supabaseUrl) {
    try {
      const parsed = new URL(supabaseUrl)
      supabaseOrigins.push(parsed.origin)
      if (parsed.protocol === 'https:') {
        supabaseOrigins.push(`wss://${parsed.host}`)
      } else if (parsed.protocol === 'http:') {
        supabaseOrigins.push(`ws://${parsed.host}`)
      }
    } catch {
      // ignore invalid URL
    }
  }

  const connectSrc = ["'self'", "https://*.ngrok-free.dev", "https://*.ngrok.io", "https://*.ngrok-free.app", ...supabaseOrigins].join(' ')
  const imgSrc = ["'self'", "data:", "blob:", "https://ngrok.com", "https://*.ngrok.io", "https://*.ngrok-free.dev"].join(' ')
  const fontSrc = ["'self'", "https://cdn.ngrok.com", "https://assets.ngrok.com"].join(' ')

  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src ${imgSrc}; font-src ${fontSrc}; connect-src ${connectSrc}; frame-ancestors 'none';`
  )
}

async function authorizeRequest(req, res) {
  const url = new URL(req.url || '/', 'http://localhost')
  const pathname = url.pathname

  // Set security headers for all requests
  setSecurityHeaders(res)

  if (isPublicPath(pathname)) {
    return true
  }

  const cookies = parseCookies(req.headers.cookie || '')
  const token = cookies['auth-token'] || cookies.access_token
  if (!token) {
    if (pathname.startsWith('/api')) {
      res.statusCode = 401
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Yetkisiz' }))
      return false
    }
    res.statusCode = 302
    res.setHeader('Location', `/auth/login?redirect=${encodeURIComponent(pathname)}`)
    res.end()
    return false
  }

  const { jwtVerify } = await import('jose')
  let payload
  try {
    const verified = await jwtVerify(token, getJwtSecret())
    payload = verified.payload
  } catch {
    if (pathname.startsWith('/api')) {
      res.statusCode = 401
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Yetkisiz' }))
      return false
    }
    res.statusCode = 302
    res.setHeader('Location', '/auth/login')
    res.end()
    return false
  }

  const role = normalizeRole(payload?.role)
  const permissions = Array.isArray(payload?.permissions) ? payload.permissions : []

  if (
    adminPagePrefixes.some((prefix) => pathname.startsWith(prefix)) ||
    adminApiPrefixes.some((prefix) => pathname.startsWith(prefix))
  ) {
    if (role !== 'admin') {
      res.statusCode = 403
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Yetkisiz' }))
      return false
    }
  }

  if (role !== 'admin') {
    const action = getActionFromMethod(req.method)
    if (pathname.startsWith('/api')) {
      const permissionPath = mapApiPathToPermission(pathname)
      if (!permissionPath || !canAccessPath(permissions, permissionPath, action)) {
        res.statusCode = 403
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Yetkisiz' }))
        return false
      }
    } else {
      const isOrdersChild =
        pathname === '/sales-orders' ||
        pathname.startsWith('/sales-orders/') ||
        pathname === '/purchase-orders' ||
        pathname.startsWith('/purchase-orders/')
      if (isOrdersChild && canAccessPath(permissions, '/orders', 'view')) {
        return true
      }
      if (!canAccessPath(permissions, pathname, 'view')) {
      res.statusCode = 302
      res.setHeader('Location', '/')
      res.end()
      return false
      }
    }
  }

  return true
}

app.prepare().then(() => {
  // HTTPS sunucu (kamera için)
  const httpsServer = createHttpsServer(
    httpsOptions,
    async (req, res) => {
      try {
        const allowed = await authorizeRequest(req, res)
        if (!allowed) return
        const parsedUrl = parse(req.url, true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('Error occurred handling', req.url, err)
        res.statusCode = 500
        res.end('internal server error')
      }
    }
  )
  
  // HTTP sunucu (manuel giriş için - yedek)
  const httpServer = createHttpServer(
    async (req, res) => {
      try {
        const allowed = await authorizeRequest(req, res)
        if (!allowed) return
        const parsedUrl = parse(req.url, true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('Error occurred handling', req.url, err)
        res.statusCode = 500
        res.end('internal server error')
      }
    }
  )
  
  // HTTPS sunucuyu başlat
  httpsServer.listen(httpsPort, hostname, (err) => {
    if (err) {
      console.error('❌ HTTPS sunucu başlatılamadı:', err)
    } else {
      console.log(`\n> ✅ HTTPS sunucu başlatıldı! (Kamera için)`)
      console.log(`> 📱 Bilgisayar: https://localhost:${httpsPort}`)
      if (localIP && localIP !== 'localhost') {
        console.log(`> 📱 Telefon: https://${localIP}:${httpsPort}`)
      }
      console.log(`> ⚠️  Sertifika uyarısında 'Gelişmiş' > 'Devam Et' seçin`)
    }
  })
  
  // HTTP sunucuyu başlat (yedek - manuel giriş için)
  httpServer.listen(httpPort, hostname, (err) => {
    if (err) {
      console.error('❌ HTTP sunucu başlatılamadı:', err)
    } else {
      console.log(`\n> ✅ HTTP sunucu başlatıldı! (Manuel giriş için)`)
      console.log(`> 📱 Bilgisayar: http://localhost:${httpPort}`)
      if (localIP && localIP !== 'localhost') {
        console.log(`> 📱 Telefon: http://${localIP}:${httpPort}`)
      }
      console.log(`> 💡 HTTP'de kamera çalışmaz, manuel barkod girişi kullanın\n`)
    }
  })
  
  // Port 3000'de de HTTP sunucu başlat (Next.js default port)
  const httpServer3000 = createHttpServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })
  
  httpServer3000.listen(httpPort3000, hostname, (err) => {
    if (err) {
      console.error('❌ HTTP sunucu (port 3000) başlatılamadı:', err)
    } else {
      console.log(`\n> ✅ HTTP sunucu (port 3000) başlatıldı!`)
      console.log(`> 📱 Bilgisayar: http://localhost:${httpPort3000}`)
      if (localIP && localIP !== 'localhost') {
        console.log(`> 📱 Telefon: http://${localIP}:${httpPort3000}`)
      }
    }
  })
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing servers')
    httpsServer.close(() => {
      console.log('HTTPS server closed')
    })
    httpServer.close(() => {
      console.log('HTTP server closed')
    })
    httpServer3000.close(() => {
      console.log('HTTP server (3000) closed')
    })
  })
  
  process.on('SIGINT', () => {
    console.log('\nSIGINT signal received: closing servers')
    httpsServer.close(() => {
      console.log('HTTPS server closed')
    })
    httpServer.close(() => {
      console.log('HTTP server closed')
    })
    httpServer3000.close(() => {
      console.log('HTTP server (3000) closed')
      process.exit(0)
    })
  })
})
