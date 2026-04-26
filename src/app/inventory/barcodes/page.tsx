'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Printer, Download, Search, RefreshCcw, LayoutGrid, FileText, ChevronDown } from 'lucide-react';
import { generateLabelPDF } from '@/lib/inventory/barcode-service';
import { toast } from 'sonner';

/**
 * Livasofa ERP Barcode & Label Generation Page
 * Allows users to select products and generate print-ready PDF labels.
 */

export default function BarcodePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=100');
      const data = await res.json();
      setProducts(data.data || []);
      setLoading(false);
    } catch (error) {
      toast.error('Ürünler yüklenemedi');
    }
  };

  const handleGeneratePDF = async () => {
    if (!selectedProduct) {
      toast.error('Lütfen bir ürün seçin');
      return;
    }

    try {
      const labelData = {
        title: selectedProduct.name,
        code: selectedProduct.code,
        sku: selectedProduct.sku || selectedProduct.code,
        price: selectedProduct.price ? `${selectedProduct.price} TL` : undefined,
        barcodeType: 'CODE128' as const
      };

      const pdfBlob = await generateLabelPDF(labelData);
      const url = URL.createObjectURL(pdfBlob);
      
      // Auto-download or Open in new tab
      const link = document.createElement('a');
      link.href = url;
      link.download = `etiket_${selectedProduct.code}.pdf`;
      link.click();
      
      toast.success('Barkod başarıyla üretildi');
    } catch (error) {
      console.error(error);
      toast.error('Barkod üretilirken hata oluştu');
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50/30 min-h-screen">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Barkod & Etiket Yönetimi</h1>
          <p className="text-slate-500 text-sm">Ürünleriniz için profesyonel etiketler oluşturun ve yazdırın.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchProducts}>
            <RefreshCcw className="w-4 h-4 mr-2" /> Yenile
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kontrol Paneli */}
        <Card className="md:col-span-1 border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader>
            <h3 className="text-lg font-bold">Etiket Yapılandırması</h3>
            <p className="text-sm text-slate-500">Yazdırmak istediğiniz ürünü ve miktarını seçin.</p>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">Ürün Seçimi</span>
              <div className="relative">
                <select 
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                  onChange={(e) => setSelectedProduct(products.find(p => p.id === e.target.value))}
                  value={selectedProduct?.id || ''}
                >
                  <option value="" disabled>Ürün Seçin...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Etiket Adedi</span>
              <Input 
                type="number" 
                min={1} 
                max={50} 
                value={quantity} 
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="h-10 focus:ring-indigo-500/20"
              />
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Etiket Boyutu</span>
              <div className="relative">
                <select className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm" defaultValue="50x30">
                  <option value="50x30">50x30 mm (Standart)</option>
                  <option value="40x20">40x20 mm (Küçük)</option>
                  <option value="A4">A4 (Çoklu Etiket)</option>
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <Button 
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 shadow-lg mt-4"
              onClick={handleGeneratePDF}
              disabled={!selectedProduct}
            >
              <FileText className="w-4 h-4 mr-2" /> Etiket Oluştur (PDF)
            </Button>
          </CardBody>
        </Card>

        {/* Önizleme Paneli */}
        <Card className="md:col-span-2 border-none shadow-sm ring-1 ring-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">Etiket Önizleme</h3>
              <p className="text-sm text-slate-500">Yazıcıya gönderilmeden önceki görsel taslak.</p>
            </div>
            {selectedProduct && (
              <Badge variant="soft" color="success" className="bg-emerald-50 text-emerald-600 border-none">
                Hazır
              </Badge>
            )}
          </CardHeader>
          <CardBody className="flex items-center justify-center p-12 bg-slate-100/50 rounded-b-xl border-t border-slate-100 min-h-[300px]">
            {selectedProduct ? (
              <div className="w-[300px] h-[180px] bg-white shadow-xl rounded-md border border-slate-200 flex flex-col p-6 items-center justify-between relative overflow-hidden">
                <div className="text-center">
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Livaso ERP</span>
                  <h3 className="text-sm font-bold text-slate-800 leading-tight">{selectedProduct.name}</h3>
                  <span className="text-[10px] text-slate-500 font-mono">CODE: {selectedProduct.code}</span>
                </div>
                
                {/* Visual Barcode Placeholder */}
                <div className="flex flex-col items-center gap-1 w-full scale-125 my-2">
                  <div className="flex gap-[2px]">
                    {[...Array(40)].map((_, i) => (
                      <div key={i} className={`w-[2px] h-10 ${Math.random() > 0.3 ? 'bg-slate-900' : 'bg-transparent'}`}></div>
                    ))}
                  </div>
                  <span className="text-[10px] font-mono tracking-[4px]">{selectedProduct.code}</span>
                </div>

                <div className="flex justify-between items-end w-full border-t border-slate-100 pt-3">
                   <div className="flex flex-col">
                      <span className="text-[8px] text-slate-400 uppercase">Menşei</span>
                      <span className="text-[10px] font-semibold">Türkiye</span>
                   </div>
                   <div className="text-right">
                      <span className="block text-[14px] font-black text-indigo-600">
                        {selectedProduct.price ? `${selectedProduct.price} TL` : 'Fiyat Yok'}
                      </span>
                   </div>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <LayoutGrid className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm text-slate-400">Önizleme için ürün seçin</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

