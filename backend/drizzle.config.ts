import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: ['./src/lib/db/schema.ts', './src/lib/db/hr_schema.ts', './src/lib/db/accounting_schema.ts', './src/lib/db/product_schema.ts', './src/lib/db/pos_schema.ts'],
  out: './drizzle',
  dbCredentials: {
    url: 'sqlite.db'
  }
});
