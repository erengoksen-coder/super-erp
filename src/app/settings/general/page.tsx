'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Save, Building2, ShieldCheck, Mail, Phone, Globe, Trash2, Settings } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Livasofa ERP General Settings Page
 * Unified interface for managing company identity and system parameters.
 */

export default function GeneralSettings() {
  const [settings, setSettings] = useState<any>({
    company_info: { name: '', vkn: '', tax_office: '', brand: '', phone: '', email: '', website: '' },
    e_invoice_config: { test_mode: true }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/general');
      const data = await res.json();
      if (data.data) {
        setSettings({ ...settings, ...data.data });
      }
      setLoading(false);
    } catch (e) {
      toast.error('Ayarlar yüklenemedi');
    }
  };

  const handleSave = async (key: string, value: any) => {
    setSaving(true);
    try {
      await fetch('/api/settings/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      toast.success('Ayarlar kaydedildi');
    } catch (e) {
      toast.error('Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-400">Ayarlar Yükleniyor...</div>;

  return (
    <div className="p-6 space-y-8 bg-slate-50/30 min-h-screen animate-reveal">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-500" /> Kurumsal Ayarlar
          </h1>
          <p className="text-slate-500 text-sm">ERP sisteminin genel kimlik ve entegrasyon parametrelerini yönetin.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sol Sütun: Şirket Bilgileri */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Şirket Kimliği</h3>
                    <p className="text-sm text-slate-500">Fatura ve raporlarda görünecek resmi bilgiler.</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-none font-bold">Resmi</Badge>
              </div>
            </CardHeader>
            <CardBody className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
              <div className="space-y-2">
                <span className="text-sm font-medium">Ticari Ünvan</span>
                <Input 
                  value={settings.company_info.name} 
                  onChange={(e) => setSettings({...settings, company_info: {...settings.company_info, name: e.target.value}})}
                  className="bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Marka Adı</span>
                <Input 
                  value={settings.company_info.brand} 
                  onChange={(e) => setSettings({...settings, company_info: {...settings.company_info, brand: e.target.value}})}
                  className="bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">VKN / TCKN</span>
                <Input 
                  value={settings.company_info.vkn} 
                  onChange={(e) => setSettings({...settings, company_info: {...settings.company_info, vkn: e.target.value}})}
                  className="bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">Vergi Dairesi</span>
                <Input 
                  value={settings.company_info.tax_office} 
                  onChange={(e) => setSettings({...settings, company_info: {...settings.company_info, tax_office: e.target.value}})}
                  className="bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </CardBody>
            <CardFooter className="bg-slate-50/50 p-4 border-t border-slate-100 flex justify-end">
               <Button onClick={() => handleSave('company_info', settings.company_info)} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                  <Save className="w-4 h-4 mr-2" /> Değişiklikleri Kaydet
               </Button>
            </CardFooter>
          </Card>

          <Card className="border-none shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">İletişim Bilgileri</h3>
                  <p className="text-sm text-slate-500">Müşteri iletişimi ve sistem bildirimleri adresleri.</p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
              <div className="space-y-2">
                <span className="text-sm font-medium flex items-center gap-2"><Mail className="w-3 h-3"/> E-Posta</span>
                <Input value={settings.company_info.email} className="bg-slate-50 border-none"/>
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium flex items-center gap-2"><Phone className="w-3 h-3"/> Telefon</span>
                <Input value={settings.company_info.phone} className="bg-slate-50 border-none"/>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Sağ Sütun: Sistem Ayarları */}
        <div className="lg:col-span-4 space-y-8">
           <Card className="border-none shadow-sm ring-1 ring-slate-200 bg-indigo-900 text-white overflow-hidden">
              <CardHeader>
                 <div className="flex items-center gap-3">
                   <ShieldCheck className="w-6 h-6 text-indigo-300" />
                   <h3 className="text-lg text-white font-bold">E-Dönüşüm Durumu</h3>
                 </div>
              </CardHeader>
              <CardBody className="space-y-6">
                 <div className="p-4 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between">
                    <div className="space-y-1">
                       <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Modül Durumu</p>
                       <p className="font-bold">E-Fatura: AKTİF</p>
                    </div>
                    <Badge variant="soft" color="warning" className="bg-indigo-500 text-white border-none text-xs">Test Modu</Badge>
                 </div>
                 <div className="text-xs text-indigo-300 leading-relaxed">
                    Şu anda GİB Test servislerine bağlısınız. Canlıya geçmek için özel entegratör aktivasyonu gereklidir.
                 </div>
                 <Button variant="outline" className="w-full bg-transparent border-white/20 text-white hover:bg-white/10">
                    Sertifika Yükle (.pfx)
                 </Button>
              </CardBody>
           </Card>

           <Card className="border-none shadow-sm ring-1 ring-slate-200">
              <CardHeader>
                 <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Tehlikeli Alan</h3>
              </CardHeader>
              <CardBody className="space-y-4">
                 <p className="text-xs text-slate-500">Sistem önbelleğini temizlemek veya tüm ayarları sıfırlamak için kullanılır.</p>
                 <Button variant="outline" className="w-full text-red-500 border-red-100 hover:bg-red-50 hover:text-red-600 group">
                    <Trash2 className="w-4 h-4 mr-2 group-hover:animate-bounce" /> Önbelleği Temizle
                 </Button>
              </CardBody>
           </Card>
        </div>

      </div>
    </div>
  );
}
