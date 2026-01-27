import { NextResponse } from 'next/server'

// GET: ngrok URL'ini döndür (eğer varsa)
// ngrok web interface'inden URL'i alır
export async function GET() {
  try {
    // ngrok web interface'i genelde 127.0.0.1:4040'da çalışır
    const ngrokApiUrl = 'http://127.0.0.1:4040/api/tunnels'
    
    try {
      const response = await fetch(ngrokApiUrl, {
        cache: 'no-store',
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Tunnels listesinden HTTPS URL'ini bul
        if (data.tunnels && data.tunnels.length > 0) {
          const httpsTunnel = data.tunnels.find((tunnel: any) => 
            tunnel.proto === 'https' && tunnel.config.addr === 'http://localhost:3000'
          )
          
          if (httpsTunnel && httpsTunnel.public_url) {
            return NextResponse.json({ 
              ngrokUrl: httpsTunnel.public_url,
              found: true 
            })
          }
        }
      }
    } catch (error) {
      // ngrok çalışmıyor veya erişilemiyor
      console.log('ngrok API erişilemedi:', error)
    }
    
    return NextResponse.json({ 
      ngrokUrl: null,
      found: false 
    })
  } catch (error: any) {
    return NextResponse.json({ 
      ngrokUrl: null,
      found: false,
      error: error.message 
    })
  }
}

