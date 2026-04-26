import { create } from 'xmlbuilder2';
import forge from 'node-forge';
import axios from 'axios';
import { randomUUID } from 'crypto';

/**
 * Livasofa ERP GİB e-Invoice Integration (UBL 2.1)
 * This library generates and signs electronic invoices according to Turkish GİB standards.
 */

export interface InvoiceData {
  id: string;
  date: string;
  uuid?: string;
  supplier: {
    vkn: string;
    name: string;
    address: string;
    tax_office: string;
  };
  customer: {
    vkn: string;
    name: string;
    address: string;
    tax_office: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
    total: number;
  }>;
  totals: {
    subtotal: number;
    vat: number;
    total: number;
  };
}

/**
 * Generates UBL 2.1 XML for GİB e-Invoice
 */
export function createUBLInvoiceXML(data: InvoiceData): string {
  const invoiceUuid = data.uuid || randomUUID();
  
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('Invoice', {
      xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
      'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
      'xmlns:ext': 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
    });

  // Header Info
  doc.ele('cbc:UBLVersionID').txt('2.1').up();
  doc.ele('cbc:CustomizationID').txt('TR1.2').up();
  doc.ele('cbc:ProfileID').txt('TICARIFATURA').up();
  doc.ele('cbc:ID').txt(data.id).up();
  doc.ele('cbc:UUID').txt(invoiceUuid).up();
  doc.ele('cbc:IssueDate').txt(data.date).up();
  doc.ele('cbc:InvoiceTypeCode').txt('SATIS').up();
  doc.ele('cbc:DocumentCurrencyCode').txt('TRY').up();
  
  // Supplier (Satıcı)
  const supplier = doc.ele('cac:AccountingSupplierParty').ele('cac:Party');
  supplier.ele('cac:PartyIdentification')
    .ele('cbc:ID', { schemeID: 'VKN' }).txt(data.supplier.vkn).up().up();
  supplier.ele('cac:PartyName').ele('cbc:Name').txt(data.supplier.name).up().up();
  
  const supplierAddr = supplier.ele('cac:PostalAddress');
  supplierAddr.ele('cbc:StreetName').txt(data.supplier.address).up();
  supplierAddr.ele('cac:Country').ele('cbc:Name').txt('Türkiye').up().up();
  
  supplier.ele('cac:PartyTaxScheme').ele('cac:TaxScheme').ele('cbc:Name').txt(data.supplier.tax_office).up().up();

  // Customer (Alıcı)
  const customer = doc.ele('cac:AccountingCustomerParty').ele('cac:Party');
  customer.ele('cac:PartyIdentification')
    .ele('cbc:ID', { schemeID: 'VKN' }).txt(data.customer.vkn).up().up();
  customer.ele('cac:PartyName').ele('cbc:Name').txt(data.customer.name).up().up();
  
  const customerAddr = customer.ele('cac:PostalAddress');
  customerAddr.ele('cbc:StreetName').txt(data.customer.address).up();
  customerAddr.ele('cac:Country').ele('cbc:Name').txt('Türkiye').up().up();

  // Totals
  const taxTotal = doc.ele('cac:TaxTotal');
  taxTotal.ele('cbc:TaxAmount', { currencyID: 'TRY' }).txt(data.totals.vat.toFixed(2)).up();
  
  const taxSubtotal = taxTotal.ele('cac:TaxSubtotal');
  taxSubtotal.ele('cbc:TaxAmount', { currencyID: 'TRY' }).txt(data.totals.vat.toFixed(2)).up();
  taxSubtotal.ele('cac:TaxCategory').ele('cac:TaxScheme').ele('cbc:Name').txt('KDV').up().up().up();

  const legalTotal = doc.ele('cac:LegalMonetaryTotal');
  legalTotal.ele('cbc:LineExtensionAmount', { currencyID: 'TRY' }).txt(data.totals.subtotal.toFixed(2)).up();
  legalTotal.ele('cbc:TaxExclusiveAmount', { currencyID: 'TRY' }).txt(data.totals.subtotal.toFixed(2)).up();
  legalTotal.ele('cbc:TaxInclusiveAmount', { currencyID: 'TRY' }).txt(data.totals.total.toFixed(2)).up();
  legalTotal.ele('cbc:PayableAmount', { currencyID: 'TRY' }).txt(data.totals.total.toFixed(2)).up();

  // Invoice Lines
  data.items.forEach((item, i) => {
    const line = doc.ele('cac:InvoiceLine');
    line.ele('cbc:ID').txt((i + 1).toString()).up();
    line.ele('cbc:InvoicedQuantity', { unitCode: 'C62' }).txt(item.quantity.toString()).up();
    line.ele('cbc:LineExtensionAmount', { currencyID: 'TRY' }).txt(item.total.toFixed(2)).up();
    
    const itemElem = line.ele('cac:Item');
    itemElem.ele('cbc:Name').txt(item.name).up();
    
    line.ele('cac:Price').ele('cbc:PriceAmount', { currencyID: 'TRY' }).txt(item.unit_price.toFixed(2)).up().up();
  });

  return doc.end({ prettyPrint: true });
}

/**
 * Digital Signing (Mock/Simplified for GİB)
 */
export async function signUBLInvoice(xml: string, privateKeyPem: string): Promise<string> {
  const md = forge.md.sha256.create();
  md.update(xml, 'utf8');
  
  try {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const signature = forge.util.encode64(privateKey.sign(md));
    
    return xml.replace(
      '</Invoice>',
      `<ext:UBLExtensions>
        <ext:UBLExtension>
          <ext:ExtensionContent>
            <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
              <ds:SignatureValue>${signature}</ds:SignatureValue>
            </ds:Signature>
          </ext:ExtensionContent>
        </ext:UBLExtension>
      </ext:UBLExtensions>
      </Invoice>`
    );
  } catch (e: any) {
    console.error('Signing error:', e.message);
    return xml; // Return unsigned on error for test mode
  }
}
