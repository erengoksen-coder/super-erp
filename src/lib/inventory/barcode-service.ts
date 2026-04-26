import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';

/**
 * Livasofa ERP Barcode & Label Service
 * Provides utilities for generating EAN-13, Code 128 barcodes and PDF labels.
 */

export interface LabelData {
  title: string;
  code: string;
  price?: string;
  sku?: string;
  barcodeType?: 'CODE128' | 'EAN13';
}

/**
 * Generates a Barcode SVG as a string (Usable in browser)
 */
export function generateBarcodeSVG(value: string, type: string = 'CODE128'): string {
  if (typeof window === 'undefined') return ''; // Client-only for canvas/dom ops
  
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  JsBarcode(svg, value, {
    format: type,
    width: 2,
    height: 40,
    displayValue: true,
    fontSize: 10,
    margin: 10
  });
  
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svg);
}

/**
 * Generates a PDF Label (Standard 50x30mm)
 */
export async function generateLabelPDF(data: LabelData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [50, 30]
  });

  // Title
  doc.setFontSize(10);
  doc.text(data.title.substring(0, 25), 25, 6, { align: 'center' });

  // SKU / Code Info
  doc.setFontSize(8);
  doc.text(`KOD: ${data.sku || data.code}`, 25, 10, { align: 'center' });

  // Price (If any)
  if (data.price) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(data.price, 25, 26, { align: 'center' });
  }

  // Barcode (Mocking with a placeholder for now, actual implementation needs canvas-to-image)
  // We'll use a canvas to render the barcode then add it as image
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, data.code, {
    format: data.barcodeType || 'CODE128',
    width: 2,
    height: 100,
    displayValue: false,
    margin: 0
  });
  
  const imgData = canvas.toDataURL('image/png');
  doc.addImage(imgData, 'PNG', 5, 12, 40, 10);

  return doc.output('blob');
}
