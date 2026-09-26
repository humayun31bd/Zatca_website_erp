import crypto from "crypto";

// Mock CSID Private Key (secp256k1) and Certificate for development
const MOCK_PRIVATE_KEY = `-----BEGIN EC PRIVATE KEY-----
MHQCAQEEIPhbA3f/gXpC6U04qW92O6LzPzQ4Cq7YkL5j6rZqG8V/oAcGBSuBBAAK
oUQDQgAEsJtVwUjH9Gz2iM+VzT5gL3y+b8c/4z+2s+z1y2k1sY8YjK5K3jR9zF9g
wLw7hU+w8vL7wXjQ3m+eT5j4VzT7gQ==
-----END EC PRIVATE KEY-----`;

const MOCK_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIBfTCCASWgAwIBAgIUW6oGZJz9K3zL4Q7jQ2Qy6QZ8vFcwCgYIKoZIzj0EAwIw
...
-----END CERTIFICATE-----`;

import { DOMParser } from '@xmldom/xmldom';
import { ExclusiveCanonicalization } from 'xml-crypto';

/**
 * Normalizes XML string using True C14N standard required by ZATCA.
 */
function canonicalizeXml(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const c14n = new ExclusiveCanonicalization();
  return c14n.process(doc.documentElement as any, {
    ancestorNamespaces: [],
    signatureNode: null
  });
}

/**
 * Computes the SHA-256 hash of the canonicalized XML and returns it as Base64.
 */
export function generateInvoiceHash(xml: string): string {
  const c14nXml = canonicalizeXml(xml);
  const hash = crypto.createHash("sha256").update(c14nXml).digest("base64");
  return hash;
}

/**
 * Signs the Invoice Hash using ECDSA secp256k1.
 */
export function signInvoiceHash(invoiceHashBase64: string): string {
  const sign = crypto.createSign("SHA256");
  sign.update(invoiceHashBase64);
  const signature = sign.sign(MOCK_PRIVATE_KEY, "base64");
  return signature;
}

/**
 * Injects the cryptographic stamp (UBLExtension) into the Base XML.
 */
export function stampXml(baseXml: string, invoiceHash: string, signature: string): string {
  // In production, we'd use xmlbuilder2 to traverse and append properly.
  // For MVP, we'll do a robust string replacement to inject the XAdES structure.
  
  const stampStructure = `
          <ext:ExtensionContent>
            <sig:UBLDocumentSignatures xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2" xmlns:sac="urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2" xmlns:sbc="urn:oasis:names:specification:ubl:schema:xsd:SignatureBasicComponents-2">
              <sac:SignatureInformation>
                <cbc:ID>urn:oasis:names:specification:ubl:signature:1</cbc:ID>
                <sbc:ReferencedSignatureID>urn:oasis:names:specification:ubl:signature:Invoice</sbc:ReferencedSignatureID>
                <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="signature">
                  <ds:SignedInfo>
                    <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2006/12/xml-c14n11"/>
                    <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256"/>
                    <ds:Reference Id="invoiceSignedData" URI="">
                      <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                      <ds:DigestValue>${invoiceHash}</ds:DigestValue>
                    </ds:Reference>
                  </ds:SignedInfo>
                  <ds:SignatureValue>${signature}</ds:SignatureValue>
                  <ds:KeyInfo>
                    <ds:X509Data>
                      <ds:X509Certificate>${Buffer.from(MOCK_CERTIFICATE).toString('base64')}</ds:X509Certificate>
                    </ds:X509Data>
                  </ds:KeyInfo>
                </ds:Signature>
              </sac:SignatureInformation>
            </sig:UBLDocumentSignatures>
          </ext:ExtensionContent>
  `;

  return baseXml.replace(
    /<ext:ExtensionContent>\s*<\/ext:ExtensionContent>/,
    stampStructure
  );
}

export function getMockCertificate() {
  return MOCK_CERTIFICATE;
}
