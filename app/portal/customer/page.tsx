'use client';

import React from 'react';
import { ShoppingCart, LogOut, PackageCheck, CreditCard, ScrollText, Users } from 'lucide-react';

export default function CustomerDashboard() {
    return (
        <div className="flex h-screen flex-col bg-gray-50">
            {/* Navbar */}
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
                <div className="flex items-center gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-600 text-white font-bold">
                        M
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold text-gray-900">Müşteri Portalı (B2B)</h1>
                        <p className="text-xs text-gray-500">Premium Koltuk Mağazalar Zinciri</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <button className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                        <ShoppingCart className="h-5 w-5" />
                        Sipariş Ver
                    </button>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <button className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
                        <LogOut className="h-4 w-4" /> Çıkış
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                <div className="mx-auto max-w-6xl space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Satın Alma Kontrol Paneli</h2>

                    {/* İstatistikler */}
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-orange-600">
                                    <ScrollText className="h-5 w-5" />
                                    <h3 className="font-semibold text-gray-900">Aktif Siparişlerim</h3>
                                </div>
                            </div>
                            <p className="mt-4 text-3xl font-bold text-gray-900">8</p>
                            <p className="mt-1 text-sm text-gray-500">Üretimde/Hazırlanıyor</p>
                        </div>

                        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-indigo-700">
                                    <CreditCard className="h-5 w-5" />
                                    <h3 className="font-semibold text-gray-900">Borç Bakiyesi</h3>
                                </div>
                            </div>
                            <p className="mt-4 text-2xl font-bold text-indigo-900">850.000 ₺</p>
                            <button className="mt-2 text-xs font-medium text-indigo-600 underline">Ekstre Gör</button>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-green-600">
                                    <PackageCheck className="h-5 w-5" />
                                    <h3 className="font-semibold text-gray-900">Yolda / Kargo</h3>
                                </div>
                            </div>
                            <p className="mt-4 text-3xl font-bold text-gray-900">2</p>
                            <p className="mt-1 text-sm text-gray-500">Araç plaka: 34 AAA 123</p>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-purple-600">
                                    <Users className="h-5 w-5" />
                                    <h3 className="font-semibold text-gray-900">Satış Hedefi Puanı</h3>
                                </div>
                            </div>
                            <p className="mt-4 text-3xl font-bold text-gray-900">12.500</p>
                            <p className="mt-1 text-sm text-gray-500">%5 İskonto Hak Edişine Kalan: 2.500p</p>
                        </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Hazırlanan Siparişler */}
                        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
                            <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4">
                                <h3 className="font-semibold text-gray-900">Üretimdeki Siparişlerim (Aktif Siparişler)</h3>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="rounded-lg border border-gray-100 p-4 shadow-sm hover:border-indigo-100 transition-colors">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="font-semibold text-gray-900">Sipariş No: SO-2026-90{i}</h4>
                                                <p className="text-sm text-gray-500">Miktar: 12 Adet Liva Lüks Takım</p>
                                            </div>
                                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${i === 1 ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {i === 1 ? 'Üretimde' : 'Kumaş Bekliyor'}
                                            </span>
                                        </div>

                                        {/* İlerleme Çubuğu Mock */}
                                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                            <div className={`h-2 rounded-full ${i === 1 ? 'bg-blue-600' : 'bg-yellow-400'}`} style={{ width: i === 1 ? '65%' : '30%' }}></div>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span>Veriliş: {new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toLocaleDateString()}</span>
                                            <span>Tahmini Teslim: {new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Hızlı Online Ödeme */}
                        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
                            <div className="mb-6 flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900">Açık Hesap Online Ödeme</h3>
                                <div className="flex gap-1">
                                    <div className="w-8 h-5 bg-gray-200 rounded flex items-center justify-center text-[10px] font-bold text-gray-500">VISA</div>
                                    <div className="w-8 h-5 bg-gray-200 rounded flex items-center justify-center text-[10px] font-bold text-gray-500">MC</div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-indigo-100 bg-indigo-50/30 p-5 space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-700">Ödenecek Tutar (₺)</label>
                                    <input type="text" defaultValue="50.000,00" className="w-full text-right font-bold text-2xl bg-white border border-gray-300 rounded-lg py-2 px-3 mt-1 focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-700">Kredi Kartı Üzerindeki İsim</label>
                                    <input type="text" placeholder="AD SOYAD" className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 mt-1 focus:ring-2 focus:ring-indigo-500 outline-none uppercase" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-700">Kart Numarası</label>
                                    <input type="text" placeholder="0000 0000 0000 0000" className="w-full font-mono tracking-widest bg-white border border-gray-300 rounded-lg py-2 px-3 mt-1 focus:ring-2 focus:ring-indigo-500 outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-gray-700">SKT</label>
                                        <input type="text" placeholder="AA/YY" className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 mt-1 focus:ring-2 focus:ring-indigo-500 outline-none text-center" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-700">CVC</label>
                                        <input type="text" placeholder="123" className="w-full bg-white border border-gray-300 rounded-lg py-2 px-3 mt-1 focus:ring-2 focus:ring-indigo-500 outline-none text-center" />
                                    </div>
                                </div>
                                <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 pt-4 rounded-xl mt-4 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                                    <CreditCard className="w-5 h-5" /> Güvenli Ödeme Yap
                                </button>
                                <p className="text-[10px] text-center text-gray-400">3D Secure sistemi ile korunmaktadır. Kredi kartı bilgileriniz sistemimizde saklanmaz.</p>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
