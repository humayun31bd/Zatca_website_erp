import * as QRCode from 'qrcode';

export interface ZatcaQrFields {
  sellerName?: string;
  vatNumber?: string;
  issueDate?: string | Date;
  totalAmount?: number | string;
  totalVatAmount?: number | string;
}

/**
 * Encodes Tag-Length-Value according to ZATCA E-Invoicing specification.
 */
function toTlv(tag: number, value: string): Uint8Array {
  const encoder = new TextEncoder();
  const valueBytes = encoder.encode(value);
  const tagBytes = new Uint8Array([tag, valueBytes.length]);
  const combined = new Uint8Array(tagBytes.length + valueBytes.length);
  combined.set(tagBytes, 0);
  combined.set(valueBytes, tagBytes.length);
  return combined;
}

/**
 * Generates ZATCA standard Base64 TLV string from invoice attributes.
 */
export function generateZatcaTlvBase64(fields: ZatcaQrFields): string {
  const seller = fields.sellerName || 'ZATCA CLOUD ERP';
  const vat = fields.vatNumber || '310123456700003';
  const dateStr = fields.issueDate ? new Date(fields.issueDate).toISOString() : new Date().toISOString();
  const total = Number(fields.totalAmount || 0).toFixed(2);
  const vatAmount = Number(fields.totalVatAmount || 0).toFixed(2);

  const t1 = toTlv(1, seller);
  const t2 = toTlv(2, vat);
  const t3 = toTlv(3, dateStr);
  const t4 = toTlv(4, total);
  const t5 = toTlv(5, vatAmount);

  const totalLength = t1.length + t2.length + t3.length + t4.length + t5.length;
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const t of [t1, t2, t3, t4, t5]) {
    combined.set(t, offset);
    offset += t.length;
  }

  let binary = '';
  for (let i = 0; i < combined.byteLength; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

/**
 * Converts a ZATCA TLV string (or generates one) into a PNG Data URL QR code
 */
export async function getZatcaQrDataUrl(
  rawTlvOrBase64: string | null | undefined,
  fallbackFields?: ZatcaQrFields
): Promise<string> {
  let qrPayload = (rawTlvOrBase64 || '').trim();

  // If already a data URL, return directly
  if (qrPayload.startsWith('data:image/')) {
    return qrPayload;
  }

  // If empty or short, generate TLV from invoice fields
  if (!qrPayload || qrPayload.length < 10) {
    qrPayload = generateZatcaTlvBase64(fallbackFields || {});
  }

  try {
    return await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Error generating ZATCA QR code:', err);
    return '';
  }
}
