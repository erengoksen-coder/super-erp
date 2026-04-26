'use client'

import React, { useState } from 'react'
import { FileSpreadsheet, Download, Upload, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/Button'
import { toast } from 'sonner'
import { fetchApi } from '@/lib/api/fetch'

interface ImportOrdersDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ImportOrdersDialog({ isOpen, onClose, onSuccess }: ImportOrdersDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<{ count: number; errors?: string[] } | null>(null)

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Cari Adı': 'Örnek Mobilya Mağazası',
        'Müşteri Adı': 'Ahmet Yılmaz',
        'Ürün Adı': 'Liva Köşe Koltuk',
        'SKU': 'LVA-KOS-001',
        'Miktar': 1,
        'Fiyat': 15000,
        'Açıklama': 'Mavi renk, metal ayak'
      },
      {
        'Cari Adı': 'Genel Cari',
        'Müşteri Adı': 'Mehmet Öz',
        'Ürün Adı': 'Liva Berjer',
        'SKU': 'LVA-BRJ-002',
        'Miktar': 2,
        'Fiyat': 7500,
        'Açıklama': 'Ceviz ayak'
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(templateData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Siparişler')
    XLSX.writeFile(workbook, 'siparis_yukleme_sablonu.xlsx')
    toast.success('Şablon indirildi')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const data = await fetchApi<{ count: number; errors?: string[] }>('/api/orders/import', {
        method: 'POST',
        body: formData,
      })

      setResult({ count: data.count, errors: data.errors })
      
      if (data.count > 0) {
        toast.success(`${data.count} sipariş başarıyla yüklendi`)
        onSuccess()
      } else {
        toast.error('Hiçbir sipariş yüklenemedi')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Excel'den Sipariş Yükle" size="lg">
      <div className="space-y-6">
        {/* Helper Note */}
        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-3 text-sm text-blue-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>
            Toplu sipariş yüklemek için hazırladığımız özel şablonu kullanmanız önerilir. 
            Sistem ürünleri <strong>SKU</strong> veya <strong>Ürün Adı</strong> ile otomatik eşleştirecektir.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <label className="block text-xs font-bold text-foreground/40 uppercase tracking-widest pl-1">
              Dosya Seçin (.xlsx, .xls)
            </label>
            <div className="relative group">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between group-hover:bg-white/10 transition-all border-dashed">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      {file ? file.name : 'Excel dosyasını sürükleyin veya seçin'}
                    </p>
                    <p className="text-xs text-foreground/40">
                      {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Maksimum 50MB'}
                    </p>
                  </div>
                </div>
                {!file && <Upload className="w-5 h-5 text-foreground/40" />}
              </div>
            </div>
          </div>

          <div className="sm:w-48 flex flex-col gap-2">
            <label className="block text-xs font-bold text-foreground/40 uppercase tracking-widest pl-1 invisible sm:visible"> İndir </label>
            <Button
              variant="outline"
              className="w-full h-[58px] border-primary/20 hover:bg-primary/5 text-primary text-xs font-bold uppercase tracking-widest"
              onClick={handleDownloadTemplate}
            >
              <Download className="w-4 h-4 mr-2" /> Şablon İndir
            </Button>
          </div>
        </div>

        {/* Results Container */}
        {result && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 animate-reveal">
            <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              {result.count} Sipariş İşlendi
            </div>
            
            {result.errors && result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-bold text-red-400 uppercase tracking-widest pl-1">Hatalar ({result.errors.length})</p>
                <div className="max-h-32 overflow-y-auto bg-black/40 rounded-lg p-2 text-[10px] space-y-1 font-mono text-foreground/60">
                  {result.errors.map((err, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-red-500/40">[{i+1}]</span> {err}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <Button variant="outline" onClick={onClose}> Vazgeç </Button>
          <Button
            variant="solid"
            color="primary"
            disabled={!file || isUploading}
            onClick={handleUpload}
          >
            {isUploading ? (
              <> <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Yükleniyor... </>
            ) : (
              <> <Upload className="w-4 h-4 mr-2" /> Şimdi Yükle </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
