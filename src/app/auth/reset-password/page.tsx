'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, ArrowLeft, Eye, EyeOff, Volume2, VolumeX, ShieldAlert } from 'lucide-react'
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { VortexBackground } from '@/components/auth/VortexBackground'
import { useAgiAudio } from '@/lib/hooks/useAgiAudio'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
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
    if (!token) {
      toast.warning('GeÃ§ersiz link. E-posta ile gelen linki kullanÄ±n.')
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth) - 0.5)
      mouseY.set((e.clientY / window.innerHeight) - 0.5)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [token, mouseX, mouseY])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!token) {
      toast.warning('GeÃ§ersiz link')
      return
    }
    if (newPassword.length < 8) {
      toast.warning('Åifre en az 8 karakter olmalÄ±dÄ±r')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.warning('Åifreler eÅŸleÅŸmiyor')
      return
    }
    setLoading(true)
    try {
      await fetchApi('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })
      toast.success('Åifreniz gÃ¼ncellendi')
      router.push('/auth/login')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bir hata oluÅŸtu'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <motion.div 
        style={{ rotateX, rotateY, x, y, perspective: 1000 }}
        className="w-full max-w-md relative z-10 glass rounded-[2rem] border border-white/5 p-10 shadow-2xl backdrop-blur-2xl bg-white/5 text-center"
      >
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4 animate-pulse" />
        <h2 className="text-xl font-bold text-white mb-2">GeÃ§ersiz Link</h2>
        <p className="text-gray-400 mb-8 text-sm">Eksik veya sÃ¼resi dolmuÅŸ ÅŸifre sÄ±fÄ±rlama talebi.</p>
        <div className="flex flex-col gap-4">
          <Link href="/auth/forgot-password" virtual-link="true" className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition text-sm">
            Yeni Link Talep Et
          </Link>
          <Link href="/auth/login" virtual-link="true" className="text-gray-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest pt-2">
            GiriÅŸe DÃ¶n
          </Link>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      style={{ rotateX, rotateY, x, y, perspective: 1000 }}
      className="w-full max-w-md relative z-10 glass rounded-[2rem] border border-white/5 p-10 shadow-2xl backdrop-blur-2xl bg-white/5"
    >
      <div className="text-center mb-10">
        <div className="relative inline-block mb-4">
           <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
           <img 
             src="/logo.png" 
             alt="LIVA" 
             className="relative z-10 w-auto h-20 mx-auto object-contain shadow-2xl" 
             fetchPriority="high"
             loading="eager"
             onError={(e) => { 
                const t = e.target as HTMLImageElement; 
                if (t && t.src !== '/LOGO-2.png') t.src = '/LOGO-2.png'; 
             }} 
           />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">EriÅŸim SÄ±fÄ±rlama</h1>
        <p className="text-gray-400 text-sm mt-1">Yeni Åifrenizi Belirleyin</p>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 relative"
          >
            <div className="absolute -inset-0.5 bg-red-500/20 rounded-lg blur" />
            <div className="relative bg-black/40 border border-red-500/50 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-md">
              <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 animate-pulse" />
              <div className="text-red-200 text-sm font-medium">{error}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-400 mb-2">
            Yeni Åifreniz
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-transparent outline-none transition-all placeholder:text-gray-700"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              aria-label={showPassword ? 'Åifreyi gizle' : 'Åifreyi gÃ¶ster'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-400 mb-2">
            Åifre Tekrar
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-transparent outline-none transition-all placeholder:text-gray-700"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
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
          {loading ? 'YapÄ±landÄ±rÄ±lÄ±yor...' : 'ERÄ°ÅÄ°MÄ° GÃœNCELLE'}
        </motion.button>
        <div className="text-center pt-2">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors font-bold uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" />
            Ä°ptal Et
          </Link>
        </div>
      </form>
      <p className="mt-8 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest opacity-50">LIVASOFTWARE VERÄ° GÃœVENLÄ°ÄÄ° ALTYAPISI</p>
    </motion.div>
  )
}

export default function ResetPasswordPage() {
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
          <ResetPasswordForm />
        </div>
      </div>
    </Suspense>
  )
}

