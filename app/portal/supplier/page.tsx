'use client';

import React from 'react';
import { Package, Truck, FileText, CheckCircle2, TrendingUp, LogOut } from 'lucide-react';

export default function SupplierDashboard() {
    return (
        <div className="flex h-screen flex-col bg-gray-50">
            {/* Navbar */}
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
                <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-600 text-white font-bold">
                        S
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold text-gray-900">Tedarikçi Portalı</h1>
                        <p className="text-xs text-gray-500">Örnek Ahşap A.Ş.</p>
                    </div>
                </div>
                <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
                    <LogOut className="h-4 w-4" /> Çıkış
                </button>
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-6xl space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Hoş Geldiniz</h2>

                    {/* İstatistikler */}
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3 text-indigo-600">
                                <Truck className="h-5 w-5" />
                                <h3 className="font-semibold text-gray-900">Açık Siparişler</h3>
                            </div>
                            <p className="mt-4 text-3xl font-bold text-gray-900">12</p>
                            <p className="mt-1 text-sm text-gray-500">Teslimat bekleyen</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3 text-green-600">
                                <CheckCircle2 className="h-5 w-5" />
                                <h3 className="font-semibold text-gray-900">Tamamlanan</h3>
                            </div>
                            <p className="mt-4 text-3xl font-bold text-gray-900">45</p>
                            <p className="mt-1 text-sm text-gray-500">Bu ay teslim edilen</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3 text-blue-600">
                                <FileText className="h-5 w-5" />
                                <h3 className="font-semibold text-gray-900">Kesilecek Faturalar</h3>
                            </div>
                            <p className="mt-4 text-3xl font-bold text-gray-900">3</p>
                            <p className="mt-1 text-sm text-gray-500">İrsaliyesi onaylanan</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-3 text-purple-600">
                                <TrendingUp className="h-5 w-5" />
                                <h3 className="font-semibold text-gray-900">Bakiye</h3>
                            </div>
                            <p className="mt-4 text-2xl font-bold text-gray-900">145.500 ₺</p>
                            <p className="mt-1 text-sm text-gray-500">Güncel alacak tutarı</p>
                        </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Son Siparişler Liste Mockup */}
                        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                            <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Package className="h-5 w-5 text-gray-500" />
                                    Bize Gelen Son Siparişler (Satın Alma Siparişleri)
                                </h3>
                            </div>
                            <ul className="divide-y divide-gray-100 p-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <li key={i} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                                        <div>
                                            <p className="font-medium text-gray-900">PO-2026-{2000 + i}</p>
                                            <p className="text-sm text-gray-500">Gürgen İskelet Malzemesi - 50 Adet</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                                                Üretimde / Hazırlanıyor
                                            </span>
                                            <p className="mt-1 text-xs text-gray-400">Teslimat: {new Date().toLocaleDateString()}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Ekstra Panel */}
                        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Duyurular & Bilgilendirmeler</h3>
                            <div className="space-y-4">
                                <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                                    Yeni irsaliye yükleme modülü devreye alınmıştır. Siparişlerinizi gönderirken e-irsaliye XML dosyanızı sisteme direkt yükleyebilirsiniz.
                                </div>
                                <div className="rounded-lg bg-orange-50 p-4 text-sm text-orange-800">
                                    Ödeme günlerimiz her ayın 5'i ve 20'si olarak güncellenmiştir.
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
