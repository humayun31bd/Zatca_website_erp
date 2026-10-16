import { db } from "@/lib/db";
import { syncQueue, vouchers } from "@/lib/db/accounting_schema";
import { eq, and, lt, inArray } from "drizzle-orm";

export interface SyncBatchResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}

const CLOUD_SYNC_URL = process.env.CLOUD_SYNC_URL || "http://localhost:3000/api/v1/sync/push";
const MAX_RETRIES = 5;

let syncTimer: NodeJS.Timeout | null = null;
let isSyncing = false;

/**
 * Executes a single sync iteration reading PENDING / FAILED items from local SQLite 
 * outbox queue and pushing them to Cloud PostgreSQL sync endpoint.
 */
export async function triggerSyncNow(): Promise<SyncBatchResult> {
  if (isSyncing) {
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      errors: ["Sync already in progress. Skipping duplicate run."],
    };
  }

  isSyncing = true;
  let syncedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  try {
    // 1. Fetch pending items from sync_queue
    const pendingItems = db
      .select()
      .from(syncQueue)
      .where(and(lt(syncQueue.retryCount, MAX_RETRIES)))
      .all()
      .filter((item) => item.status === "PENDING" || item.status === "FAILED");

    if (pendingItems.length === 0) {
      isSyncing = false;
      return { success: true, syncedCount: 0, failedCount: 0, errors: [] };
    }

    console.log(`[SyncWorker] Found ${pendingItems.length} pending items to sync.`);

    // 2. Build payload batch
    const payloadBatch = pendingItems.map((item) => ({
      queueId: item.id,
      tenantId: item.tenantId,
      entityType: item.entityType,
      entityId: item.entityId,
      action: item.action,
      payload: JSON.parse(item.payload),
      createdAt: item.createdAt,
    }));

    // 3. Dispatch batch to Cloud Ingestion API
    let response: Response | null = null;
    let isMockOrSuccess = false;
    let syncedEntityIds: string[] = [];

    try {
      response = await fetch(CLOUD_SYNC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": process.env.DEVICE_ID || "local-edge-node-1",
        },
        body: JSON.stringify({ batch: payloadBatch }),
      });

      if (response.ok) {
        const body = await response.json();
        isMockOrSuccess = true;
        syncedEntityIds = body.syncedIds || pendingItems.map((i) => i.entityId);
      } else {
        const errText = await response.text();
        errors.push(`Cloud Sync HTTP ${response.status}: ${errText}`);
      }
    } catch (fetchErr: any) {
      // In offline mode or local test where cloud API endpoint is unreachable
      errors.push(`Network fetch error: ${fetchErr.message}`);
    }

    // 4. Update local SQLite DB based on result
    if (isMockOrSuccess) {
      const now = new Date();
      db.transaction((tx) => {
        for (const item of pendingItems) {
          // Update sync_queue
          tx.update(syncQueue)
            .set({
              status: "SYNCED",
              syncedAt: now,
              lastError: null,
            })
            .where(eq(syncQueue.id, item.id))
            .run();

          // Update vouchers syncStatus if item is VOUCHER
          if (item.entityType === "VOUCHER") {
            tx.update(vouchers)
              .set({
                syncStatus: "SYNCED",
                syncedAt: now,
              })
              .where(eq(vouchers.id, item.entityId))
              .run();
          }

          syncedCount++;
        }
      });
      console.log(`[SyncWorker] Successfully synced ${syncedCount} items.`);
    } else {
      // Record failure for batch items
      const lastErr = errors.join("; ");
      db.transaction((tx) => {
        for (const item of pendingItems) {
          tx.update(syncQueue)
            .set({
              status: "FAILED",
              retryCount: item.retryCount + 1,
              lastError: lastErr,
            })
            .where(eq(syncQueue.id, item.id))
            .run();

          if (item.entityType === "VOUCHER") {
            tx.update(vouchers)
              .set({
                syncStatus: "FAILED",
              })
              .where(eq(vouchers.id, item.entityId))
              .run();
          }

          failedCount++;
        }
      });
      console.warn(`[SyncWorker] Batch sync failed: ${lastErr}`);
    }

    return {
      success: errors.length === 0,
      syncedCount,
      failedCount,
      errors,
    };
  } catch (err: any) {
    console.error("[SyncWorker] Unexpected worker failure:", err);
    return {
      success: false,
      syncedCount,
      failedCount,
      errors: [err.message],
    };
  } finally {
    isSyncing = false;
  }
}

/**
 * Starts background sync interval (defaults to 5 minutes / 300,000 ms).
 */
export function startScheduledSync(intervalMs: number = 5 * 60 * 1000): void {
  if (syncTimer) {
    console.log("[SyncWorker] Scheduled sync timer already running.");
    return;
  }

  console.log(`[SyncWorker] Starting background sync timer (interval: ${intervalMs / 1000}s)...`);
  syncTimer = setInterval(async () => {
    console.log("[SyncWorker] Cron trigger executing sync...");
    await triggerSyncNow();
  }, intervalMs);
}

/**
 * Stops background sync timer cleanly.
 */
export function stopScheduledSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
    console.log("[SyncWorker] Background sync timer stopped.");
  }
}
