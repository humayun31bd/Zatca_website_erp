import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { qualityCheckRecords, qcItems, goodsReceivedNotes } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";
import { getNextDocumentNumber } from "@/lib/procurement/document_sequences";

function formatQC(qc: any, items: any[] = []) {
  return {
    id: qc.id,
    tenantId: qc.tenantId,
    qcNumber: qc.qcNumber,
    grnId: qc.grnId,
    grnNumber: qc.grnNumber || "N/A",
    inspectorName: qc.inspectorName || "Inspector",
    checkDate: qc.checkDate instanceof Date ? qc.checkDate.toISOString() : (qc.checkDate || new Date().toISOString()),
    overallStatus: qc.overallStatus || "PASSED",
    totalReceived: Number(qc.totalReceived ?? 0),
    totalAccepted: Number(qc.totalAccepted ?? 0),
    totalRejected: Number(qc.totalRejected ?? 0),
    totalExchanged: Number(qc.totalExchanged ?? 0),
    remarks: qc.remarks || "",
    createdAt: qc.createdAt instanceof Date ? qc.createdAt.toISOString() : (qc.createdAt || new Date().toISOString()),
    items: items.map((item) => ({
      id: item.id,
      qcId: item.qcId,
      description: item.description || "",
      receivedQuantity: Number(item.receivedQuantity ?? 0),
      acceptedQuantity: Number(item.acceptedQuantity ?? 0),
      rejectedQuantity: Number(item.rejectedQuantity ?? 0),
      exchangedQuantity: Number(item.exchangedQuantity ?? 0),
      status: item.status || "PASSED",
      defectReason: item.defectReason || "",
    })),
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId =
      session?.tenantId ||
      req.headers.get("x-tenant-id") ||
      req.nextUrl.searchParams.get("tenantId") ||
      "336eaf82-a524-4b0a-9326-7197b1e5459e";

    const qcList = await db
      .select()
      .from(qualityCheckRecords)
      .where(eq(qualityCheckRecords.tenantId, tenantId))
      .orderBy(desc(qualityCheckRecords.createdAt));

    const result = [];
    for (const qc of qcList) {
      const items = await db
        .select()
        .from(qcItems)
        .where(eq(qcItems.qcId, qc.id));

      result.push(formatQC(qc, items));
    }

    return NextResponse.json({ success: true, data: result, qcList: result });
  } catch (error: any) {
    console.error("GET QC Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const tenantId =
      session?.tenantId ||
      req.headers.get("x-tenant-id") ||
      req.nextUrl.searchParams.get("tenantId") ||
      "336eaf82-a524-4b0a-9326-7197b1e5459e";

    const body = await req.json();

    const {
      grnId,
      grnNumber,
      inspectorName,
      checkDate,
      remarks,
      items = [],
    } = body;

    if (!grnId) {
      return NextResponse.json({ error: "GRN ID is required" }, { status: 400 });
    }

    const finalQcNumber =
      body.qcNumber || (await getNextDocumentNumber(tenantId, 'QC', checkDate)).documentNumber;
    const newQcId = crypto.randomUUID();

    let totalRec = 0;
    let totalAcc = 0;
    let totalRej = 0;
    let totalExc = 0;

    const formattedItems = items.map((item: any) => {
      const rec = Number(item.receivedQuantity || 0);
      const acc = Number(item.acceptedQuantity || 0);
      const rej = Number(item.rejectedQuantity || 0);
      const exc = Number(item.exchangedQuantity || 0);

      totalRec += rec;
      totalAcc += acc;
      totalRej += rej;
      totalExc += exc;

      let status = "PASSED";
      if (rej > 0 && acc === 0) status = "REJECTED";
      else if (exc > 0) status = "EXCHANGED";
      else if (rej > 0) status = "PARTIAL_PASSED";

      return {
        id: crypto.randomUUID(),
        qcId: newQcId,
        description: item.description || "Inspected Item",
        receivedQuantity: rec,
        acceptedQuantity: acc,
        rejectedQuantity: rej,
        exchangedQuantity: exc,
        status,
        defectReason: item.defectReason || "",
      };
    });

    let overallStatus = "PASSED";
    if (totalRej > 0 && totalAcc === 0) overallStatus = "FAILED";
    else if (totalRej > 0 || totalExc > 0) overallStatus = "PARTIAL_PASSED";

    const [newQc] = await db
      .insert(qualityCheckRecords)
      .values({
        id: newQcId,
        tenantId,
        qcNumber: finalQcNumber,
        grnId,
        grnNumber: grnNumber || "GRN",
        inspectorName: inspectorName || "QC Inspector",
        checkDate: checkDate || new Date().toISOString(),
        overallStatus,
        totalReceived: totalRec,
        totalAccepted: totalAcc,
        totalRejected: totalRej,
        totalExchanged: totalExc,
        remarks: remarks || "",
      })
      .returning();

    for (const item of formattedItems) {
      await db.insert(qcItems).values(item);
    }

    // Update GRN status
    await db.update(goodsReceivedNotes).set({ status: "QC_COMPLETED" }).where(eq(goodsReceivedNotes.id, grnId));

    return NextResponse.json({
      success: true,
      data: formatQC(newQc, formattedItems),
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST QC Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
