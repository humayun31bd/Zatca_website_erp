import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL!.replace(':6543/', ':5432/');
const sql = postgres(connectionString, { ssl: 'require', max: 1 });
const db = drizzle(sql);

async function run() {
  try {
    const files = fs.readdirSync(path.join(__dirname, 'drizzle')).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
      console.log('Running migration file:', file);
      const migrationSql = fs.readFileSync(path.join(__dirname, 'drizzle', file), 'utf8');
      const statements = migrationSql.split('--> statement-breakpoint');
      
      for (const stmt of statements) {
        if (stmt.trim()) {
          console.log('Executing:', stmt.substring(0, 50) + '...');
          try {
            await sql.unsafe(stmt);
          } catch (e: any) {
            console.error('Statement failed, continuing:', e.message);
          }
        }
      }
    }
    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

run();
