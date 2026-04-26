'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, AlertCircle, Volume2, VolumeX } from 'lucide-react'
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { VortexBackground } from '@/components/auth/VortexBackground'
import { useAgiAudio } from '@/lib/hooks/useAgiAudio'

function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  // 3D Parallax Mouse Tracking
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Smooth Springs
  const springX = useSpring(mouseX, { damping: 20, stiffness: 100 })
  const springY = useSpring(mouseY, { damping: 20, stiffness: 100 })

  // Derived Transforms
  const rotateX = useTransform(springY, [-0.5, 0.5], [10, -10])
  const rotateY = useTransform(springX, [-0.5, 0.5], [-10, 10])
  const x = useTransform(springX, [-0.5, 0.5], [-15, 15])
  const y = useTransform(springY, [-0.5, 0.5], [-15, 15])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth) - 0.5)
      mouseY.set((e.clientY / window.innerHeight) - 0.5)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim()) {
      toast.warning('E-posta adresinizi girin')
      return
    }
    setLoading(true)
    try {
      const res = await fetchApi<{ message?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      setSent(true)
      toast.success(res?.message || 'E-posta gÃ¶nderildi')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ä°ÅŸlem baÅŸarÄ±sÄ±z'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div 
      style={{ rotateX, rotateY, x, y, perspective: 1000 }}
      className="w-full max-w-md relative z-10 glass rounded-[2rem] border border-white/5 p-10 shadow-2xl backdrop-blur-2xl bg-white/5"
    >
      <div className="text-center mb-8">
        <div className="relative inline-block mb-4">
           <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
           <img 
             src="/logo.png" 
             alt="LIVASOFA" 
             className="relative z-10 w-auto h-20 mx-auto object-contain shadow-2xl" 
             fetchPriority="high"
             loading="eager"
             onError={(e) => { 
                const t = e.target as HTMLImageElement; 
                if (t && t.src !== '/LOGO-2.png') t.src = '/LOGO-2.png'; 
             }} 
           />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Kurtarma PortalÄ±</h1>
        <p className="text-gray-400 text-sm mt-1">Åifrenizi SÄ±fÄ±rlayÄ±n</p>
      </div>
      
      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8 relative"
          >
            <div className="absolute -inset-0.5 bg-red-500/20 rounded-lg blur shadow-[0_0_15px_rgba(239,68,68,0.2)]" />
            <div className="relative bg-black/40 border border-red-500/50 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-md">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 animate-pulse" />
              <div className="text-red-200 text-sm font-medium">{error}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {sent ? (
        <div className="space-y-6">
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-300 text-sm text-center">
            E-posta adresinize ÅŸifre sÄ±fÄ±rlama linki gÃ¶nderdik.
          </div>
          <Link
            href="/auth/login"
            className="w-full flex items-center justify-center gap-2 text-primary hover:text-white transition-all text-sm font-bold uppercase tracking-widest pt-2"
          >
            <ArrowLeft className="w-4 h-4" />
            GiriÅŸ EkranÄ±na DÃ¶n
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-2">
              E-posta Adresiniz
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kayitli@eposta.com"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-transparent outline-none transition-all placeholder:text-gray-700"
                required
                autoComplete="email"
              />
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition uppercase tracking-widest text-sm shadow-xl shadow-primary/20"
          >
            {loading ? 'Ä°letiliyor...' : 'SIFIRLAMA LÄ°NKÄ° GÃ–NDER'}
          </motion.button>
          
          <div className="text-center pt-2">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              GiriÅŸe DÃ¶n
            </Link>
          </div>
        </form>
      )}
      <p className="mt-8 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest opacity-50">LIVASOFTWARE SÄ°STEM BÃœTÃœNLÃœÄÃœ</p>
    </motion.div>
  )
}

export default function ForgotPasswordPage() {
  const [showSplash, setShowSplash] = useState(true)
  const { initAudio, toggleMute, isMuted, isInitialized } = useAgiAudio()

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1500)
    return () => clearTimeout(t)
  }, [])

  return (
    <Suspense fallback={
       <div className="min-h-screen bg-[#030303] flex items-center justify-center">
         <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
       </div>
    }>
      <div 
        className="min-h-screen bg-[#030303] flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-primary/30"
        onClick={() => initAudio()}
      >
        <VortexBackground />

        {/* Agi-Audio Kontrol */}
        <button
           onClick={(e) => { e.stopPropagation(); initAudio(); toggleMute(); }}
           className="absolute bottom-8 right-8 z-50 p-3 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all group"
           aria-label={isMuted ? 'Sesi AÃ§' : 'Sesi Kapat'}
        >
           {isMuted || !isInitialized ? (
               <VolumeX className="w-5 h-5 text-gray-400 group-hover:text-white" />
           ) : (
               <Volume2 className="w-5 h-5 text-primary animate-pulse" />
           )}
        </button>

        {/* AÃ§Ä±lÄ±ÅŸ Splash */}
        {showSplash && (
          <div className="absolute inset-0 bg-[#030303] z-50 flex items-center justify-center transition-opacity duration-1000">
             <div className="relative">
                <div className="w-24 h-24 rounded-full border-b-2 border-primary animate-spin" />
                <img 
                  src="/logo.png" 
                  alt="LIVASOFA" 
                  className="absolute inset-0 w-24 h-24 object-contain p-4 shadow-2xl shadow-primary/20" 
                  fetchPriority="high"
                  loading="eager"
                />
             </div>
          </div>
        )}

        <div className={`transition-all duration-1000 ${showSplash ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          <ForgotPasswordForm />
        </div>
      </div>
    </Suspense>
  )
}

