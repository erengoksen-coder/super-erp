'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Trash2, ChevronLeft, Save, Info, AlertCircle, CheckCircle2 } from 'lucide-react'
import { fetchApi, useApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'

type ChartAccount = {
  id: string
  code: string
  name: string
}

type JournalLine = {
  account_code: string
  debit: string
  credit: string
  description: string
}

export default function NewJournalEntryPage() {
  const { data: accountsData } = useApi<ChartAccount[]>('/api/accounting/chart-of-accounts')
  const accounts = useMemo(() => accountsData ?? [], [accountsData])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    reference_type: 'manual',
    reference_id: ''
  })
  const [lines, setLines] = useState<JournalLine[]>([
    { account_code: '', debit: '', credit: '', description: '' },
    { account_code: '', debit: '', credit: '', description: '' }
  ])

  const totals = useMemo(() => {
    const debit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0)
    const credit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0)
    return { debit, credit, diff: Math.abs(debit - credit) }
  }, [lines])

  const isBalanced = totals.diff < 0.01 && totals.debit > 0

  function updateLine(index: number, patch: Partial<JournalLine>) {
    setLines((current) => {
        const next = [...current]
        next[index] = { ...next[index], ...patch }
        
        // Eğer borç giriliyorsa alacağı sıfırla (veya tam tersi) - opsiyonel ama temizlik için iyi
        if ('debit' in patch && Number(patch.debit) > 0) next[index].credit = ''
        if ('credit' in patch && Number(patch.credit) > 0) next[index].debit = ''
        
        return next
    })
  }

  function addLine() {
    setLines((current) => [...current, { account_code: '', debit: '', credit: '', description: '' }])
  }

  function removeLine(index: number) {
    if (lines.length <= 2) return
    setLines((current) => current.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isBalanced) {
      toast.warning('Yevmiye fişi dengede değil veya tutar girilmemiş.')
      return
    }
    setSaving(true)
    try {
      await fetchApi('/api/accounting/journal-entries', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          lines: lines.map(l => ({
              ...l,
              debit: Number(l.debit) || 0,
              credit: Number(l.credit) || 0,
              description: l.description || form.description
          }))
        })
      })
      toast.success('Muhasebe fişi başarıyla kaydedildi.')
      // Reset
      setForm({ ...form, description: '', reference_id: '' })
      setLines([
        { account_code: '', debit: '', credit: '', description: '' },
        { account_code: '', debit: '', credit: '', description: '' }
      ])
    } catch (error: any) {
      toast.error(error.message || 'Kayıt sırasında bir hata oluştu.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppDashboardLayout
      title="Yeni Yevmiye Fişi"
      subtitle="Manuel muhasebe kaydı ve fiş girişi"
      icon={Plus}
      actions={
        <Button 
          onClick={handleSubmit} 
          disabled={saving || !isBalanced}
          className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
        >
          <Save className="w-4 h-4 mr-2" /> {saving ? 'KAYDEDİLİYOR...' : 'FİŞİ KAYDET'}
        </Button>
      }
    >
      <div className="mb-8">
        <Link href="/finance">
          <Button variant="ghost" size="sm" className="text-gray-400">
            <ChevronLeft className="w-4 h-4 mr-1" /> Geri
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
         {/* Üst Bilgiler */}
         <Card variant="elevated" className="lg:col-span-1 border-gray-800 h-fit sticky top-24">
            <CardBody className="p-6 space-y-6">
               <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                 <Info className="w-4 h-4" /> FİŞ BİLGİLERİ
               </h3>
               
               <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Fiş Tarihi</label>
                    <Input 
                      type="date" 
                      value={form.entry_date} 
                      onChange={e => setForm({ ...form, entry_date: e.target.value })}
                      className="bg-gray-900 border-gray-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Açıklama</label>
                    <textarea 
                      className="w-full bg-gray-900 border border-gray-800 text-white p-3 rounded-lg text-sm resize-none h-24 focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="Fiş genel açıklaması..."
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Referans Tipi</label>
                    <select 
                      className="w-full bg-gray-900 border border-gray-800 text-white p-2 rounded-lg text-sm"
                      value={form.reference_type}
                      onChange={e => setForm({ ...form, reference_type: e.target.value })}
                    >
                      <option value="manual">Manuel Giriş</option>
                      <option value="adjustment">Düzeltme Fişi</option>
                      <option value="opening">Açılış Fişi</option>
                      <option value="closing">Kapanış Fişi</option>
                    </select>
                  </div>
               </div>
            </CardBody>
         </Card>

         {/* Satırlar */}
         <div className="lg:col-span-3 space-y-6">
            <Card variant="outlined" padding="none" className="border-gray-800 bg-gray-900/40">
               <div className="p-4 border-b border-gray-800 bg-white/5 flex justify-between items-center">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">MUHASEBE SATIRLARI</h3>
                  <Button variant="ghost" size="sm" onClick={addLine} className="text-blue-400 hover:text-blue-300">
                    <Plus className="w-4 h-4 mr-1" /> Satır Ekle
                  </Button>
               </div>
               
               <Table>
                  <TableHeader className="bg-gray-800/30">
                    <TableRow className="border-gray-800">
                      <TableHead className="text-[10px] font-black text-gray-500 w-[35%]">HESAP</TableHead>
                      <TableHead className="text-[10px] font-black text-gray-500 w-[15%] text-right">BORÇ</TableHead>
                      <TableHead className="text-[10px] font-black text-gray-500 w-[15%] text-right">ALACAK</TableHead>
                      <TableHead className="text-[10px] font-black text-gray-500">AÇIKLAMA</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, idx) => (
                      <TableRow key={idx} className="border-gray-800">
                        <TableCell>
                           <select 
                             className="w-full bg-transparent border-none text-white text-xs font-bold outline-none"
                             value={line.account_code}
                             onChange={e => updateLine(idx, { account_code: e.target.value })}
                           >
                             <option value="" className="bg-gray-900">Seçiniz...</option>
                             {accounts.map(a => <option key={a.id} value={a.code} className="bg-gray-900">{a.code} - {a.name}</option>)}
                           </select>
                        </TableCell>
                        <TableCell>
                           <input 
                             type="number" 
                             className="w-full bg-transparent border-none text-right text-xs font-bold text-green-400 outline-none placeholder:text-gray-800"
                             placeholder="0.00"
                             value={line.debit}
                             onChange={e => updateLine(idx, { debit: e.target.value })}
                           />
                        </TableCell>
                        <TableCell>
                           <input 
                             type="number" 
                             className="w-full bg-transparent border-none text-right text-xs font-bold text-amber-400 outline-none placeholder:text-gray-800"
                             placeholder="0.00"
                             value={line.credit}
                             onChange={e => updateLine(idx, { credit: e.target.value })}
                           />
                        </TableCell>
                        <TableCell>
                           <input 
                             className="w-full bg-transparent border-none text-xs text-gray-400 outline-none"
                             placeholder="Satır açıklaması..."
                             value={line.description}
                             onChange={e => updateLine(idx, { description: e.target.value })}
                           />
                        </TableCell>
                        <TableCell>
                           {lines.length > 2 && (
                             <button onClick={() => removeLine(idx)} className="text-gray-700 hover:text-red-500">
                               <Trash2 className="w-4 h-4" />
                             </button>
                           )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
               </Table>

               <div className="p-6 bg-white/5 border-t border-gray-800 flex justify-between items-center">
                  <div className="flex gap-10">
                    <div className="space-y-1">
                       <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">TOPLAM BORÇ</span>
                       <p className="text-xl font-black text-green-400 leading-none">{totals.debit.toLocaleString('tr-TR')} ₺</p>
                    </div>
                    <div className="space-y-1">
                       <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">TOPLAM ALACAK</span>
                       <p className="text-xl font-black text-amber-400 leading-none">{totals.credit.toLocaleString('tr-TR')} ₺</p>
                    </div>
                  </div>

                  <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 border ${isBalanced ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                    {isBalanced ? (
                      <> <CheckCircle2 className="w-5 h-5" /> <span className="text-xs font-black uppercase">FİŞ DENGEDE</span> </>
                    ) : (
                      <> <AlertCircle className="w-5 h-5" /> <span className="text-xs font-black uppercase">FİŞ DENGESİZ ({totals.diff.toLocaleString('tr-TR')} ₺)</span> </>
                    )}
                  </div>
               </div>
            </Card>
            
            <p className="text-[10px] text-gray-500 italic">
               * Tek Düzen Hesap Planı gereği aktif ve pasif karakterli hesapların borç/alacak kuralları sistem tarafından takip edilmektedir. Girişlerinizi kontrol ediniz.
            </p>
         </div>
      </div>
    </AppDashboardLayout>
  )
}
