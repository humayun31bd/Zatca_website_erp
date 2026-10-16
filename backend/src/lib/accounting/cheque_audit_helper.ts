import { db } from "@/lib/db";
import { chequeLeafAuditLogs } from "@/lib/db/accounting_schema";

export async function logChequeAudit({
  tenantId,
  chequeLeafId,
  actionType,
  previousStatus,
  newStatus,
  performedBy = "Financial Controller / Maker",
  remarks,
  tx,
}: {
  tenantId: string;
  chequeLeafId: string;
  actionType: "CREATED" | "ISSUED" | "PDC_RECEIVED" | "DEPOSITED" | "CLEARED" | "BOUNCED" | "CANCELLED";
  previousStatus?: string | null;
  newStatus: string;
  performedBy?: string;
  remarks?: string | null;
  tx?: any;
}) {
  const runner = tx || db;
  await runner.insert(chequeLeafAuditLogs).values({
    tenantId,
    chequeLeafId,
    actionType,
    previousStatus: previousStatus || null,
    newStatus,
    performedBy,
    remarks: remarks || null,
  });
}
