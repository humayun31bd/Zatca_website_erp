import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chequeLeaves, syncQueue } from "@/lib/db/accounting_schema";
import { verifySession } from "@/lib/auth/session";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req);
    const body = await req.json();
    const { chequeLeafId, clearedDate, remarks } = body;

    if (!chequeLeafId) {
      return NextResponse.json(
        { error: "Missing required field: chequeLeafId" },
        { status: 400 }
      );
    }

    const existingLeaf = db
      .select()
      .from(chequeLeaves)
      .where(eq(chequeLeaves.id, chequeLeafId))
      .get();

    if (!existingLeaf) {
      return NextResponse.json({ error: "Cheque Leaf not found." }, { status: 404 });
    }

    const clearDate = clearedDate ? new Date(clearedDate) : new Date();

    const updated = db.transaction((tx) => {
      const leaf = tx
        .update(chequeLeaves)
        .set({
          status: "CLEARED",
          clearedDate: clearDate,
          remarks: remarks || "Cleared during Bank Reconciliation",
        })
        .where(eq(chequeLeaves.id, chequeLeafId))
        .returning()
        .get();

      // Transactional outbox sync queue event
      tx.insert(syncQueue)
        .values({
          tenantId: existingLeaf.tenantId,
          entityType: "CHEQUE_LEAF",
          entityId: chequeLeafId,
          action: "UPDATE",
          payload: JSON.stringify({ chequeLeafId, status: "CLEARED", clearedDate: clearDate }),
          status: "PENDING",
        })
        .run();

      return leaf;
    });

    return NextResponse.json({ success: true, chequeLeaf: updated });
  } catch (error: any) {
    console.error("POST Clear Cheque Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
