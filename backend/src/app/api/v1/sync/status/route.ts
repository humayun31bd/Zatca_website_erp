import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncQueue } from "@/lib/db/accounting_schema";
import { triggerSyncNow } from "@/lib/sync/sync_worker";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const allQueueItems = db.select().from(syncQueue).all();

    const pendingCount = allQueueItems.filter((i) => i.status === "PENDING").length;
    const syncedCount = allQueueItems.filter((i) => i.status === "SYNCED").length;
    const failedCount = allQueueItems.filter((i) => i.status === "FAILED").length;

    const lastSyncedItem = allQueueItems
      .filter((i) => i.syncedAt !== null)
      .sort((a, b) => new Date(b.syncedAt!).getTime() - new Date(a.syncedAt!).getTime())[0];

    return NextResponse.json({
      success: true,
      metrics: {
        totalQueue: allQueueItems.length,
        pending: pendingCount,
        synced: syncedCount,
        failed: failedCount,
        lastSyncedAt: lastSyncedItem ? lastSyncedItem.syncedAt : null,
      },
    });
  } catch (error: any) {
    console.error("GET Sync Status Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = await triggerSyncNow();
    return NextResponse.json({
      success: result.success,
      syncedCount: result.syncedCount,
      failedCount: result.failedCount,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error("POST Manual Sync Trigger Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
