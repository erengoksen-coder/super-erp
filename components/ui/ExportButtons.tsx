'use client'

import React from 'react'
import { FileDown, FileSpreadsheet, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Button } from './Button'
import { toast } from '@/lib/notify'

interface ExportButtonProps {
  data?: any[]
  filename: string
  sheetName?: string
  variant?: 'outline' | 'ghost' | 'solid'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onExport?: () => void
}

/**
 * Excel Export Button using xlsx library.
 * Converts JSON data to a downloadable .xlsx file.
 */
export const ExcelExportButton: React.FC<ExportButtonProps> = ({
  data,
  filename,
  sheetName = 'Sheet1',
  variant = 'outline',
  size = 'sm',
  className = '',
  onExport
}) => {
  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.warning('Dışa aktarılacak veri bulunamadı.')
      return
    }

    try {
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
      XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Excel dosyası hazırlandı.')
      if (onExport) onExport()
    } catch (error: any) {
      console.error('Export error:', error)
      toast.error('Dışa aktarma sırasında bir hata oluştu.')
    }
  }

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleExport} 
      className={`text-green-500 hover:text-green-400 border-green-500/20 hover:bg-green-500/10 ${className}`}
    >
      <FileSpreadsheet className="w-4 h-4 mr-2" /> EXCEL
    </Button>
  )
}

/**
 * PDF Export logic (Placeholder for now, typically requires specific templating).
 * In this project, we utilize html2canvas + jspdf for visual PDF export.
 */
export const PdfExportButton: React.FC<ExportButtonProps & { elementId?: string }> = ({
  elementId,
  filename,
  variant = 'outline',
  size = 'sm',
  className = '',
  onExport
}) => {
  const handlePdfExport = async () => {
    if (!elementId) {
       toast.info('PDF özelliği için tablo görünümü şablonu hazırlanıyor...')
       return
    }
    
    try {
        const { default: html2canvas } = await import('html2canvas')
        const { default: jsPDF } = await import('jspdf')

        const element = document.getElementById(elementId)
        if (!element) return

        const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#0f172a' })
        const imgData = canvas.toDataURL('image/png')
        
        const pdf = new jsPDF('p', 'mm', 'a4')
        const imgProps = pdf.getImageProperties(imgData)
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
        pdf.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`)
        toast.success('PDF dökümü hazırlandı.')
        if (onExport) onExport()
    } catch (error: any) {
        toast.error('PDF oluşturulamadı: ' + error.message)
    }
  }

  return (
    <Button 
       variant={variant} 
       size={size} 
       onClick={handlePdfExport}
       className={`text-red-500 hover:text-red-400 border-red-500/20 hover:bg-red-500/10 ${className}`}
    >
      <FileText className="w-4 h-4 mr-2" /> PDF
    </Button>
  )
}
