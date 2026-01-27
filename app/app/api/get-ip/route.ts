import { NextResponse } from 'next/server'
import { networkInterfaces } from 'os'

// GET: Bilgisayarın yerel IP adresini döndür
export async function GET() {
  try {
    const interfaces = networkInterfaces()
    let ip = 'localhost'

    // Tüm ağ arayüzlerini kontrol et
    for (const name of Object.keys(interfaces)) {
      const nets = interfaces[name]
      if (!nets) continue

      for (const net of nets) {
        // IPv4 ve internal olmayan (dış ağ) veya internal (yerel ağ) adresleri al
        if (net.family === 'IPv4' && !net.internal) {
          ip = net.address
          break
        }
      }
      if (ip !== 'localhost') break
    }

    // Eğer dış IP bulunamazsa, internal IP'yi ara
    if (ip === 'localhost') {
      for (const name of Object.keys(interfaces)) {
        const nets = interfaces[name]
        if (!nets) continue

        for (const net of nets) {
          if (net.family === 'IPv4' && net.internal) {
            // 192.168.x.x veya 10.x.x.x gibi yerel ağ adreslerini tercih et
            if (net.address.startsWith('192.168.') || net.address.startsWith('10.')) {
              ip = net.address
              break
            }
          }
        }
        if (ip !== 'localhost') break
      }
    }

    return NextResponse.json({ ip })
  } catch (error: any) {
    return NextResponse.json({ ip: 'localhost', error: error.message }, { status: 500 })
  }
}

