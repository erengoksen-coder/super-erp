'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { CheckCircle2, XCircle, Search, Clock, FileText, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ApprovalRequest {
    id: string;
    document_type: string;
    document_id: string;
    requester_id: string;
    requester_name: string;
    approver_role_id: string;
    approver_id: string;
    approver_name: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    amount: number;
    notes: string;
    rejection_reason: string;
    created_at: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ApprovalsInboxPage() {
    const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
    const { data: requests, error, mutate } = useSWR<ApprovalRequest[]>(`/api/approvals?type=${activeTab}&status=all`, fetcher);

    const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
    const [actionNotes, setActionNotes] = useState('');

    if (error) return <div className="p-6 text-red-500">Kayıtlar yüklenirken bir hata oluştu.</div>;

    const handleAction = async (action: 'approve' | 'reject') => {
        if (!selectedRequest) return;
        if (action === 'reject' && !actionNotes.trim()) {
            toast.error("Reddetme durumunda bir açıklama girmeniz zorunludur.");
            return;
        }

        try {
            const res = await fetch('/api/approvals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    request_id: selectedRequest.id,
                    action,
                    notes: action === 'approve' ? actionNotes : undefined,
                    rejection_reason: action === 'reject' ? actionNotes : undefined
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'İşlem başarısız');
            }

            toast.success(action === 'approve' ? 'Talep onaylandı' : 'Talep reddedildi');
            setSelectedRequest(null);
            setActionNotes('');
            mutate();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const getDocTypeName = (type: string) => {
        switch (type) {
            case 'purchase_request': return 'Satın Alma Talebi';
            case 'purchase_order': return 'Satın Alma Siparişi';
            case 'payment': return 'Ödeme/Tahsilat';
            case 'sales_order': return 'Satış Siparişi';
            default: return type;
        }
    };

    const pendingRequests = requests?.filter(r => r.status === 'pending') || [];
    const completedRequests = requests?.filter(r => r.status !== 'pending') || [];

    return (
        <div className="flex h-[calc(100vh-8rem)] flex-col gap-6 overflow-hidden">
            <div className="flex shrink-0 items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        <CheckCircle2 className="h-6 w-6 text-indigo-600" />
                        Onay Merkezi
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Bekleyen onay taleplerinizi ve geçmiş işlemlerinizi buradan yönetebilirsiniz.
                    </p>
                </div>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Sol Panel: Liste */}
                <div className="flex w-1/3 min-w-[320px] max-w-sm flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 bg-gray-50/50 p-4">
                        <div className="flex space-x-1 rounded-lg bg-gray-200/50 p-1">
                            <button
                                onClick={() => { setActiveTab('inbox'); setSelectedRequest(null); }}
                                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${activeTab === 'inbox' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                Gelen Kutusu ({pendingRequests.length})
                            </button>
                            <button
                                onClick={() => { setActiveTab('sent'); setSelectedRequest(null); }}
                                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${activeTab === 'sent' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                Gönderdiklerim
                            </button>
                        </div>
                        <div className="relative mt-4">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Talep ya da kişi ara..."
                                className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {!requests ? (
                            <div className="p-8 text-center"><div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div></div>
                        ) : requests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
                                <CheckCircle2 className="mb-2 h-8 w-8 text-gray-300" />
                                <p>Bekleyen talep bulunmuyor.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {/* Bekleyenler (Sadece Gelen Kutusu için) */}
                                {activeTab === 'inbox' && pendingRequests.map(req => (
                                    <button
                                        key={req.id}
                                        onClick={() => setSelectedRequest(req)}
                                        className={`w-full p-4 text-left transition-colors hover:bg-gray-50 ${selectedRequest?.id === req.id ? 'bg-indigo-50/50 relative' : ''
                                            }`}
                                    >
                                        {selectedRequest?.id === req.id && (
                                            <div className="absolute left-0 top-0 h-full w-1 bg-indigo-600 rounded-r-full" />
                                        )}
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
                                                <span className="font-medium text-gray-900">{getDocTypeName(req.document_type)}</span>
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {new Date(req.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm text-gray-600 line-clamp-1">
                                            {req.requester_name} tarafından talep edildi
                                        </p>
                                        <div className="mt-2 text-sm font-semibold text-gray-900">
                                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(req.amount)}
                                        </div>
                                    </button>
                                ))}

                                {/* Geçmiş / Tüm Liste */}
                                {completedRequests.map(req => (
                                    <button
                                        key={req.id}
                                        onClick={() => setSelectedRequest(req)}
                                        className={`w-full p-4 text-left transition-colors hover:bg-gray-50 ${selectedRequest?.id === req.id ? 'bg-indigo-50/50 relative' : 'opacity-75'
                                            }`}
                                    >
                                        {selectedRequest?.id === req.id && (
                                            <div className="absolute left-0 top-0 h-full w-1 bg-indigo-600 rounded-r-full" />
                                        )}
                                        <div className="flex items-start justify-between">
                                            <div className="font-medium text-gray-900">{getDocTypeName(req.document_type)}</div>
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${req.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                    req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100 text-gray-800'
                                                }`}>
                                                {req.status === 'approved' ? 'Onaylandı' : req.status === 'rejected' ? 'Reddedildi' : req.status}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm text-gray-600 line-clamp-1">
                                            {req.requester_name || 'Bilinmiyor'} tarafından - {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(req.amount)}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sağ Panel: Detay */}
                <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    {selectedRequest ? (
                        <div className="flex flex-1 flex-col overflow-y-auto p-8">
                            <div className="flex items-start justify-between mb-8">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                                        {getDocTypeName(selectedRequest.document_type)} Onayı
                                    </h2>
                                    <p className="mt-1 text-sm text-gray-500 flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {new Date(selectedRequest.created_at).toLocaleString('tr-TR')}
                                    </p>
                                </div>
                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${selectedRequest.status === 'approved' ? 'bg-green-100 text-green-800' :
                                        selectedRequest.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                            'bg-blue-100 text-blue-800'
                                    }`}>
                                    {selectedRequest.status === 'approved' ? 'Onaylandı' :
                                        selectedRequest.status === 'rejected' ? 'Reddedildi' : 'Onay Bekliyor'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-5">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Talep Eden</h3>
                                    <div className="text-base font-medium text-gray-900">{selectedRequest.requester_name}</div>
                                </div>
                                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-500 mb-4">Talep Tutarı</h3>
                                    <div className="text-2xl font-bold text-indigo-700">
                                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(selectedRequest.amount)}
                                    </div>
                                </div>
                            </div>

                            <div className="mb-8 rounded-xl border border-gray-200 p-5 bg-white">
                                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-gray-500" /> Detaylar / Ek Notlar
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {selectedRequest.notes || 'Belgeye ait özel bir not girilmemiş.'}
                                </p>

                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <button className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1">
                                        Belge İçeriğini Göster (PDF) <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Reddetme Nedeni (Eğer Reddedilmişse) */}
                            {selectedRequest.status === 'rejected' && selectedRequest.rejection_reason && (
                                <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-5">
                                    <h3 className="text-sm font-semibold text-red-900 mb-2">Reddetme Nedeni</h3>
                                    <p className="text-sm text-red-800">{selectedRequest.rejection_reason}</p>
                                    <p className="mt-2 text-xs text-red-700 font-medium">İşlemi Yapan: {selectedRequest.approver_name}</p>
                                </div>
                            )}

                            {/* Onaylayan (Eğer Onaylanmışsa) */}
                            {selectedRequest.status === 'approved' && (
                                <div className="mb-8 rounded-xl border border-green-200 bg-green-50 p-5">
                                    <p className="text-sm text-green-800">
                                        Bu talep <strong>{selectedRequest.approver_name}</strong> tarafından onaylanmıştır.
                                    </p>
                                    {selectedRequest.notes && (
                                        <p className="mt-2 text-sm text-green-700 border-t border-green-200/50 pt-2">
                                            Not: {selectedRequest.notes}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Aksiyon Butonları (Sadece Bekleyen ve Gelen Kutusunda) */}
                            {selectedRequest.status === 'pending' && activeTab === 'inbox' && (
                                <div className="mt-auto pt-6 border-t border-gray-100">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Bir açıklama veya not bırakabilirsiniz (Opsiyonel)</label>
                                    <textarea
                                        value={actionNotes}
                                        onChange={(e) => setActionNotes(e.target.value)}
                                        placeholder="Örn: Limit dışı talep..."
                                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 mb-4"
                                        rows={3}
                                    />
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => handleAction('reject')}
                                            className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition-all hover:bg-red-100 hover:border-red-300"
                                        >
                                            <XCircle className="w-5 h-5" /> Reddet
                                        </button>
                                        <button
                                            onClick={() => handleAction('approve')}
                                            className="flex flex-[2] items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-green-700 shadow-md hover:shadow-lg"
                                        >
                                            <CheckCircle2 className="w-5 h-5" /> Talebi Onayla
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center text-gray-500 bg-gray-50/30">
                            <ShieldCheck className="mb-4 h-16 w-16 text-gray-200" />
                            <p className="text-lg font-medium text-gray-900">Detayları Gör</p>
                            <p className="mt-1 text-sm text-gray-500">
                                İncelemek istediğiniz talebi soldaki listeden seçiniz.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
