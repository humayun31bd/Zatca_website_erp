import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";
import {
  getNextDocumentNumber,
  peekNextDocumentNumber,
  formatDateStr,
  DocumentType,
} from "@/lib/procurement/document_sequences";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId =
      session?.tenantId ||
      req.headers.get("x-tenant-id") ||
      req.nextUrl.searchParams.get("tenantId") ||
      "336eaf82-a524-4b0a-9326-7197b1e5459e";

    const type = req.nextUrl.searchParams.get("type");
    const dateParam = req.nextUrl.searchParams.get("date");
    const isReserve = req.nextUrl.searchParams.get("reserve") === "true";

    // If specific document type requested
    if (type) {
      const result = isReserve
        ? await getNextDocumentNumber(tenantId, type, dateParam)
        : await peekNextDocumentNumber(tenantId, type, dateParam);

      return NextResponse.json({
        success: true,
        data: result,
        documentNumber: result.documentNumber,
        type: result.type,
        prefix: result.prefix,
        date: result.dateStr,
        sequence: result.sequence,
      });
    }

    // Return overview of all document types
    const types: DocumentType[] = ['RFQ', 'CS', 'PO', 'GRN', 'QC', 'BILL', 'PB', 'SR'];
    const overview: Record<string, string> = {};

    for (const t of types) {
      const res = await peekNextDocumentNumber(tenantId, t, dateParam);
      overview[t] = res.documentNumber;
    }

    return NextResponse.json({
      success: true,
      date: formatDateStr(dateParam),
      sequences: overview,
      formatPattern: "<PREFIX>-YYYY-MM-DD-XXXXXX",
    });
  } catch (error: any) {
    console.error("GET Document Sequences Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch document sequence" }, { status: 500 });
  }
}
