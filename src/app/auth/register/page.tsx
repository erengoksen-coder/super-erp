'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, User, Lock, Mail, Briefcase, AlertCircle, Volume2, VolumeX, ShieldCheck } from 'lucide-react'
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import { toast } from '@/lib/notify'
import { userSchemas } from '@/lib/validation/schemas'
import { VortexBackground } from '@/components/auth/VortexBackground'
import { useAgiAudio } from '@/lib/hooks/useAgiAudio'

const registerFormSchema = userSchemas.register.extend({
  confirmPassword: z.string().min(1, 'Åifre tekrar gerekli'),
}).refine((d) => d.password === d.confirmPassword, { message: 'Åifreler eÅŸleÅŸmiyor', path: ['confirmPassword'] })

type RegisterFormData = z.infer<typeof registerFormSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { initAudio, toggleMute, isMuted, isInitialized } = useAgiAudio()

  // 3D Parallax Mouse Tracking
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Smooth Springs
  const springX = useSpring(mouseX, { damping: 20, stiffness: 100 })
  const springY = useSpring(mouseY, { damping: 20, stiffness: 100 })

  // Derived Transforms
  const rotateX = useTransform(springY, [-0.5, 0.5], [8, -8])
  const rotateY = useTransform(springX, [-0.5, 0.5], [-8, 8])
  const x = useTransform(springX, [-0.5, 0.5], [-12, 12])
  const y = useTransform(springY, [-0.5, 0.5], [-12, 12])

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema) as Resolver<RegisterFormData>,
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      full_name: '',
      role: 'user',
      job_title: '',
    },
  })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set((e.clientX / window.innerWidth) - 0.5)
      mouseY.set((e.clientY / window.innerHeight) - 0.5)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  async function onValid(data: RegisterFormData) {
    initAudio()
    setError('')
    setLoading(true)
    const payload = {
      username: data.username,
      password: data.password,
      full_name: data.full_name ?? undefined,
      role: data.role ?? 'user',
      ...(data.email ? { email: data.email } : {}),
      ...(data.job_title ? { job_title: data.job_title } : {}),
    }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = typeof json?.error === 'string' ? json.error : json?.message || `Hata (${res.status}). LÃ¼tfen bilgileri kontrol edin.`
        setError(msg)
        setLoading(false)
        return
      }
      toast.success('KayÄ±t baÅŸarÄ±lÄ±. Admin onayÄ± bekleniyor; onaylandÄ±ktan sonra giriÅŸ yapabilirsiniz.')
      router.push('/auth/login')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'BaÄŸlantÄ± hatasÄ±. Ä°nternet baÄŸlantÄ±nÄ±zÄ± kontrol edip tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
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

      {/* Doku ve Ä°nce Izgara */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      <motion.div 
        style={{ rotateX, rotateY, x, y, perspective: 1000 }}
        className="w-full max-w-lg relative z-10 transition-all duration-1000"
        onClick={() => initAudio()}
      >
        <div className="glass rounded-[2rem] border border-white/5 p-10 shadow-2xl relative overflow-hidden backdrop-blur-2xl bg-white/5">
          {/* Ä°nce Ä°Ã§ Parlama */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          
          <div className="text-center mb-10">
            <div className="relative inline-block mb-4">
               <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
               <img 
                 src="/logo.png" 
                 alt="LIVASOFA" 
                 className="relative z-10 w-auto h-24 mx-auto object-contain transition-transform hover:scale-105 duration-500 shadow-2xl" 
                 fetchPriority="high"
                 loading="eager"
                 onError={(e) => { 
                    const t = e.target as HTMLImageElement; 
                    if (t && t.src !== '/LOGO-2.png') t.src = '/LOGO-2.png'; 
                 }} 
               />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-wider">LIVASOFA ERP</h1>
            <p className="text-gray-400 font-medium">Yeni Hesap OluÅŸturun</p>
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
                <div className="relative bg-black/40 border border-red-500/50 rounded-lg p-4 flex items-start space-x-3 backdrop-blur-md">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 animate-pulse" />
                  <div className="text-red-200 text-sm font-medium">{error}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit(onValid)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-username" className="block text-sm font-medium text-gray-300 mb-2">
                  KullanÄ±cÄ± AdÄ± *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="reg-username"
                    type="text"
                    {...registerField('username')}
                    aria-invalid={!!errors.username}
                    className={`w-full pl-10 pr-4 py-3 bg-white/5 border text-white rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-transparent outline-none transition-all placeholder:text-gray-600 ${errors.username ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}`}
                    placeholder="KullanÄ±cÄ± AdÄ±"
                  />
                </div>
                {errors.username && <p className="mt-1 text-sm text-red-400">{errors.username.message}</p>}
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-sm font-medium text-gray-300 mb-2">
                  E-posta
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="reg-email"
                    type="email"
                    {...registerField('email')}
                    aria-invalid={!!errors.email}
                    className={`w-full pl-10 pr-4 py-3 bg-white/5 border text-white rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-transparent outline-none transition-all placeholder:text-gray-600 ${errors.email ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}`}
                    placeholder="E-posta Adresi"
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="reg-full_name" className="block text-sm font-medium text-gray-300 mb-2">
                Ad Soyad
              </label>
              <input
                id="reg-full_name"
                type="text"
                {...registerField('full_name')}
                aria-invalid={!!errors.full_name}
                className={`w-full px-4 py-3 bg-white/5 border text-white rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-transparent outline-none transition-all placeholder:text-gray-600 ${errors.full_name ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}`}
                placeholder="AdÄ±nÄ±z ve SoyadÄ±nÄ±z"
              />
              {errors.full_name && <p className="mt-1 text-sm text-red-400">{errors.full_name.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-role" className="block text-sm font-medium text-gray-300 mb-2">
                  Rol *
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                  <select
                    id="reg-role"
                    {...registerField('role')}
                    aria-invalid={!!errors.role}
                    className={`w-full pl-10 pr-4 py-3 bg-white/5 border text-white rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-transparent outline-none appearance-none cursor-pointer transition-all ${errors.role ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}`}
                  >
                    <option value="user" className="bg-[#030303]">KullanÄ±cÄ±</option>
                    <option value="manager" className="bg-[#030303]">YÃ¶netici</option>
                    <option value="viewer" className="bg-[#030303]">GÃ¶rÃ¼ntÃ¼leyici</option>
                    <option value="admin" className="bg-[#030303]">Admin</option>
                  </select>
                </div>
                {errors.role && <p className="mt-1 text-sm text-red-400">{errors.role.message}</p>}
              </div>
              <div>
                <label htmlFor="reg-job_title" className="block text-sm font-medium text-gray-300 mb-2">
                  Ä°ÅŸ UnvanÄ±
                </label>
                <input
                  id="reg-job_title"
                  type="text"
                  {...registerField('job_title')}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-primary/50 focus:border-transparent outline-none transition-all placeholder:text-gray-600 hover:border-white/20"
                  placeholder="ÃœnvanÄ±nÄ±z"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-password" className="block text-sm font-medium text-gray-300 mb-2">
                  Åifre *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="reg-password"
                    type="password"
                    {...registerField('password')}
                    aria-invalid={!!errors.password}
                    className={`w-full pl-10 pr-4 py-3 bg-white/5 border text-white rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-transparent outline-none transition-all placeholder:text-gray-600 ${errors.password ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}`}
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  />
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>}
              </div>

              <div>
                <label htmlFor="reg-confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Åifre Tekrar *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="reg-confirmPassword"
                    type="password"
                    {...registerField('confirmPassword')}
                    aria-invalid={!!errors.confirmPassword}
                    className={`w-full pl-10 pr-4 py-3 bg-white/5 border text-white rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-transparent outline-none transition-all placeholder:text-gray-600 ${errors.confirmPassword ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'}`}
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  />
                </div>
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-4 rounded-xl hover:bg-primary/90 transition shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-bold uppercase tracking-widest text-sm"
            >
              <UserPlus className="w-5 h-5" />
              <span>{loading ? 'Kaydediliyor...' : 'HESAP OLUÅTUR'}</span>
            </motion.button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <Link
              href="/auth/login"
              className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
            >
              Zaten hesabÄ±nÄ±z var mÄ±? GiriÅŸ yapÄ±n
            </Link>
            <p className="mt-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest opacity-50">KAYIT PROTOKOLÃœ AKTÄ°F â€¢ POWERED BY LIVASOFTWARE</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

