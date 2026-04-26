export default function TestPage() {
  return (
    <div style={{ 
      backgroundColor: '#030303', 
      color: '#ffffff', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'sans-serif'
    }}>
      <h1 style={{ fontSize: '4rem', fontWeight: '900', margin: 0 }}>SİSTEM AKTİF</h1>
      <p style={{ opacity: 0.5, letterSpacing: '0.2em' }}>DIAGNOSTIC MODE • PORT 3007</p>
      <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}>
        Eğer bu yazıyı görüyorsanız, sunucu bağlantısı mükemmeldir.
      </div>
    </div>
  )
}
