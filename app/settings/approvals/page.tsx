'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { PlusCircle, Edit2, Trash2, Check, X, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface ApprovalRule {
    id: string;
    document_type: string;
    min_amount: number;
    max_amount: number | null;
    approver_role_id: string;
    approver_role_name?: string;
    is_active: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ApprovalSettingsPage() {
    const { data: rules, error, mutate } = useSWR<ApprovalRule[]>('/api/settings/approval-rules', fetcher);
    const { data: roles } = useSWR<{ id: string, name: string }[]>('/api/admin/roles', fetcher); // Varsaydığımız bir endpoint

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null);

    const [formData, setFormData] = useState({
        document_type: 'purchase_request',
        min_amount: 0,
        max_amount: '',
        approver_role_id: '',
        is_active: 1
    });

    if (error) return <div className="p-6 text-red-500">Kural yüklenirken bir hata oluştu.</div>;
    if (!rules) return <div className="flex h-full items-center justify-center p-6"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div></div>;

    const handleOpenModal = (rule?: ApprovalRule) => {
        if (rule) {
            setEditingRule(rule);
            setFormData({
                document_type: rule.document_type,
                min_amount: rule.min_amount,
                max_amount: rule.max_amount ? rule.max_amount.toString() : '',
                approver_role_id: rule.approver_role_id,
                is_active: rule.is_active
            });
        } else {
            setEditingRule(null);
            setFormData({
                document_type: 'purchase_request',
                min_amount: 0,
                max_amount: '',
                approver_role_id: roles && roles.length > 0 ? roles[0].id : '',
                is_active: 1
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.approver_role_id) {
            toast.error("Lütfen onaylayıcı rolü seçiniz.");
            return;
        }

        const payload = {
            ...formData,
            max_amount: formData.max_amount === '' ? null : Number(formData.max_amount),
            id: editingRule?.id
        };

        try {
            const res = await fetch('/api/settings/approval-rules', {
                method: editingRule ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Beklenmeyen bir hata oluştu');
            }

            toast.success(`Kural başarıyla ${editingRule ? 'güncellendi' : 'oluşturuldu'}`);
            mutate();
            setIsModalOpen(false);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu onay kuralını silmek istediğinizden emin misiniz?')) return;

        try {
            const res = await fetch(`/api/settings/approval-rules?id=${id}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error);
            }

            toast.success('Kural başarıyla silindi');
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        <ShieldCheck className="h-6 w-6 text-indigo-600" />
                        Onay Kuralları ve İş Akışları
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Sistem içindeki belgelerin hangi limitlerde kimin onayına düşeceğini buradan yönetebilirsiniz.
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                    <PlusCircle className="h-4 w-4" />
                    Yeni Kural Ekle
                </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Belge Tipi</th>
                            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Limit Aralığı</th>
                            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Onaylayacak Rol</th>
                            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Durum</th>
                            <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider text-gray-500">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {rules.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    Henüz tanımlanmış bir onay kuralı bulunmuyor. Dümdüz akışlar geçerlidir.
                                </td>
                            </tr>
                        ) : (
                            rules.map((rule) => (
                                <tr key={rule.id} className="transition-colors hover:bg-gray-50/50">
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <div className="font-medium text-gray-900">{getDocTypeName(rule.document_type)}</div>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-gray-600">
                                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(rule.min_amount)}
                                        {' - '}
                                        {rule.max_amount ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(rule.max_amount) : 'Sınırsız'}
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                            {rule.approver_role_name || rule.approver_role_id}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${rule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {rule.is_active ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleOpenModal(rule)}
                                                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-indigo-600"
                                                title="Düzenle"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(rule.id)}
                                                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                                title="Sil"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                                {editingRule ? 'Kuralı Düzenle' : 'Yeni Onay Kuralı'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Belge Tipi</label>
                                    <select
                                        required
                                        value={formData.document_type}
                                        onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    >
                                        <option value="purchase_request">Satın Alma Talebi</option>
                                        <option value="purchase_order">Satın Alma Siparişi</option>
                                        <option value="payment">Ödeme/Tahsilat Fişi</option>
                                        <option value="sales_order">Satış Siparişi</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">Min. Tutar (TL)</label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={formData.min_amount}
                                            onChange={(e) => setFormData({ ...formData, min_amount: Number(e.target.value) })}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-gray-700">Max. Tutar (Opsiy)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="Sınırsız"
                                            value={formData.max_amount}
                                            onChange={(e) => setFormData({ ...formData, max_amount: e.target.value })}
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-gray-700">Onaylayacak Yönetici Rolü</label>
                                    <select
                                        required
                                        value={formData.approver_role_id}
                                        onChange={(e) => setFormData({ ...formData, approver_role_id: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    >
                                        <option value="" disabled>Rol Seçiniz...</option>
                                        {roles?.map((role) => (
                                            <option key={role.id} value={role.id}>{role.name}</option>
                                        ))}
                                        {(!roles || roles.length === 0) && (
                                            <option value="role_admin">Yönetici (Admin)</option>
                                        )}
                                    </select>
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={formData.is_active === 1}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                    />
                                    <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                                        Kural Aktif
                                    </label>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                >
                                    <Check className="h-4 w-4" />
                                    Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
