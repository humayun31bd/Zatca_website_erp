import { db } from "@/lib/db";
import {
  purchaseOrders,
  goodsReceivedNotes,
  qualityCheckRecords,
  supplierBills,
  quotationComparativeStatements,
  supplierQuotations,
} from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export type DocumentType =
  | 'PO'     // Purchase Order: PO-YYYY-MM-DD-000001
  | 'GRN'    // Goods Received Note: GRN-YYYY-MM-DD-000001
  | 'QC'     // Quality Check: QC-YYYY-MM-DD-000001
  | 'BILL'   // Purchase Bill: BILL-YYYY-MM-DD-000001
  | 'PB'     // Purchase Bill (Alternative prefix): PB-YYYY-MM-DD-000001
  | 'CS'     // Comparative Statement: CS-YYYY-MM-DD-000001
  | 'RFQ'    // Request for Quotation: RFQ-YYYY-MM-DD-000001
  | 'SR';    // Supplier Request: SR-YYYY-MM-DD-000001

export interface DocumentSequenceResult {
  documentNumber: string;
  type: DocumentType;
  prefix: string;
  dateStr: string;
  sequence: number;
}

export function normalizeDocType(type: string): { normalizedType: DocumentType; prefix: string } {
  const upper = type.toUpperCase().trim();
  switch (upper) {
    case 'PO':
    case 'PURCHASE_ORDER':
    case 'PURCHASEORDER':
      return { normalizedType: 'PO', prefix: 'PO' };
    case 'GRN':
    case 'GOODS_RECEIVED':
    case 'GOODSRECEIVED':
      return { normalizedType: 'GRN', prefix: 'GRN' };
    case 'QC':
    case 'QUALITY_CHECK':
    case 'QUALITYCHECK':
      return { normalizedType: 'QC', prefix: 'QC' };
    case 'BILL':
    case 'PURCHASE_BILL':
    case 'SUPPLIER_BILL':
      return { normalizedType: 'BILL', prefix: 'BILL' };
    case 'PB':
      return { normalizedType: 'PB', prefix: 'PB' };
    case 'CS':
    case 'COMPARATIVE_STATEMENT':
    case 'COMPARATIVE':
      return { normalizedType: 'CS', prefix: 'CS' };
    case 'SR':
    case 'SUPPLIER_REQUEST':
    case 'SUPPLIERREQUEST':
      return { normalizedType: 'SR', prefix: 'SR' };
    case 'RFQ':
    case 'QUOTATION':
    default:
      return { normalizedType: 'RFQ', prefix: 'RFQ' };
  }
}

export function formatDateStr(date?: Date | string | null): string {
  const d = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const yyyy = validDate.getFullYear();
  const mm = String(validDate.getMonth() + 1).padStart(2, '0');
  const dd = String(validDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatDocNumber(prefix: string, dateStr: string, sequence: number, padding: number = 6): string {
  return `${prefix}-${dateStr}-${String(sequence).padStart(padding, '0')}`;
}

/**
 * Reads existing document records from the database to find the highest sequence allocated on that date.
 */
async function getHighestExistingSequenceFromTable(
  tenantId: string,
  prefix: string,
  dateStr: string
): Promise<number> {
  const pattern = `${prefix}-${dateStr}-%`;
  let existingNumbers: string[] = [];

  try {
    switch (prefix) {
      case 'PO': {
        const rows = await db
          .select({ num: purchaseOrders.poNumber })
          .from(purchaseOrders)
          .where(sql`${purchaseOrders.tenantId} = ${tenantId} AND ${purchaseOrders.poNumber} LIKE ${pattern}`);
        existingNumbers = rows.map((r) => r.num);
        break;
      }
      case 'GRN': {
        const rows = await db
          .select({ num: goodsReceivedNotes.grnNumber })
          .from(goodsReceivedNotes)
          .where(sql`${goodsReceivedNotes.tenantId} = ${tenantId} AND ${goodsReceivedNotes.grnNumber} LIKE ${pattern}`);
        existingNumbers = rows.map((r) => r.num);
        break;
      }
      case 'QC': {
        const rows = await db
          .select({ num: qualityCheckRecords.qcNumber })
          .from(qualityCheckRecords)
          .where(sql`${qualityCheckRecords.tenantId} = ${tenantId} AND ${qualityCheckRecords.qcNumber} LIKE ${pattern}`);
        existingNumbers = rows.map((r) => r.num);
        break;
      }
      case 'BILL':
      case 'PB': {
        const rows = await db
          .select({ num: supplierBills.billNumber })
          .from(supplierBills)
          .where(sql`${supplierBills.tenantId} = ${tenantId} AND ${supplierBills.billNumber} LIKE ${pattern}`);
        existingNumbers = rows.map((r) => r.num);
        break;
      }
      case 'CS': {
        const rows = await db
          .select({ num: quotationComparativeStatements.csNumber })
          .from(quotationComparativeStatements)
          .where(sql`${quotationComparativeStatements.tenantId} = ${tenantId} AND ${quotationComparativeStatements.csNumber} LIKE ${pattern}`);
        existingNumbers = rows.map((r) => r.num);
        break;
      }
      case 'RFQ':
      case 'SR': {
        const rows = await db
          .select({ num: supplierQuotations.quotationNumber })
          .from(supplierQuotations)
          .where(sql`${supplierQuotations.tenantId} = ${tenantId} AND ${supplierQuotations.quotationNumber} LIKE ${pattern}`);
        existingNumbers = rows.map((r) => r.num);
        break;
      }
    }
  } catch (err) {
    console.warn(`[getHighestExistingSequenceFromTable] query error:`, err);
  }

  let maxSeq = 0;
  for (const num of existingNumbers) {
    const parts = num.split('-');
    if (parts.length >= 5) {
      const lastPart = parts[parts.length - 1];
      const parsed = parseInt(lastPart, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  }

  return maxSeq;
}

/**
 * Gets the next sequence number and increments the counter in document_sequences.
 */
export async function getNextDocumentNumber(
  tenantId: string,
  rawType: string,
  date?: Date | string | null
): Promise<DocumentSequenceResult> {
  const { normalizedType, prefix } = normalizeDocType(rawType);
  const dateStr = formatDateStr(date);

  // 1. Get max from existing rows in actual table
  const maxTableSeq = await getHighestExistingSequenceFromTable(tenantId, prefix, dateStr);

  // 2. Query document_sequences table
  let currentSeq = 0;
  try {
    const row = await db.run(
      sql`SELECT current_sequence FROM document_sequences WHERE tenant_id = ${tenantId} AND document_type = ${prefix} AND date_prefix = ${dateStr} LIMIT 1`
    );
    // @ts-ignore
    if (row && row.rows && row.rows.length > 0) {
      // @ts-ignore
      currentSeq = Number(row.rows[0].current_sequence || 0);
    }
  } catch (e) {
    // ignore if table querying with raw sql differs
  }

  const nextSeq = Math.max(maxTableSeq, currentSeq) + 1;

  // 3. Upsert into document_sequences
  try {
    await db.run(sql`
      INSERT INTO document_sequences (id, tenant_id, document_type, date_prefix, current_sequence, updated_at)
      VALUES (${crypto.randomUUID()}, ${tenantId}, ${prefix}, ${dateStr}, ${nextSeq}, CURRENT_TIMESTAMP)
      ON CONFLICT(tenant_id, document_type, date_prefix)
      DO UPDATE SET current_sequence = ${nextSeq}, updated_at = CURRENT_TIMESTAMP
    `);
  } catch (e) {
    console.warn('[getNextDocumentNumber] Failed to update document_sequences table, proceeding with sequence:', e);
  }

  const documentNumber = formatDocNumber(prefix, dateStr, nextSeq, 6);

  return {
    documentNumber,
    type: normalizedType,
    prefix,
    dateStr,
    sequence: nextSeq,
  };
}

/**
 * Peeks the next sequence without incrementing.
 */
export async function peekNextDocumentNumber(
  tenantId: string,
  rawType: string,
  date?: Date | string | null
): Promise<DocumentSequenceResult> {
  const { normalizedType, prefix } = normalizeDocType(rawType);
  const dateStr = formatDateStr(date);

  const maxTableSeq = await getHighestExistingSequenceFromTable(tenantId, prefix, dateStr);

  let currentSeq = 0;
  try {
    const row = await db.run(
      sql`SELECT current_sequence FROM document_sequences WHERE tenant_id = ${tenantId} AND document_type = ${prefix} AND date_prefix = ${dateStr} LIMIT 1`
    );
    // @ts-ignore
    if (row && row.rows && row.rows.length > 0) {
      // @ts-ignore
      currentSeq = Number(row.rows[0].current_sequence || 0);
    }
  } catch (e) {}

  const nextSeq = Math.max(maxTableSeq, currentSeq) + 1;
  const documentNumber = formatDocNumber(prefix, dateStr, nextSeq, 6);

  return {
    documentNumber,
    type: normalizedType,
    prefix,
    dateStr,
    sequence: nextSeq,
  };
}
