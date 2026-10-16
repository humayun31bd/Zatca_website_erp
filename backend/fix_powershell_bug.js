const fs = require('fs');
const path = require('path');

function fix(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  // pos/checkout
  content = content.replace(/unitPrice: Number\(\.toFixed\(2\)\)/g, 'unitPrice: Number(unitPrice.toFixed(2))');
  content = content.replace(/taxPercent: Number\(\.toFixed\(2\)\)/g, 'taxPercent: Number(taxPercent.toFixed(2))');
  content = content.replace(/taxAmount: Number\(\.toFixed\(2\)\)/g, 'taxAmount: Number(lineTax.toFixed(2))');
  content = content.replace(/lineTotal: Number\(\.toFixed\(2\)\)/g, 'lineTotal: Number(lineTotal.toFixed(2))');
  
  content = content.replace(/subtotalAmount: Number\(\.toFixed\(2\)\)/g, 'subtotalAmount: Number(subtotalAmount.toFixed(2))');
  content = content.replace(/totalVatAmount: Number\(\.toFixed\(2\)\)/g, 'totalVatAmount: Number(totalVatAmount.toFixed(2))');
  content = content.replace(/totalAmount: Number\(\.toFixed\(2\)\)/g, 'totalAmount: Number(totalAmount.toFixed(2))');
  
  // pos/checkout JE lines
  // Debit Cash (Total Amount)
  // Credit Revenue (Subtotal Amount)
  // Credit VAT Payable if applicable
  // Unfortunately, in the JE, they were all replaced by Number(). 
  // Let's just fix the JE lines manually below.

  // profit-loss
  content = content.replace(/totalRevenue \+= Number\(\) - Number\(\);/g, 'totalRevenue += Number(line.credit) - Number(line.debit);');
  content = content.replace(/totalExpenses \+= Number\(\) - Number\(\);/g, 'totalExpenses += Number(line.debit) - Number(line.credit);');
  
  // vat
  content = content.replace(/const amount = Number\(\);/g, 'const amount = Number(inv.totalAmount);');
  content = content.replace(/const vat = Number\(\);/g, 'const vat = Number(inv.totalVatAmount);');
  content = content.replace(/const subtotal = Number\(\);/g, 'const subtotal = Number(inv.subtotalAmount);');
  
  fs.writeFileSync(file, content);
}

['src/app/api/v1/pos/checkout/route.ts', 'src/app/api/v1/reports/profit-loss/route.ts', 'src/app/api/v1/reports/vat/route.ts'].forEach(f => {
  const p = path.join(process.cwd(), f);
  if (fs.existsSync(p)) fix(p);
});

// For pos/checkout JE:
let posFile = path.join(process.cwd(), 'src/app/api/v1/pos/checkout/route.ts');
let posContent = fs.readFileSync(posFile, 'utf8');
posContent = posContent.replace(/debit: Number\(\),\s*credit: 0,\s*description: `Cash received/g, 'debit: Number(totalAmount.toFixed(2)),\n            credit: 0,\n            description: `Cash received');
posContent = posContent.replace(/debit: 0,\s*credit: Number\(\),\s*description: `Revenue for POS Sale/g, 'debit: 0,\n            credit: Number(subtotalAmount.toFixed(2)),\n            description: `Revenue for POS Sale');
posContent = posContent.replace(/debit: 0,\s*credit: Number\(\),\s*description: `Output VAT for POS Sale/g, 'debit: 0,\n            credit: Number(totalVatAmount.toFixed(2)),\n            description: `Output VAT for POS Sale');
fs.writeFileSync(posFile, posContent);

// Let's also fix purchase/route.ts missing replacements
let purFile = path.join(process.cwd(), 'src/app/api/v1/purchases/route.ts');
let purContent = fs.readFileSync(purFile, 'utf8');
purContent = purContent.replace(/debit: Number\(\),\s*credit: 0,\s*description: `Inventory/g, 'debit: Number(parseResult.data.subtotalAmount),\n            credit: 0,\n            description: `Inventory');
purContent = purContent.replace(/debit: 0,\s*credit: Number\(\),\s*description: `A\/P/g, 'debit: 0,\n            credit: Number(parseResult.data.totalAmount),\n            description: `A/P');
purContent = purContent.replace(/debit: Number\(\),\s*credit: 0,\s*description: `Input/g, 'debit: Number(parseResult.data.totalVatAmount),\n            credit: 0,\n            description: `Input');

fs.writeFileSync(purFile, purContent);
