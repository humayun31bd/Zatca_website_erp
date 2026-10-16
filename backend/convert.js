const fs = require('fs');
const path = require('path');
const dbDir = path.join(process.cwd(), 'src', 'lib', 'db');
const files = fs.readdirSync(dbDir).filter(f => f.endsWith('_schema.ts') || f === 'schema.ts');

files.forEach(file => {
  let content = fs.readFileSync(path.join(dbDir, file), 'utf8');
  
  // Imports
  content = content.replace(/drizzle-orm\/pg-core/g, 'drizzle-orm/sqlite-core');
  
  // Table
  content = content.replace(/pgTable\(/g, 'sqliteTable(');
  
  // Replace pgEnum export
  // export const statusEnum = pgEnum('status', ['active', 'inactive']);
  // to: export const statusEnum = { enum: ['active', 'inactive'] };
  content = content.replace(/export const (\w+) = pgEnum\(['"](.*?)['"], \[(.*?)\]\);/g, "export const $1 = { enum: [$3] };");
  
  // Types replacements
  // uuid("id") -> text("id")
  content = content.replace(/\buuid\((.*?)\)/g, 'text($1)');
  // varchar("name", { length: 255 }) -> text("name")
  content = content.replace(/\bvarchar\((.*?), \{.*?\}\)/g, 'text($1)');
  content = content.replace(/\bvarchar\((.*?)\)/g, 'text($1)');
  
  // jsonb -> text
  content = content.replace(/\bjsonb\((.*?)\)/g, "text($1, { mode: 'json' })");
  content = content.replace(/\bjson\((.*?)\)/g, "text($1, { mode: 'json' })");
  
  // boolean -> integer
  content = content.replace(/\bboolean\((.*?)\)/g, "integer($1, { mode: 'boolean' })");
  
  // decimal, doublePrecision -> real
  content = content.replace(/\bdecimal\((.*?), \{.*?\}\)/g, 'real($1)');
  content = content.replace(/\bdecimal\((.*?)\)/g, 'real($1)');
  content = content.replace(/\bdoublePrecision\((.*?)\)/g, 'real($1)');
  content = content.replace(/\bdate\((.*?)\)/g, 'text($1)');
  
  // Timestamps
  content = content.replace(/\btimestamp\((.*?), \{.*?\}\)/g, "integer($1, { mode: 'timestamp' })");
  content = content.replace(/\btimestamp\((.*?)\)/g, "integer($1, { mode: 'timestamp' })");
  
  // defaultRandom() -> $defaultFn(() => crypto.randomUUID())
  content = content.replace(/\.defaultRandom\(\)/g, ".$defaultFn(() => crypto.randomUUID())");
  
  // enums usage: statusEnum('status') -> text('status', { enum: ['a', 'b'] })
  // Actually simpler: if they have statusEnum("status"), we can change it to text("status")
  content = content.replace(/([a-zA-Z0-9_]+Enum)\((.*?)\)/g, "text($2)");

  fs.writeFileSync(path.join(dbDir, file), content);
});
console.log('Schemas converted successfully');
