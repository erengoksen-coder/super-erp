'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Building2, UserCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function PortalLoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        tax_number: '',
        password: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Mock Login (Gerçekte B2B Auth apisine gidecek)
            // Şimdilik demo için hızlı geçiş
            if (formData.tax_number.startsWith('111')) {
                router.push('/portal/supplier');
            } else {
                router.push('/portal/customer');
            }
            toast.success('Hızlı giriş başarılı (Demo)');
        } catch (error) {
            toast.error('Giriş başarısız oldu');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50/50">
            {/* Sol Taraf - Decor */}
            <div className="hidden w-1/2 flex-col justify-between bg-zinc-900 p-12 text-white lg:flex relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1553413077-190dd305871c?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-luminosity"></div>

                <div className="relative z-10 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-xl">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <span className="text-2xl font-bold tracking-tight">LivaSofa B2B</span>
                </div>

                <div className="relative z-10 max-w-md">
                    <h1 className="text-4xl font-bold leading-tight">İş Ortaklığı Portalı</h1>
                    <p className="mt-4 text-lg text-zinc-400">
                        Siparişlerinizi, ödemelerinizi ve hesap özetlerinizi tek ekrandan güvenle yönetin.
                    </p>

                    <div className="mt-12 space-y-6">
                        <div className="flex items-center gap-4 text-zinc-300">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                                <ShieldCheck className="h-5 w-5 text-indigo-400" />
                            </div>
                            <p className="text-sm font-medium">Uçtan Uca Güvenli Veri Aktarımı</p>
                        </div>
                        <div className="flex items-center gap-4 text-zinc-300">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800">
                                <LogIn className="h-5 w-5 text-purple-400" />
                            </div>
                            <p className="text-sm font-medium">7/24 Kesintisiz Sipariş Takibi</p>
                        </div>
                    </div>
                </div>

                <div className="relative z-10">
                    <p className="text-sm text-zinc-500">© 2026 LivaSofa Bilişim Sistemleri</p>
                </div>
            </div>

            {/* Sağ Taraf - Form */}
            <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 lg:mx-0 lg:hidden">
                            <Building2 className="h-7 w-7" />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Portal Girişi</h2>
                        <p className="mt-2 text-sm text-gray-500">Hesabınıza erişmek için bilgilerinizi giriniz.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                        <div className="space-y-5 rounded-md shadow-sm">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                    Vergi Numarası / TCKN
                                </label>
                                <div className="relative">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <UserCircle className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        maxLength={11}
                                        value={formData.tax_number}
                                        onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                                        className="block w-full rounded-xl border border-gray-300 py-3 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-shadow"
                                        placeholder="111... (Tedarikçi) veya 222... (Müşteri)"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-medium text-gray-700">Şifre</label>
                                    <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500 text-xs">
                                        Şifremi Unuttum
                                    </a>
                                </div>
                                <div className="relative">
                                    <input
                                        type="password"
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="block w-full rounded-xl border border-gray-300 py-3 px-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-shadow"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group relative flex w-full justify-center rounded-xl bg-zinc-900 px-4 py-3.5 text-sm font-semibold text-white hover:bg-zinc-800 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 transition-all disabled:opacity-70"
                            >
                                {isLoading ? (
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Güvenli Giriş Yap
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </span>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="text-center rounded-lg bg-blue-50/50 p-4 border border-blue-100">
                        <p className="text-xs text-blue-800">
                            <strong>Demo Notu:</strong> Vergi No'su <code>111</code> ile başlayanlar <strong>Tedarikçi</strong> Portaline, diğerleri <strong>Müşteri</strong> Portaline yönlendirilecektir. Şifre alanı zorunlu ancak değer kontrol edilmiyor.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
