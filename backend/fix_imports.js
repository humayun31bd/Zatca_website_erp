const fs = require('fs');
const path = require('path');
const dbDir = path.join(process.cwd(), 'src', 'lib', 'db');
const files = fs.readdirSync(dbDir).filter(f => f.endsWith('_schema.ts') || f === 'schema.ts');

files.forEach(file => {
  let content = fs.readFileSync(path.join(dbDir, file), 'utf8');
  content = content.replace(/pgTable/g, 'sqliteTable');
  
  content = content.replace(/import \{.*?\} from 'drizzle-orm\/sqlite-core';/g, 
    "import { sqliteTable, integer, text, real, blob, unique, check, uniqueIndex, index } from 'drizzle-orm/sqlite-core';");
  
  fs.writeFileSync(path.join(dbDir, file), content);
});
console.log('Imports fixed');
