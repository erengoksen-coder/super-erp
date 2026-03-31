'use client'

import React from 'react'
import { format } from 'date-fns'
import { Package, Hash, Calendar, User, MapPin, Phone } from 'lucide-react'

interface OrderPdfProps {
  order: any
  items: any[]
  type: 'SA' | 'PA' // Sales / Purchase
}

/**
 * Enterprise Print Template for Orders.
 * Designed for html2canvas capture to PDF.
 */
export const OrderPdfTemplate: React.FC<OrderPdfProps> = ({ order, items, type }) => {
  const isSales = type === 'SA'
  const accentColor = isSales ? 'text-blue-500' : 'text-amber-500'
  const bgColor = isSales ? 'bg-blue-500/10' : 'bg-amber-500/10'

  return (
    <div id="order-print-area" className="w-[210mm] min-h-[297mm] p-[15mm] bg-white text-gray-900 mx-auto font-sans leading-relaxed">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-gray-100 pb-10">
        <div>
           <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-2xl ${bgColor}`}>
                 <Package className={`w-8 h-8 ${accentColor}`} />
              </div>
              <h1 className="text-3xl font-black tracking-tighter uppercase">SUPER <span className={accentColor}>ERP</span></h1>
           </div>
           <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Kurumsal Endüstriyel Kaynak Planlama</p>
        </div>
        
        <div className="text-right">
           <h2 className="text-2xl font-black text-gray-800 uppercase mb-1">{isSales ? 'SATIŞ SİPARİŞİ' : 'SATIN ALMA SİPARİŞİ'}</h2>
           <div className="flex items-center justify-end gap-2 text-sm font-bold text-gray-600">
              <Hash className="w-4 h-4" /> {order.order_number || order.id?.substring(0,8)}
           </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-12 py-12">
         <div className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1">TARAFLAR</h3>
            <div>
               <p className="text-sm font-black text-gray-800 uppercase">{order.customer_name || order.supplier_name}</p>
               <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-500 flex items-center gap-2"><MapPin className="w-3 h-3" /> Adres bilgisi sistemde kayıtlı.</p>
                  <p className="text-xs text-gray-500 flex items-center gap-2"><Phone className="w-3 h-3" /> İletişim: {order.contact_phone || '-'}</p>
               </div>
            </div>
         </div>
         
         <div className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-1">DETAYLAR</h3>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">TARİH</p>
                  <p className="text-xs font-bold text-gray-800 flex items-center gap-2"><Calendar className="w-3 h-3" /> {format(new Date(order.order_date || Date.now()), 'dd.MM.yyyy')}</p>
               </div>
               <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">SORUMLU</p>
                  <p className="text-xs font-bold text-gray-800 flex items-center gap-2"><User className="w-3 h-3" /> {order.created_by_name || 'Sistem'}</p>
               </div>
            </div>
         </div>
      </div>

      {/* Items Table */}
      <div className="mt-8 border rounded-2xl overflow-hidden shadow-sm">
         <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 font-black uppercase tracking-tighter border-b">
               <tr>
                  <th className="px-6 py-4">ÜRÜN / AÇIKLAMA</th>
                  <th className="px-6 py-4 text-center">ADET/BİRİM</th>
                  <th className="px-6 py-4 text-right">BİRİM FİYAT</th>
                  <th className="px-6 py-4 text-right">TOPLAM</th>
               </tr>
            </thead>
            <tbody className="divide-y text-gray-700">
               {items.map((item, idx) => (
                 <tr key={idx}>
                    <td className="px-6 py-4 font-bold">
                       {item.product_name || item.material_name}
                       {item.note && <p className="text-[10px] font-normal text-gray-400 italic mt-1">{item.note}</p>}
                    </td>
                    <td className="px-6 py-4 text-center">{item.quantity} {item.unit || 'Adet'}</td>
                    <td className="px-6 py-4 text-right">{Number(item.unit_price || 0).toLocaleString('tr-TR')} ₺</td>
                    <td className="px-6 py-4 text-right font-black">{(item.quantity * (item.unit_price || 0)).toLocaleString('tr-TR')} ₺</td>
                 </tr>
               ))}
            </tbody>
         </table>
      </div>

      {/* Totals */}
      <div className="mt-12 flex justify-end">
         <div className="w-64 space-y-2">
            <div className="flex justify-between text-xs text-gray-500 font-bold">
               <span>ARA TOPLAM</span>
               <span>{Number(order.total_amount || 0).toLocaleString('tr-TR')} ₺</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 font-bold">
               <span>KDV (%20)</span>
               <span>{(Number(order.total_amount || 0) * 0.2).toLocaleString('tr-TR')} ₺</span>
            </div>
            <div className="flex justify-between text-lg font-black text-gray-900 border-t-2 border-gray-900 pt-2">
               <span>GENEL TOPLAM</span>
               <span>{(Number(order.total_amount || 0) * 1.2).toLocaleString('tr-TR')} ₺</span>
            </div>
         </div>
      </div>

      {/* Footer / Notes */}
      <div className="mt-24 pt-12 border-t text-[10px] text-gray-400 flex justify-between">
         <div className="max-w-md">
            <p className="font-black uppercase mb-2">NOTLAR & KOŞULLAR</p>
            <p>Bu belge elektronik ortamda Super ERP tarafından oluşturulmuştur. Teslimat şartları ve ödeme koşulları karşılıklı sözleşme hükümlerine tabidir.</p>
         </div>
         <div className="text-right italic">
            <p>Kaşe / İmza</p>
         </div>
      </div>
    </div>
  )
}
