import { IZatcaService } from '../services/interfaces';
import { InvoicePayload } from '@/types/invoice';
import { ClearanceResponse, ReportingResponse } from '@/types/zatca';
import { generateBaseXml } from '../zatca/xml-generator';
import { generateInvoiceHash, signInvoiceHash, stampXml, getMockCertificate } from '../zatca/crypto';
import { generatePhase2QR } from '../zatca/qr-generator';
import { uploadXmlToStorage } from '../storage/s3';

export class LiveZatcaService implements IZatcaService {
  async clearInvoice(invoice: InvoicePayload): Promise<ClearanceResponse> {
    try {
      console.log('--- LIVE ZATCA CLEARANCE ---');
      const dateObj = new Date(invoice.issueDate);
      
      const xmlData = {
        invoiceNumber: invoice.invoiceNumber,
        issueDate: dateObj.toISOString().split('T')[0],
        issueTime: dateObj.toISOString().split('T')[1].replace('Z', ''),
        previousInvoiceHash: invoice.previousInvoiceHash || "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==", // Should be dynamically retrieved from the last invoice in DB for this tenant
        invoiceType: invoice.typeCode as any || "388",
        isSimplified: invoice.invoiceType === 'SIMPLIFIED',
        seller: {
          name: invoice.seller.name,
          vatNumber: invoice.seller.vatNumber,
          street: invoice.seller.address,
          city: "Riyadh",
          postalCode: "12211",
          buildingNumber: "1234",
          district: "Olaya",
        },
        buyer: invoice.buyer ? {
          name: invoice.buyer.name,
          vatNumber: invoice.buyer.vatNumber || "",
          street: invoice.buyer.address,
          city: "Jeddah",
          postalCode: "23211",
          buildingNumber: "4321",
          district: "Al Balad",
        } : undefined,
        lineItems: invoice.lineItems.map(item => ({
          id: item.lineNumber.toString(),
          name: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxPercent: item.taxPercent,
          taxAmount: item.taxAmount,
          lineTotal: item.lineTotal,
        })),
        totals: {
          subtotal: invoice.subtotalAmount,
          taxTotal: invoice.totalVatAmount,
          grandTotal: invoice.totalAmount,
        }
      };

      console.log('1. Generating UBL XML (Local XSD Validation)');
      const baseXml = generateBaseXml(xmlData);

      console.log('2. Hash generation (SHA-256)');
      const xmlHash = generateInvoiceHash(baseXml);

      console.log('3. Signing with ECDSA');
      const signature = signInvoiceHash(xmlHash);

      console.log('4. Stamping XML');
      const stampedXml = stampXml(baseXml, xmlHash, signature);

      console.log('5. Generating TLV QR Code');
      const qrCode = generatePhase2QR({
        sellerName: invoice.seller.name,
        vatNumber: invoice.seller.vatNumber,
        timestamp: dateObj.toISOString(),
        invoiceTotal: invoice.totalAmount.toFixed(2),
        vatTotal: invoice.totalVatAmount.toFixed(2),
        xmlHash,
        ecdsaSignature: signature,
        ecdsaPublicKey: Buffer.from(getMockCertificate()).toString('base64'),
        csidSignature: "bW9jay1jc2lkLXNpZ25hdHVyZQ==" // mock ZATCA CSID signature
      });

      console.log('6. Uploading XML to Storage');
      // For testing without valid AWS credentials, we wrap the upload in a try-catch 
      // so it doesn't crash the local dev if credentials aren't set up.
      let s3Url = null;
      try {
        s3Url = await uploadXmlToStorage(`${invoice.invoiceNumber}.xml`, stampedXml, "default-tenant");
      } catch (err) {
        console.warn("Skipping S3 upload: Invalid or missing AWS credentials in dev mode.");
      }

      console.log('7. mTLS Request to ZATCA Core Endpoint (Mocked for now)');
      
      return {
        clearanceStatus: 'CLEARED',
        clearedInvoice: stampedXml,
        qrCodeBase64: qrCode,
        xmlHash: xmlHash
      };
    } catch (error: any) {
      console.error('Error in ZATCA Clearance:', error);
      return {
        clearanceStatus: 'FAILED',
        validationResults: [{ type: 'ERROR', code: '500', message: error.message }]
      };
    }
  }

  async reportInvoice(invoice: InvoicePayload): Promise<ReportingResponse> {
    console.log('--- LIVE ZATCA REPORTING (B2C) ---');
    // For B2C, we can reuse the same XML generation logic.
    const clearance = await this.clearInvoice(invoice);
    
    return {
      reportingStatus: clearance.clearanceStatus === 'CLEARED' ? 'REPORTED' : 'FAILED',
      qrCodeBase64: clearance.qrCodeBase64,
      xmlHash: clearance.xmlHash,
      validationResults: clearance.clearanceStatus === 'FAILED' ? [{ type: 'ERROR', code: '500', message: 'Generation failed' }] : undefined
    };
  }
}
