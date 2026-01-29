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
const httpsPort = 3443
const httpPort = 3000

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

app.prepare().then(() => {
  // HTTPS sunucu (kamera için)
  const httpsServer = createHttpsServer(
    httpsOptions,
    async (req, res) => {
      try {
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
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing servers')
    httpsServer.close(() => {
      console.log('HTTPS server closed')
    })
    httpServer.close(() => {
      console.log('HTTP server closed')
    })
  })
  
  process.on('SIGINT', () => {
    console.log('\nSIGINT signal received: closing servers')
    httpsServer.close(() => {
      console.log('HTTPS server closed')
    })
    httpServer.close(() => {
      console.log('HTTP server closed')
      process.exit(0)
    })
  })
})
