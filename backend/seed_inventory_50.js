const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
require('dotenv').config();

async function seed() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://admin:password123@localhost:5432/uae_invoice?sslmode=disable';
  const sql = postgres(connectionString);
  const db = drizzle(sql);

  console.log("Fetching Grocery Tenant...");

  const tenantRes = await sql`
    SELECT id FROM tenants WHERE email = 'admin@freshgrocery.com' LIMIT 1
  `;
  
  if (tenantRes.length === 0) {
    console.error("Grocery tenant not found! Run the previous seed first.");
    process.exit(1);
  }
  const tenantId = tenantRes[0].id;

  console.log("Fetching Categories...");
  const categoriesRes = await sql`
    SELECT id, name FROM categories WHERE tenant_id = ${tenantId}
  `;
  
  if (categoriesRes.length === 0) {
    console.error("No categories found!");
    process.exit(1);
  }

  const catIdMap = {};
  for (const cat of categoriesRes) {
    catIdMap[cat.name] = cat.id;
  }
  const categoryNames = Object.keys(catIdMap);

  console.log("Creating 50 Products...");
  
  const products = [];
  
  for (let i = 1; i <= 50; i++) {
    const categoryName = categoryNames[i % categoryNames.length];
    const catId = catIdMap[categoryName];
    
    // Generate some variety in price and stock
    const price = (Math.random() * 20 + 1).toFixed(2);
    const costPrice = (price * 0.6).toFixed(2);
    const stock = Math.floor(Math.random() * 500) + 20; // 20 to 520
    const minStock = 10;
    
    let unitCode = 'PCE';
    if (categoryName === 'Fruits' || categoryName === 'Vegetables') {
      unitCode = 'KGM';
    } else if (categoryName === 'Dairy & Eggs' && i % 2 === 0) {
      unitCode = 'LTR';
    }

    products.push({
      name: `Grocery Item ${i} (${categoryName})`,
      barcode: `1000000${i.toString().padStart(3, '0')}`,
      categoryId: catId,
      unitCode: unitCode,
      description: `Premium quality ${categoryName.toLowerCase()} product`,
      price: price,
      costPrice: costPrice,
      stockQuantity: stock,
      minStockLevel: minStock
    });
  }

  for (const p of products) {
    await sql`
      INSERT INTO products (
        id, tenant_id, name, barcode, category_id, unit_code,
        description, price, cost_price, stock_quantity, min_stock_level
      ) VALUES (
        gen_random_uuid(), ${tenantId}, ${p.name}, ${p.barcode}, ${p.categoryId}, ${p.unitCode},
        ${p.description}, ${p.price}, ${p.costPrice}, ${p.stockQuantity}, ${p.minStockLevel}
      ) ON CONFLICT DO NOTHING
    `;
  }

  console.log("Database successfully seeded with 50 products!");
  process.exit(0);
}

seed().catch(err => {
  console.error("SEED ERROR:", err);
  process.exit(1);
});
