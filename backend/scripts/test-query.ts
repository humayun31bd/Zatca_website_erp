import { config } from "dotenv";
config({ path: '.env' });
import { db } from "../src/lib/db";
import { invoices } from "../src/lib/db/schema";
import { desc } from "drizzle-orm";

async function main() {
  try {
    const data = await db.query.invoices.findMany({
      orderBy: [desc(invoices.issueDatetime)],
      with: {
        payments: true,
      },
    });
    console.log("Success:", data.length);
  } catch (error) {
    console.error("Database Error:", error);
  }
}

main();
