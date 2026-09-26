import { create } from "xmlbuilder2";

export interface InvoiceData {
  invoiceNumber: string;
  issueDate: string; // YYYY-MM-DD
  issueTime: string; // HH:mm:ss
  previousInvoiceHash: string; // "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ=="
  invoiceType: "388" | "381" | "383"; // 388=Tax Invoice, 381=Credit Note, 383=Debit Note
  isSimplified: boolean; // 0100000 for standard, 0200000 for simplified
  seller: {
    name: string;
    vatNumber: string;
    street: string;
    city: string;
    postalCode: string;
    buildingNumber: string;
    district: string;
  };
  buyer?: {
    name: string;
    vatNumber: string; // optional for simplified
    street: string;
    city: string;
    postalCode: string;
    buildingNumber: string;
    district: string;
  };
  lineItems: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    taxPercent: number;
    taxAmount: number;
    lineTotal: number;
  }>;
  totals: {
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
  };
}

/**
 * Generates the base UBL 2.1 XML for ZATCA Phase 2.
 * This XML will later be cryptographically stamped (Hashing & Signing).
 */
export function generateBaseXml(data: InvoiceData): string {
  const profileID = "reporting:1.0"; // ZATCA Profile ID
  const subtype = data.isSimplified ? "0200000" : "0100000";

  const obj = {
    Invoice: {
      "@xmlns": "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
      "@xmlns:cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
      "@xmlns:cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
      "@xmlns:ext": "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
      
      // Extension container for Cryptographic Stamp (filled in later by cryptoStamper)
      "ext:UBLExtensions": {
        "ext:UBLExtension": {
          "ext:ExtensionURI": "urn:oasis:names:specification:ubl:dsig:enveloped:xades",
          "ext:ExtensionContent": {
            // Signature will be injected here
          }
        }
      },

      "cbc:ProfileID": profileID,
      "cbc:ID": data.invoiceNumber,
      "cbc:UUID": crypto.randomUUID(),
      "cbc:IssueDate": data.issueDate,
      "cbc:IssueTime": data.issueTime,
      "cbc:InvoiceTypeCode": {
        "@name": subtype,
        "#text": data.invoiceType
      },
      "cbc:DocumentCurrencyCode": "SAR",
      "cbc:TaxCurrencyCode": "SAR",

      "cac:BillingReference": (data.invoiceType === "381" || data.invoiceType === "383") ? {
        "cac:InvoiceDocumentReference": {
          "cbc:ID": "ORIGINAL-INVOICE-ID" // This should be dynamically passed in real life
        }
      } : undefined,

      "cac:AdditionalDocumentReference": [
        {
          "cbc:ID": "ICV",
          "cbc:UUID": "1" // Invoice Counter Value
        },
        {
          "cbc:ID": "PIH",
          "cac:Attachment": {
            "cbc:EmbeddedDocumentBinaryObject": {
              "@mimeCode": "text/plain",
              "#text": data.previousInvoiceHash
            }
          }
        }
        // QR Code Extension is added after stamping
      ],

      "cac:AccountingSupplierParty": {
        "cac:Party": {
          "cac:PartyIdentification": {
            "cbc:ID": {
              "@schemeID": "CRN",
              "#text": "1010010000" // Mock CRN
            }
          },
          "cac:PostalAddress": {
            "cbc:StreetName": data.seller.street,
            "cbc:BuildingNumber": data.seller.buildingNumber,
            "cbc:CityName": data.seller.city,
            "cbc:PostalZone": data.seller.postalCode,
            "cbc:CountrySubentity": data.seller.district,
            "cac:Country": { "cbc:IdentificationCode": "SA" }
          },
          "cac:PartyTaxScheme": {
            "cbc:CompanyID": data.seller.vatNumber,
            "cac:TaxScheme": { "cbc:ID": "VAT" }
          },
          "cac:PartyLegalEntity": {
            "cbc:RegistrationName": data.seller.name
          }
        }
      },

      "cac:AccountingCustomerParty": data.buyer ? {
        "cac:Party": {
          "cac:PostalAddress": {
            "cbc:StreetName": data.buyer.street,
            "cbc:BuildingNumber": data.buyer.buildingNumber,
            "cbc:CityName": data.buyer.city,
            "cbc:PostalZone": data.buyer.postalCode,
            "cac:Country": { "cbc:IdentificationCode": "SA" }
          },
          "cac:PartyTaxScheme": {
            "cbc:CompanyID": data.buyer.vatNumber,
            "cac:TaxScheme": { "cbc:ID": "VAT" }
          },
          "cac:PartyLegalEntity": {
            "cbc:RegistrationName": data.buyer.name
          }
        }
      } : undefined,

      "cac:TaxTotal": {
        "cbc:TaxAmount": { "@currencyID": "SAR", "#text": data.totals.taxTotal.toFixed(2) },
        "cac:TaxSubtotal": {
          "cbc:TaxableAmount": { "@currencyID": "SAR", "#text": data.totals.subtotal.toFixed(2) },
          "cbc:TaxAmount": { "@currencyID": "SAR", "#text": data.totals.taxTotal.toFixed(2) },
          "cac:TaxCategory": {
            "cbc:ID": { "@schemeAgencyID": "6", "@schemeID": "UN/ECE 5305", "#text": "S" },
            "cbc:Percent": "15.00",
            "cac:TaxScheme": { "cbc:ID": { "@schemeAgencyID": "6", "@schemeID": "UN/ECE 5153", "#text": "VAT" } }
          }
        }
      },

      "cac:LegalMonetaryTotal": {
        "cbc:LineExtensionAmount": { "@currencyID": "SAR", "#text": data.totals.subtotal.toFixed(2) },
        "cbc:TaxExclusiveAmount": { "@currencyID": "SAR", "#text": data.totals.subtotal.toFixed(2) },
        "cbc:TaxInclusiveAmount": { "@currencyID": "SAR", "#text": data.totals.grandTotal.toFixed(2) },
        "cbc:AllowanceTotalAmount": { "@currencyID": "SAR", "#text": "0.00" },
        "cbc:PrepaidAmount": { "@currencyID": "SAR", "#text": "0.00" },
        "cbc:PayableAmount": { "@currencyID": "SAR", "#text": data.totals.grandTotal.toFixed(2) }
      },

      "cac:InvoiceLine": data.lineItems.map(item => ({
        "cbc:ID": item.id,
        "cbc:InvoicedQuantity": { "@unitCode": "PCE", "#text": item.quantity.toString() },
        "cbc:LineExtensionAmount": { "@currencyID": "SAR", "#text": (item.quantity * item.unitPrice).toFixed(2) },
        "cac:TaxTotal": {
          "cbc:TaxAmount": { "@currencyID": "SAR", "#text": item.taxAmount.toFixed(2) },
          "cbc:RoundingAmount": { "@currencyID": "SAR", "#text": item.lineTotal.toFixed(2) }
        },
        "cac:Item": {
          "cbc:Name": item.name,
          "cac:ClassifiedTaxCategory": {
            "cbc:ID": "S",
            "cbc:Percent": item.taxPercent.toFixed(2),
            "cac:TaxScheme": { "cbc:ID": "VAT" }
          }
        },
        "cac:Price": {
          "cbc:PriceAmount": { "@currencyID": "SAR", "#text": item.unitPrice.toFixed(2) }
        }
      }))
    }
  };

  const doc = create({ version: "1.0", encoding: "UTF-8" }, obj);
  return doc.end({ prettyPrint: true });
}
