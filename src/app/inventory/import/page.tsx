'use client'

import React, { useState } from 'react'
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  Database,
  Info,
  Package
} from 'lucide-react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { AppDashboardLayout } from '@/components/layouts/AppDashboardLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { fetchApi } from '@/lib/api/client'
import { toast } from '@/lib/notify'
import { EmptyState } from '@/components/ui/EmptyState'

export default function InventoryImportPage() {
  const [fileData, setFileData] = useState<any[]>([])
  const [importType, setImportType] = useState<'materials' | 'products'>('products')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const bstr = event.target?.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const wsname = wb.SheetNames[0]
      const ws = wb.Sheets[wsname]
      const data = XLSX.utils.sheet_to_json(ws)
      setFileData(data)
      setResult(null)
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = async () => {
    if (fileData.length === 0) return
    setUploading(true)
    try {
      const response = await fetchApi('/api/inventory/import', {
        method: 'POST',
        body: JSON.stringify({ type: importType, items: fileData })
      })
      setResult(response)
      toast.success('İçe aktarma işlemi tamamlandı.')
    } catch (error: any) {
      toast.error(error.message || 'Yükleme başarısız.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <AppDashboardLayout
      title="Excel'den Veri Aktar"
      subtitle="Toplu stok ve ürün girişi sihirbazı"
      icon={Upload}
    >
      <div className="mb-8">
        <Link href="/inventory">
          <Button variant="ghost" size="sm" className="text-gray-400">
            <ChevronLeft className="w-4 h-4 mr-1" /> Geri Dön
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="space-y-6">
            <Card variant="elevated" className="border-gray-800 bg-gray-900/50">
               <CardBody className="p-6 space-y-6">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Info className="w-4 h-4" /> 1. AYARLAR
                  </h3>
                  
                  <div className="space-y-4">
                     <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase block mb-1">Aktarım Tipi</label>
                        <select 
                          className="w-full bg-gray-800 border-gray-700 text-white p-2 rounded-lg text-sm"
                          value={importType}
                          onChange={(e) => setImportType(e.target.value as any)}
                        >
                           <option value="products">Mamüller (Üretilen Ürünler)</option>
                           <option value="materials">Hammaddeler / Malzemeler</option>
                        </select>
                     </div>
                     
                     <div className="p-4 border border-blue-500/20 bg-blue-500/5 rounded-xl">
                        <p className="text-[10px] text-blue-400 font-bold leading-relaxed lowercase">
                           İPUCU: EXCEL DOSYANIZDA 'NAME', 'SKU' (VEYA 'CODE'), 'UNIT' VE 'MIN_STOCK_LEVEL' SÜTUNLARININ BULUNDUĞUNDAN EMİN OLUN.
                        </p>
                     </div>
                  </div>
               </CardBody>
            </Card>

            <Card variant="elevated" className="border-gray-800 bg-gray-900/50">
               <CardBody className="p-6 space-y-4 text-center">
                  <div className="flex justify-center">
                     <div className="p-4 rounded-full bg-blue-500/10 text-blue-500">
                        <FileSpreadsheet className="w-10 h-10" />
                     </div>
                  </div>
                  <h4 className="text-sm font-black text-white uppercase tracking-widest">DOSYA SEÇİN</h4>
                  <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={handleFileChange}
                    className="hidden" 
                    id="excel-upload" 
                  />
                  <label htmlFor="excel-upload" className="block cursor-pointer">
                     <Button variant="outline" className="w-full h-12 pointer-events-none">
                        GÖZAT
                     </Button>
                  </label>
                  {fileData.length > 0 && <p className="text-xs text-green-400 font-bold">{fileData.length} Satır Tespit Edildi</p>}
               </CardBody>
            </Card>

            {fileData.length > 0 && !result && (
               <Button 
                 className="w-full h-14 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 text-white font-black uppercase tracking-widest"
                 onClick={handleImport}
                 disabled={uploading}
               >
                 {uploading ? 'YÜKLENİYOR...' : 'AKTARIMI BAŞLAT'}
               </Button>
            )}
         </div>

         <div className="lg:col-span-2 space-y-6">
            {result ? (
               <Card variant="glass" className="border-green-500/20 bg-green-500/5">
                  <CardBody className="p-8 text-center space-y-6">
                     <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                     <h2 className="text-2xl font-black text-white uppercase tracking-widest">AKTARIM TAMAMLANDI</h2>
                     <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                        <div className="p-4 bg-white/5 rounded-xl text-center">
                           <p className="text-[10px] text-gray-500 font-black uppercase">BAŞARILI</p>
                           <p className="text-3xl font-black text-green-500">{result.success}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl text-center">
                           <p className="text-[10px] text-gray-500 font-black uppercase">HATALI</p>
                           <p className="text-3xl font-black text-red-500">{result.failed}</p>
                        </div>
                     </div>
                     {result.errors.length > 0 && (
                        <div className="text-left mt-6 p-4 bg-red-950/20 border border-red-500/20 rounded-xl max-h-48 overflow-y-auto">
                           <p className="text-[10px] text-red-500 font-black uppercase mb-2">HATA DETAYLARI</p>
                           <ul className="space-y-1">
                              {result.errors.map((err: string, i: number) => (
                                 <li key={i} className="text-[10px] text-red-400 font-medium font-mono">➤ {err}</li>
                              ))}
                           </ul>
                        </div>
                     )}
                     <Link href="/inventory">
                        <Button variant="solid" className="mt-6 px-10">ENVANTERE GİT</Button>
                     </Link>
                  </CardBody>
               </Card>
            ) : fileData.length > 0 ? (
               <Card variant="elevated" padding="none" className="border-gray-800 bg-gray-900/40 overflow-hidden text-white">
                  <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                     <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">VERİ ÖNİZLEME</h3>
                     <span className="text-[10px] text-gray-600 italic">Yalnızca ilk 10 satır gösteriliyor</span>
                  </div>
                  <Table>
                     <TableHeader className="bg-white/5">
                        <TableRow className="border-gray-800">
                           {Object.keys(fileData[0] || {}).map((k) => (
                             <TableHead key={k} className="text-[10px] font-black text-gray-500 uppercase truncate max-w-[100px]">{k}</TableHead>
                           ))}
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {fileData.slice(0, 10).map((row, i) => (
                           <TableRow key={i} className="border-gray-800">
                              {Object.values(row).map((v: any, j) => (
                                 <TableCell key={j} className="text-[10px] font-medium text-gray-400 truncate max-w-[100px]">{String(v)}</TableCell>
                              ))}
                           </TableRow>
                        ))}
                     </TableBody>
                  </Table>
               </Card>
            ) : (
               <EmptyState 
                 title="Dosya Bekleniyor" 
                 description="Aktarım tipini seçin ve Excel dosyasını soldaki panelden yükleyin."
               />
            )}
         </div>
      </div>
    </AppDashboardLayout>
  )
}
