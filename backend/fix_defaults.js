const fs = require('fs');
const path = require('path');
const dbDir = path.join(process.cwd(), 'src', 'lib', 'db');
const files = fs.readdirSync(dbDir).filter(f => f.endsWith('_schema.ts') || f === 'schema.ts');

files.forEach(file => {
  let content = fs.readFileSync(path.join(dbDir, file), 'utf8');
  content = content.replace(/\.default\(['"]0\.00['"]\)/g, '.default(0)');
  content = content.replace(/\.default\(['"]0['"]\)/g, '.default(0)');
  content = content.replace(/\.default\(['"]1['"]\)/g, '.default(1)');
  
  content = content.replace(/AnyPgColumn/g, 'AnySQLiteColumn');
  if (content.includes('AnySQLiteColumn') && !content.includes('AnySQLiteColumn }')) {
    content = content.replace(/import \{ (sqliteTable)/, 'import { AnySQLiteColumn, $1');
  }

  fs.writeFileSync(path.join(dbDir, file), content);
});

// Fix API routes that pass strings for amounts
const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
function fixApiFiles(dir) {
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      fixApiFiles(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix string assignments to amount fields in API routes
      // e.g. amount: "0.00" to amount: 0
      
      let changed = false;
      if (content.includes('Number(') === false) {
        // Replace debit: item.debit with debit: Number(item.debit)
        // Too risky with simple regex, better to just let tsc identify them, or convert the obvious ones.
      }
      // Actually, let's just convert the most common `amount: "..."` occurrences
      content = content.replace(/amount:\s*["']0\.00["']/g, 'amount: 0');
      content = content.replace(/debit:\s*["']0\.00["']/g, 'debit: 0');
      content = content.replace(/credit:\s*["']0\.00["']/g, 'credit: 0');
      
      fs.writeFileSync(fullPath, content);
    }
  }
}
fixApiFiles(apiDir);
console.log('Fixed schemas defaults and types');
