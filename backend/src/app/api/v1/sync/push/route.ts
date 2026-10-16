import { NextRequest, NextResponse } from "next/server";
import { validateVoucherInvariants } from "@/lib/accounting/validator";
import { db } from "@/lib/db";
import { vouchers, voucherLines } from "@/lib/db/accounting_schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const deviceId = req.headers.get("x-device-id") || req.headers.get("authorization");
    
    // 1. Device Authentication Check
    if (!deviceId) {
      return NextResponse.json({ error: "Unauthorized: Missing X-Device-Id authentication header." }, { status: 401 });
    }

    const body = await req.json();
    const { batch } = body;

    if (!batch || !Array.isArray(batch)) {
      return NextResponse.json({ error: "Invalid payload format: 'batch' array required." }, { status: 400 });
    }

    const syncedIds: string[] = [];
    const errors: string[] = [];

    // 2. Process Sync Batch Items
    for (const item of batch) {
      const { entityType, entityId, payload } = item;

      if (entityType === "VOUCHER") {
        const voucherData = payload.voucher || payload;
        const linesData = payload.lines || [];

        // Re-validate Double-Entry Invariants on Cloud Ingestion
        if (linesData.length >= 2) {
          const validation = validateVoucherInvariants(
            linesData.map((l: any) => ({
              accountId: l.accountId,
              costCenterId: l.costCenterId || undefined,
              debit: Number(l.debit) || 0,
              credit: Number(l.credit) || 0,
              narration: l.narration || undefined,
            }))
          );

          if (!validation.isValid) {
            errors.push(`Entity ${entityId} double-entry validation failed: ${validation.error}`);
            continue;
          }
        }

        // Commit to Cloud Database / SQLite storage mirror
        db.transaction((tx) => {
          if (voucherData.voucherNumber) {
            tx.update(vouchers)
              .set({
                syncStatus: "SYNCED",
                syncedAt: new Date(),
              })
              .where(eq(vouchers.id, entityId))
              .run();
          }
        });

        syncedIds.push(entityId);
      } else {
        // Generic entity sync processing
        syncedIds.push(entityId);
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: syncedIds.length,
      syncedIds,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Cloud Sync Push Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
