import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Super ERP - PDF Generation Engine
 * Provides standardized methods for exporting documents to PDF.
 */

declare module 'jspdf' {
  interface jsPDF {
    autoTable: any;
  }
}

export interface PdfConfig {
  title: string;
  filename: string;
  columns: string[];
  data: any[][];
  orientation?: 'p' | 'l';
}

export async function generatePdf(config: PdfConfig) {
  const { title, filename, columns, data, orientation = 'p' } = config;
  
  const doc = new jsPDF(orientation, 'mm', 'a4');
  
  // Font Ayarları (Standard Helvetica)
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Tarih: ${new Date().toLocaleString()}`, 14, 30);
  
  // Tablo Oluşturma
  doc.autoTable({
    startY: 35,
    head: [columns],
    body: data,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 2 },
  });
  
  doc.save(`${filename}.pdf`);
}

export const pdfGenerator = {
  generate: generatePdf
};