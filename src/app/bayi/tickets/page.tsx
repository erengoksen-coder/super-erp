'use client'

import { useState, useEffect } from 'react'
import { Plus, MessageSquare, AlertCircle, Clock, CheckCircle, Package } from 'lucide-react'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import Link from 'next/link'

type Ticket = {
    id: string
    ticket_number: string
    subject: string
    description: string
    status: 'open' | 'in_progress' | 'resolved' | 'closed'
    priority: 'low' | 'medium' | 'high' | 'critical'
    created_at: string
    product_name: string | null
}

export default function BayiTicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const [form, setForm] = useState({
        subject: '',
        description: '',
        priority: 'medium',
        product_id: '',
        custom_product_name: '',
        image_url: ''
    })

    const [products, setProducts] = useState<{ id: string, name: string }[]>([])

    useEffect(() => {
        fetchTickets()
        // Ürünleri çek - Sadece bayinin satın aldığı (sevkiyatı yapılmış) ürünleri getir
        fetchApi('/api/bayi/catalog?purchasedOnly=true').then((res: any) => {
            setProducts(res?.data || [])
        }).catch(console.error)
    }, [])

    const fetchTickets = () => {
        setLoading(true)
        fetchApi<Ticket[]>('/api/bayi/tickets')
            .then((data) => {
                setTickets(data || [])
            })
            .catch(() => toast.error('Talepler yüklenemedi'))
            .finally(() => setLoading(false))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.subject || !form.description) {
            return toast.error('Konu ve açıklama zorunludur.')
        }
        setSubmitting(true)
        try {
            await fetchApi('/api/bayi/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            toast.success('Talebiniz başarıyla oluşturuldu.')
            setIsModalOpen(false)
            setForm({ subject: '', description: '', priority: 'medium', product_id: '', custom_product_name: '', image_url: '' })
            fetchTickets()
        } catch (error: any) {
            toast.error(error.message || 'Talebiniz kaydedilemedi')
        } finally {
            setSubmitting(false)
        }
    }

    const getStatusBadge = (status: string) => {
        const map: Record<string, { label: string, color: string, icon: any }> = {
            'open': { label: 'Açık Bekliyor', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: AlertCircle },
            'in_progress': { label: 'İnceleniyor', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
            'resolved': { label: 'Çözümlendi', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
            'closed': { label: 'Kapalı', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: CheckCircle },
        }
        const s = map[status] || map['open']
        const Icon = s.icon
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 w-fit ${s.color}`}>
                <Icon className="w-3.5 h-3.5" />
                {s.label}
            </span>
        )
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-300 via-sky-200 to-indigo-300">
                            Satış Sonrası Hizmetler
                        </h2>
                    </div>
                    <p className="text-blue-200/60 text-sm max-w-md font-medium">Arızalı ürün bildirimleri ve servis taleplerinizi buradan profesyonelce yönetin.</p>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="relative z-10 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-blue-50 px-6 py-3 rounded-xl transition-all duration-300 font-black shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus className="w-5 h-5" />
                    Yeni Talep Oluştur
                </button>
            </div>

            <div className="bg-slate-800/40 rounded-xl border border-slate-700 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
                ) : tickets.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg">Henüz oluşturulmuş bir servis talebiniz bulunmuyor.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                        {tickets.map(t => (
                            <div key={t.id} className="group p-5 bg-slate-800/40 hover:bg-slate-800/80 rounded-2xl border border-slate-700/50 hover:border-blue-500/30 transition-all duration-300 flex flex-col justify-between gap-4 shadow-lg hover:shadow-blue-900/10">
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-blue-500/80 tracking-widest uppercase mb-0.5">#{t.ticket_number}</span>
                                            <h3 className="text-base font-black text-blue-100 group-hover:text-blue-300 transition-colors line-clamp-1">{t.subject}</h3>
                                        </div>
                                        {getStatusBadge(t.status)}
                                    </div>

                                    <div className="space-y-1">
                                        {t.product_name && (
                                            <div className="flex items-center gap-1.5 text-xs font-black text-blue-100/80 bg-slate-700/50 px-2 py-1 rounded w-fit capitalize border border-blue-500/10">
                                                <Package className="w-3 h-3 text-blue-400" />
                                                {t.product_name}
                                            </div>
                                        )}
                                        <p className="text-sm text-blue-200/60 font-medium line-clamp-2 leading-relaxed">{t.description}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-700/30">
                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(t.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                    <button className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
                                        Detay Gör →
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal / Çekmece */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-black text-blue-100">Yeni Servis Talebi</h3>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                            </div>

                            <div>
                                <label className="block text-sm font-black text-sky-200/70 mb-1">Talep Konusu *</label>
                                <input
                                    type="text" required
                                    value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                                    className="w-full bg-slate-800 border-slate-700 text-blue-100 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                    placeholder="Kırık ayak, Kumaş söküğü vb."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">İlgili Ürün (Opsiyonel)</label>
                                <div className="space-y-2">
                                    <select
                                        value={form.product_id} onChange={e => {
                                            const val = e.target.value;
                                            setForm(prev => ({ ...prev, product_id: val, custom_product_name: val === 'custom' ? prev.custom_product_name : '' }))
                                        }}
                                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Katalogdan Ürün Seçiniz...</option>
                                        <option value="custom">Diğer (Manuel Ürün Adı Yazacağım)</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>

                                    {(form.product_id === 'custom' || (!form.product_id && form.custom_product_name)) && (
                                        <input
                                            type="text"
                                            value={form.custom_product_name}
                                            onChange={e => setForm({ ...form, custom_product_name: e.target.value, product_id: 'custom' })}
                                            placeholder="Lütfen ürün ismini buraya yazınız..."
                                            className="w-full bg-slate-700/50 border border-slate-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                                        />
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-black text-sky-200/70 mb-1">Açıklama *</label>
                                <textarea
                                    required rows={4}
                                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 resize-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Yaşanan sorunu detaylıca açıklayınız..."
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-black text-sky-200/70 mb-1">Hasar Görseli (Bilgisayardan Yükle) - Opsiyonel</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setForm({ ...form, image_url: reader.result as string });
                                                }
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        className="w-full bg-slate-800 border border-slate-700 text-slate-300 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 focus:outline-none"
                                    />
                                </div>
                                {form.image_url && (
                                    <div className="mt-3 relative inline-block">
                                        <img src={form.image_url} alt="Önizleme" className="h-24 rounded-lg object-cover border border-slate-600" />
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, image_url: '' })}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 rounded-lg text-blue-200/70 font-bold hover:bg-slate-800 transition-colors">İptal</button>
                                <button type="submit" disabled={submitting} className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-blue-50 font-black transition-colors disabled:opacity-50">
                                    {submitting ? 'Gönderiliyor...' : 'Talebi İlet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
