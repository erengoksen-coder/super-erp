'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/notify'
import { useAuthStore } from '@/lib/store/authStore'

interface GoogleAccountsId {
    initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void
    renderButton: (element: HTMLElement, options: Record<string, unknown>) => void
}
interface GoogleCredentialResponse {
    credential: string
}
declare global {
    interface Window {
        google?: { accounts?: { id?: GoogleAccountsId } }
    }
}

interface GoogleLoginButtonProps {
    onLoading?: (isLoading: boolean) => void
}

export function GoogleLoginButton({ onLoading }: GoogleLoginButtonProps) {
    const router = useRouter()
    const setAuth = useAuthStore((state) => state.setAuth)
    const setHydrated = useAuthStore((state) => state.setHydrated)
    const buttonRef = useRef<HTMLDivElement>(null)
    const [scriptLoaded, setScriptLoaded] = useState(false)

    useEffect(() => {
        // Google scriptini yükle
        if (!document.getElementById('google-jssdk')) {
            const script = document.createElement('script')
            script.id = 'google-jssdk'
            script.src = 'https://accounts.google.com/gsi/client'
            script.async = true
            script.defer = true
            script.onload = () => setScriptLoaded(true)
            document.head.appendChild(script)
        } else {
            setScriptLoaded(true)
        }
    }, [])

    useEffect(() => {
        if (!scriptLoaded) return

        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        if (!clientId) {
            console.warn('Google Client ID bulunamadı. Lütfen NEXT_PUBLIC_GOOGLE_CLIENT_ID çevre değişkenini ekleyin.')
            return
        }

        try {
            window.google?.accounts.id.initialize({
                client_id: clientId,
                callback: handleCredentialResponse,
            })

            if (buttonRef.current) {
                window.google?.accounts.id.renderButton(buttonRef.current, {
                    type: 'standard',
                    theme: 'outline',
                    size: 'large',
                    text: 'signin_with',
                    shape: 'rectangular',
                    width: '100%',
                    logo_alignment: 'left',
                })
            }
        } catch (err) {
            console.error('Google button rendering failed:', err)
        }
    }, [scriptLoaded])

    async function handleCredentialResponse(response: GoogleCredentialResponse) {
        onLoading?.(true)
        try {
            const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: response.credential }),
            })

            const data = await res.json()

            if (!res.ok) {
                toast.error(data.error || 'Google girişi başarısız')
                onLoading?.(false)
                return
            }

            if (data.accessToken) {
                localStorage.setItem('auth-token', data.accessToken)
            }

            setAuth({
                id: data.user.id,
                username: data.user.username,
                role: data.user.role,
                full_name: data.user.full_name,
                email: data.user.email,
            })
            setHydrated(true)

            toast.success(`Hoş geldiniz, ${data.user.full_name || data.user.username}`)
            router.push('/')
        } catch (err) {
            toast.error('Giriş yapılırken bir hata oluştu')
        } finally {
            onLoading?.(false)
        }
    }

    return (
        <div className="w-full flex justify-center mt-4">
            <div ref={buttonRef} className="w-full"></div>
        </div>
    )
}
