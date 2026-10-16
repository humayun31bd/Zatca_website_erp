import "dotenv/config";
import { db } from "./src/lib/db";
import { journalEntries, journalEntryLines } from "./src/lib/db/accounting_schema";

async function clearTransactions() {
  try {
    console.log("Deleting all journal entry lines...");
    await db.delete(journalEntryLines);
    console.log("Deleting all journal entries...");
    await db.delete(journalEntries);
    console.log("Done!");
    process.exit(0);
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
}

clearTransactions();
