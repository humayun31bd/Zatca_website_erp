/**
 * Encodes a string or buffer into a TLV (Tag-Length-Value) buffer.
 */
function toTlv(tag: number, value: string | Buffer): Buffer {
  const valueBuffer = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  const tagBuffer = Buffer.from([tag]);
  const lengthBuffer = Buffer.from([valueBuffer.length]);
  
  return Buffer.concat([tagBuffer, lengthBuffer, valueBuffer]);
}

export interface QrData {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  invoiceTotal: string;
  vatTotal: string;
  xmlHash: string; // Base64
  ecdsaSignature: string; // Base64
  ecdsaPublicKey: string; // Base64 (from CSID)
  csidSignature: string; // Base64 (from ZATCA CSID)
}

/**
 * Generates the ZATCA Phase 2 compliant Base64 QR Code string.
 * This encodes the 9 mandatory tags using TLV format.
 */
export function generatePhase2QR(data: QrData): string {
  const tags = [
    toTlv(1, data.sellerName),
    toTlv(2, data.vatNumber),
    toTlv(3, data.timestamp),
    toTlv(4, data.invoiceTotal),
    toTlv(5, data.vatTotal),
    toTlv(6, Buffer.from(data.xmlHash, 'base64')),
    toTlv(7, Buffer.from(data.ecdsaSignature, 'base64')),
    toTlv(8, Buffer.from(data.ecdsaPublicKey, 'base64')), // Simplified for MVP (requires parsing from X509)
    toTlv(9, Buffer.from(data.csidSignature, 'base64')), // Simplified for MVP
  ];

  const combinedBuffer = Buffer.concat(tags);
  return combinedBuffer.toString('base64');
}
