'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LogIn, User, Lock, Eye, EyeOff, Volume2, VolumeX, ShieldAlert, ArrowRight } from 'lucide-react'
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import { fetchApi } from '@/lib/api/client'
import { useAuthStore, type AuthUser } from '@/lib/store/authStore'
import { toast } from '@/lib/notify'
import { userSchemas } from '@/lib/validation/schemas'
import { VortexBackground } from '@/components/auth/VortexBackground'
import { useAgiAudio } from '@/lib/hooks/useAgiAudio'
import { ZenithCard } from '@/components/ui/ZenithCard'
import type { z } from 'zod'

/**
 * Custom hook to detect when the component has successfully hydrated.
 * Prevents hydration mismatches in Next.js 14.
 */
function useHasHydrated() {
  const [hasHydrated, setHasHydrated] = useState(false)
  useEffect(() => {
    setHasHydrated(true)
  }, [])
  return hasHydrated
}

type LoginFormData = z.infer<typeof userSchemas.login>

function LoginForm({ onInteraction }: { onInteraction?: () => void }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl') || ''
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore((state) => state.setAuth)
  const setHydrated = useAuthStore((state) => state.setHydrated)
  const [isNgrok, setIsNgrok] = useState(false)

  // 3D Parallax Mouse Tracking
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Smooth Springs
  const springX = useSpring(mouseX, { damping: 20, stiffness: 100 })
  const springY = useSpring(mouseY, { damping: 20, stiffness: 100 })

  // Derived Transforms for buoyancy
  const rotateX = useTransform(springY, [-0.5, 0.5], [10, -10])
  const rotateY = useTransform(springX, [-0.5, 0.5], [-10, 10])
  const x = useTransform(springX, [-0.5, 0.5], [-15, 15])
  const y = useTransform(springY, [-0.5, 0.5], [-15, 15])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(userSchemas.login) as Resolver<LoginFormData>,
    defaultValues: { username: '', password: '' },
  })

  useEffect(() => {
    const h = typeof window !== 'undefined' ? window.location.hostname : ''
    setIsNgrok(h.endsWith('ngrok-free.dev') || h.endsWith('ngrok.io') || h.endsWith('trycloudflare.com'))

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth) - 0.5)
      mouseY.set((e.clientY / window.innerHeight) - 0.5)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  async function onValid(data: LoginFormData) {
    onInteraction?.()
    setError('')
    setLoading(true)

    try {
      const res = await fetchApi<{ user?: unknown; accessToken?: string; data?: { user?: unknown; accessToken?: string } }>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: data.username, password: data.password }),
      })

      const user = res?.user ?? res?.data?.user
      const accessToken = res?.accessToken ?? res?.data?.accessToken

      if (!user) {
        throw new Error('Giriş başarısız: kullanıcı bilgisi alınamadı')
      }

      if (accessToken && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('auth-token', accessToken)
          
          // Fallback: Set cookie explicitly on client-side for the middleware
          // The server should have set it, but this ensures it's present immediately.
          const sameSite = 'Lax'
          const path = '/'
          const maxAge = 86400 // 1 day
          document.cookie = `auth-token=${accessToken}; Path=${path}; SameSite=${sameSite}; Max-Age=${maxAge}`
        } catch {}
      }
      const u = user as Record<string, unknown>
      setAuth({
        id: (u.id as string) ?? '',
        username: (u.username as string) ?? '',
        role: (u.role as string) ?? 'user',
        ...u,
      } as AuthUser)
      setHydrated(true)
      const name = (user as { full_name?: string; username?: string })?.full_name || (user as { username?: string })?.username || ''
      toast.success(name ? `Hoş geldiniz, ${name}` : 'Giriş başarılı')

      const role = (user as { role?: string })?.role ?? ''
      const isBayi = (typeof role === 'string' && role.trim().toLowerCase() === 'bayi')
      const target = returnUrl && returnUrl.startsWith('/') ? returnUrl : (isBayi ? '/bayi' : '/')
      router.push(target)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : (err as { error?: string })?.error || 'Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div 
      style={{ rotateX, rotateY, x, y, perspective: 1000 }}
      onClick={onInteraction}
    >
      <ZenithCard glow className="p-10 border-white/5 relative overflow-hidden backdrop-blur-3xl bg-black/40">
        {/* Platinum Accent Line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        
        <div className="text-center mb-10">
          <div className="relative inline-block mb-6">
             {/* Logo Glow Effect */}
             <div className="absolute inset-0 bg-primary/25 blur-3xl rounded-full scale-150 animate-pulse" />
             <img 
               src="/logo.png" 
               alt="ZENITH" 
               className="relative z-10 w-auto h-32 mx-auto object-contain transition-transform hover:scale-110 duration-700 drop-shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]" 
               fetchPriority="high"
               loading="eager"
               onError={(e) => { 
                  const t = e.target as HTMLImageElement; 
                  if (t && t.src !== '/LOGO-2.png') t.src = '/LOGO-2.png'; 
               }} 
             />
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase italic">
            Zenith <span className="text-primary glow-primary">Business</span> OS
          </h1>
          <p className="text-white/30 font-bold text-xs tracking-[0.3em] uppercase">Sisteme Güvenli Giriş</p>
          {isNgrok && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[9px] text-emerald-500/80 font-black tracking-widest uppercase">Güvenli Bağlantı Aktif</p>
            </div>
          )}
        </div>


      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-8 relative group"
          >
            <div className="absolute -inset-0.5 bg-red-500/20 rounded-lg blur group-hover:bg-red-500/30 transition duration-1000" />
            <div className="relative bg-black/40 border border-red-500/50 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-md shadow-[0_0_15px_rgba(239,68,68,0.1)]">
              <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 animate-pulse" />
              <div className="text-red-200 text-sm font-medium">
                <p className="leading-tight">{error}</p>
                {isNgrok && (error.includes('deneme') || error.includes('istek')) && (
                  <p className="mt-2 text-red-400/80 text-[10px] font-mono uppercase tracking-tighter">HATA_İSTEK_SINIRI: GÜVENLİK_KİLİDİ_AKTİF</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onValid)} className="space-y-5">
        <div>
          <label htmlFor="login-username" className="block text-sm font-medium text-gray-300 mb-2">
            Kullanıcı Adı
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              {...register('username')}
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? 'username-error' : undefined}
              className={`w-full pl-10 pr-4 py-3 bg-white/5 border text-white rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-transparent outline-none transition-all placeholder:text-gray-600 ${errors.username ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}`}
              placeholder="Kullanıcı adınızı girin"
            />
          </div>
          {errors.username && (
            <p id="username-error" className="mt-1 text-sm text-red-400">{errors.username.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="login-password" className="block text-sm font-medium text-gray-300 mb-2">
            Şifre
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              {...register('password')}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className={`w-full pl-10 pr-12 py-3 bg-white/5 border text-white rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-transparent outline-none transition-all placeholder:text-gray-600 ${errors.password ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}`}
              placeholder="Şifrenizi girin"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="mt-1 text-sm text-red-400">{errors.password.message}</p>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white py-5 rounded-2xl hover:bg-primary/90 transition shadow-glow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 font-black uppercase tracking-[0.2em] text-[11px] border border-primary/20"
        >
          <LogIn className="w-5 h-5" />
          <span>{loading ? 'Sistem İşleniyor...' : 'KONTROL MERKEZİNE GİRİŞ'}</span>
        </motion.button>
        <p className="mt-4 text-center">
          <Link href="/auth/forgot-password" virtual-link="true" className="text-white/20 hover:text-primary text-[10px] font-black uppercase tracking-widest transition-all">
            Erişim Anahtarımı Unuttum
          </Link>
        </p>
      </form>

      <div className="mt-10 pt-8 border-t border-white/5 text-center space-y-6">
        <Link
          href="/auth/register"
          virtual-link="true"
          className="text-white/40 hover:text-white text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
        >
          Yeni Kayıt Talebi Oluştur <ArrowRight className="w-4 h-4" />
        </Link>
        <div className="flex flex-col items-center gap-2 opacity-20">
          <p className="text-[9px] font-black text-white uppercase tracking-[0.4em]">Authorized Personnel Only</p>
          <div className="flex items-center gap-4">
            <span className="text-[8px] font-black text-white uppercase tracking-widest">Zenith Core v4.1</span>
            <div className="w-1 h-1 bg-primary rounded-full" />
            <span className="text-[8px] font-black text-white uppercase tracking-widest">Agi-Link Secure</span>
          </div>
        </div>
      </div>
      </ZenithCard>
    </motion.div>
  )
}

export default function LoginPage() {
  const hasHydrated = useHasHydrated()
  const agiAudio = useAgiAudio()

  // During SSR and initial client render, show a clean, branded loading state
  // to prevent hydration mismatches and "uncaught" errors.
  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center p-4">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
          <img src="/logo.png" alt="LIVASOFA" className="relative z-10 h-28 w-auto opacity-50 grayscale" />
        </div>
        <div className="w-12 h-1 border-2 border-primary/20 rounded-full overflow-hidden">
          <div className="h-full bg-primary w-1/3 animate-[shimmer_2s_infinite]" />
        </div>
      </div>
    )
  }

  const { initAudio, toggleMute, isMuted, isInitialized } = agiAudio

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
      </div>
    }>
      <div className="relative min-h-screen bg-[#030303] flex items-center justify-center p-4">
        {/* Stable Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-black to-blue-500/5 z-0" />
        
        {/* Platinum Vortex Background (Puts it behind the card, but above the gradient) */}
        <VortexBackground />
        
        {/* Audio Toggle */}
        <button
           onClick={(e) => { e.stopPropagation(); initAudio(); toggleMute(); }}
           className="absolute bottom-8 right-8 z-50 p-3 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all group"
           aria-label={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
        >
           {isMuted || !isInitialized ? (
               <VolumeX className="w-5 h-5 text-gray-400 group-hover:text-white" />
           ) : (
               <Volume2 className="w-5 h-5 text-primary animate-pulse" />
           )}
        </button>

        <div className="w-full max-w-lg relative z-10 transition-all duration-300">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <LoginForm onInteraction={() => initAudio()} />
          </motion.div>
        </div>
      </div>
    </Suspense>
  )
}

