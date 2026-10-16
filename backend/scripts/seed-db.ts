// @ts-nocheck
import 'dotenv/config';
import { db } from '../src/lib/db/index';
import { tenants, invoices, invoiceLineItems, users, apiKeys, packages, subscriptions, categories, products, clients, suppliers, purchaseInvoices, cashBookEntries, subCategories, units, variationTemplates, variationValues, branches } from '../src/lib/db/schema';
import { accounts, costCenters, journalEntries, journalEntryLines } from '../src/lib/db/accounting_schema';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('Seeding database...');
  try {
    const tables = ['login_attempts', 'packages', 'tenants', 'users', 'invoices', 'subscriptions', 'api_keys', 'csid_certificates', 'invoice_line_items', 'whatsapp_messages', 'webhook_events', 'billing_credits', 'audit_logs', 'categories', 'sub_categories', 'units', 'variation_templates', 'variation_values', 'products', 'clients', 'suppliers', 'purchase_invoices', 'cash_book_entries', 'branches', 'cost_centers', 'accounts', 'journal_entries', 'journal_entry_lines', 'warehouses', 'counters', 'counter_sessions', 'invoice_payments'];
    await db.run(sql.raw(`PRAGMA foreign_keys = OFF;`));
    for (const table of tables) {
      try { await db.run(sql.raw(`DELETE FROM ${table}`)); } catch (e) { console.error('Error deleting', table, e); }
    }
    await db.run(sql.raw(`PRAGMA foreign_keys = ON;`));

    // 1. Create SaaS Packages
    const createdPackages = await db.insert(packages).values([
      {
        name: 'Agency Pro (White-Label)',
        type: 'AGENCY',
        price: '299.00',
        billingCycle: 'MONTHLY',
        features: { max_clients: 50, custom_branding: true, api_access: true }
      },
      {
        name: 'Cloud SaaS E-Invoicing (SME)',
        type: 'END_USER',
        price: '1200.00',
        billingCycle: 'YEARLY',
        features: { b2b: true, b2c: true, max_invoices: -1, api_access: false }
      },
      {
        name: 'API / Middleware Integration',
        type: 'END_USER',
        price: '4000.00',
        billingCycle: 'YEARLY',
        features: { api_access: true, b2b: true, b2c: true, erp_sync: true }
      },
      {
        name: 'POS + ZATCA Phase 2',
        type: 'END_USER',
        price: '2500.00',
        billingCycle: 'YEARLY',
        features: { offline_mode: true, b2c: true, thermal_print: true }
      },
      {
        name: 'Pay-As-You-Go',
        type: 'END_USER',
        price: '0.00',
        billingCycle: 'MONTHLY',
        features: { pay_per_invoice: true, b2b: true, b2c: true }
      },
      {
        name: 'Enterprise Custom',
        type: 'END_USER',
        price: '15000.00',
        billingCycle: 'YEARLY',
        features: { unlimited_invoices: true, dedicated_server: true, multi_branch: true }
      }
    ]).returning();
    console.log(`✅ Packages created`);

    const agencyPackageId = createdPackages[0].id; // Agency Pro
    const endUserPackageId = createdPackages[1].id; // Cloud SaaS (SME)

    // 2. Create Root Agency Tenant
    const [agencyTenant] = await db.insert(tenants).values({
      name: 'Super Software Agency LLC',
      vatNumber: '311111111111113',
      email: 'agency@super-software.com',
      subdomain: 'agency',
    }).returning();
    console.log(`✅ Agency Tenant created: ${agencyTenant.id}`);

    // Subscribe Agency to Agency Pro package
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    await db.insert(subscriptions).values({
      tenantId: agencyTenant.id,
      packageId: agencyPackageId,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: nextMonth,
    });
    console.log(`✅ Agency subscribed to Pro package`);

    // 3. Create Sub-Tenant (End User managed by Agency)
    const [clientTenant] = await db.insert(tenants).values({
      id: '336eaf82-a524-4b0a-9326-7197b1e5459e', // Hardcoded to match dummy JWT
      parentTenantId: agencyTenant.id,
      name: 'Demo Client Enterprise',
      vatNumber: '300000000000003',
      email: 'hello@demo-client.com',
      subdomain: 'demo',
    }).returning();
    console.log(`✅ Sub-Tenant (Client) created: ${clientTenant.id}`);

    // Subscribe Client to Starter package
    await db.insert(subscriptions).values({
      tenantId: clientTenant.id,
      packageId: endUserPackageId,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: nextMonth,
    });


    // 3.5 Create Categories, Products, and Clients
    const [electronicsCategory] = await db.insert(categories).values({
      tenantId: clientTenant.id,
      name: 'Electronics',
      description: 'Electronic devices and accessories',
    }).returning();

    const [servicesCategory] = await db.insert(categories).values({
      tenantId: clientTenant.id,
      name: 'Services',
      description: 'Consulting and software services',
    }).returning();

    await db.insert(products).values([
      {
        tenantId: clientTenant.id,
        categoryId: electronicsCategory.id,
        name: 'Smartphone Pro',
        barcode: '1234567890123',
        description: 'Latest smartphone model',
        price: '3500.00',
        costPrice: '2800.00',
        stockQuantity: 50,
      },
      {
        tenantId: clientTenant.id,
        categoryId: servicesCategory.id,
        name: 'Software License',
        barcode: 'SW-LIC-001',
        description: 'Annual software license',
        price: '1000.00',
        costPrice: '0.00',
        stockQuantity: 9999,
      }
    ]);

    const createdClients = await db.insert(clients).values([
      {
        tenantId: clientTenant.id,
        name: 'Acme Corp KSA 1',
        vatNumber: '310299887600003',
        address: 'Riyadh, KSA',
        email: 'billing@acme1.com',
      },
      {
        tenantId: clientTenant.id,
        name: 'Acme Corp KSA 2',
        vatNumber: '310299887600003',
        address: 'Jeddah, KSA',
        email: 'billing@acme2.com',
      }
    ]).returning();
    console.log(`✅ Categories, Products, and Clients created`);

    // 4. Create Users
    const passwordHash = await bcrypt.hash('password123', 10);
    await db.insert(users).values([
      {
        email: 'admin@super-software.com',
        passwordHash,
        role: 'SUPERADMIN',
        tenantId: agencyTenant.id,
      },
      {
        email: 'owner@demo-client.com',
        passwordHash,
        role: 'TENANT_ADMIN',
        tenantId: clientTenant.id,
      }
    ]);
    console.log(`✅ Users created`);

    // 5. Create API Key for Client
    await db.insert(apiKeys).values({
      name: 'Client API Key',
      keyHash: 'test_key_123456789_hash', // In reality, hash this
      prefix: 'test_key_123',
      tenantId: clientTenant.id,
      scopes: ['INVOICE:CREATE', 'INVOICE:READ']
    });
    console.log(`✅ API Key created`);

    // 6. Create 10 Mock Invoices for Client
    const invoiceData = Array.from({ length: 10 }).map((_, i) => {
      const isPaid = i % 2 === 0;
      const isCleared = i % 3 !== 0;

      return {
        tenantId: clientTenant.id,
        invoiceNumber: `INV-2026-00${i + 1}`,
        invoiceType: 'STANDARD',
        invoiceTypeCode: '388',
        sellerName: 'Demo Client Enterprise',
        sellerVat: '300000000000003',
        sellerAddress: '123 Client St, Jeddah, KSA',
        buyerName: `Acme Corp KSA ${i + 1}`,
        buyerVat: '310299887600003',
        subtotalAmount: (1000 + i * 100).toFixed(2),
        totalVatAmount: ((1000 + i * 100) * 0.15).toFixed(2),
        totalAmount: ((1000 + i * 100) * 1.15).toFixed(2),
        issueDatetime: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Backdate by days
        zatcaStatus: isCleared ? 'CLEARED' : 'PENDING',
        whatsappStatus: 'DELIVERED',
        paymentStatus: isPaid ? 'PAID' : 'UNPAID',
      };
    });

    const createdInvoices = await db.insert(invoices).values(invoiceData as any).returning();
    console.log(`✅ ${createdInvoices.length} Invoices created`);

    // 7. Create Line Items for all invoices
    const lineItemsData = createdInvoices.map((inv, i) => ({
      invoiceId: inv.id,
      lineNumber: 1,
      description: `Software License ${i + 1}`,
      quantity: '1',
      unitPrice: (1000 + i * 100).toFixed(2),
      taxPercent: '15.00',
      taxAmount: ((1000 + i * 100) * 0.15).toFixed(2),
      lineTotal: ((1000 + i * 100) * 1.15).toFixed(2),
    }));

    await db.insert(invoiceLineItems).values(lineItemsData as any);
    console.log(`✅ ${lineItemsData.length} Invoice Line Items created`);

    // 8. Create Suppliers, Purchase Invoices, and Cash Book Entries
    const [supplier1] = await db.insert(suppliers).values({
      tenantId: clientTenant.id,
      name: 'Global Tech Suppliers',
      vatNumber: '300000000000003',
      crNumber: '1010123456',
      address: 'Industrial City, Riyadh',
      email: 'sales@globaltech.sa',
    }).returning();
    console.log(`✅ Supplier created`);

    await db.insert(purchaseInvoices).values({
      tenantId: clientTenant.id,
      supplierId: supplier1.id,
      invoiceNumber: 'PUR-2026-001',
      issueDate: new Date(),
      subtotalAmount: '5000.00',
      totalVatAmount: '750.00',
      totalAmount: '5750.00',
      paymentStatus: 'PAID',
    });
    console.log(`✅ Purchase Invoice created`);

    await db.insert(cashBookEntries).values([
      {
        tenantId: clientTenant.id,
        type: 'IN',
        amount: '10000.00',
        category: 'Owner Equity',
        description: 'Initial Business Capital',
        entryDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        tenantId: clientTenant.id,
        type: 'OUT',
        amount: '5750.00',
        category: 'Purchases',
        description: 'Payment for PUR-2026-001',
        entryDate: new Date(),
      }
    ]);
    console.log(`✅ Cash Book Entries created`);

    // 9. Inventory Data (Categories, Units, Products)
    console.log('Seeding inventory data (500 products)...');
    
    // Categories
    const [catElectronics, catClothing] = await db.insert(categories).values([
      { tenantId: clientTenant.id, name: 'Electronics', description: 'Gadgets and devices' },
      { tenantId: clientTenant.id, name: 'Clothing', description: 'Apparel and accessories' }
    ]).returning();

    // SubCategories
    const [subCatPhones, subCatLaptops, subCatShirts] = await db.insert(subCategories).values([
      { tenantId: clientTenant.id, categoryId: catElectronics.id, name: 'Phones' },
      { tenantId: clientTenant.id, categoryId: catElectronics.id, name: 'Laptops' },
      { tenantId: clientTenant.id, categoryId: catClothing.id, name: 'Shirts' }
    ]).returning();

    // Units
    const [unitPcs, unitBox] = await db.insert(units).values([
      { tenantId: clientTenant.id, name: 'Pieces', shortName: 'PCE', baseUnit: true },
      { tenantId: clientTenant.id, name: 'Box', shortName: 'BOX', baseUnit: false }
    ]).returning();

    // Variables (Templates and Values)
    const [varSize, varColor] = await db.insert(variationTemplates).values([
      { tenantId: clientTenant.id, name: 'Size' },
      { tenantId: clientTenant.id, name: 'Color' }
    ]).returning();

    await db.insert(variationValues).values([
      { tenantId: clientTenant.id, templateId: varSize.id, value: 'Small' },
      { tenantId: clientTenant.id, templateId: varSize.id, value: 'Large' },
      { tenantId: clientTenant.id, templateId: varColor.id, value: 'Red' },
      { tenantId: clientTenant.id, templateId: varColor.id, value: 'Blue' }
    ]);

    // Products (500)
    const productsData = [];
    for (let i = 0; i < 500; i++) {
      productsData.push({
        tenantId: clientTenant.id,
        categoryId: i % 2 === 0 ? catElectronics.id : catClothing.id,
        name: `Seeded Product ${i + 1}`,
        barcode: `BARCODE-${i + 1}`,
        unitCode: 'PCE',
        description: `This is a generated product ${i + 1}`,
        price: (Math.random() * 1000 + 10).toFixed(2),
        costPrice: (Math.random() * 500 + 5).toFixed(2),
        stockQuantity: Math.floor(Math.random() * 100) + 10,
        minStockLevel: 5,
      });
    }

    // Insert in chunks of 100
    for (let i = 0; i < productsData.length; i += 100) {
      const chunk = productsData.slice(i, i + 100);
      await db.insert(products).values(chunk);
    }
    console.log('✅ 500 Products created');

    // 10. Seed Chart of Accounts
    console.log('Seeding Standard Chart of Accounts...');
    
    // Helper to map type string to database enum value if needed, but here we just use the types 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'
    const coaData = [
      // ASSETS
      { code: '1', name: 'Assets', type: 'ASSET', level: 1, isControl: true },
      { code: '1.10', name: 'Current Assets', type: 'ASSET', level: 2, isControl: true, parentCode: '1' },
      { code: '1.10.01', name: 'Cash & Bank', type: 'ASSET', level: 3, isControl: true, parentCode: '1.10' },
      { code: '1.10.01.001', name: 'Cash on Hand', type: 'ASSET', level: 4, isControl: true, parentCode: '1.10.01' },
      { code: '1.10.01.001.001', name: 'Petty Cash - Main', type: 'ASSET', level: 5, isControl: false, parentCode: '1.10.01.001' },
      { code: '1.10.01.002', name: 'Bank Account', type: 'ASSET', level: 4, isControl: true, parentCode: '1.10.01' },
      { code: '1.10.01.002.001', name: 'Bank - Operating Account', type: 'ASSET', level: 5, isControl: false, parentCode: '1.10.01.002' },
      { code: '1.10.02', name: 'Accounts Receivable', type: 'ASSET', level: 3, isControl: true, parentCode: '1.10' },
      { code: '1.10.02.001', name: 'Trade Receivables', type: 'ASSET', level: 4, isControl: true, parentCode: '1.10.02' },
      { code: '1.10.02.001.001', name: 'Receivable - POS Sales', type: 'ASSET', level: 5, isControl: false, parentCode: '1.10.02.001' },
      { code: '1.10.03', name: 'Inventory', type: 'ASSET', level: 3, isControl: true, parentCode: '1.10' },
      { code: '1.10.03.001', name: 'Merchandise Inventory', type: 'ASSET', level: 4, isControl: true, parentCode: '1.10.03' },
      { code: '1.10.03.001.001', name: 'Inventory - General', type: 'ASSET', level: 5, isControl: false, parentCode: '1.10.03.001' },
      { code: '1.20', name: 'Fixed Assets', type: 'ASSET', level: 2, isControl: true, parentCode: '1' },
      { code: '1.20.01', name: 'Furniture & Fixtures', type: 'ASSET', level: 3, isControl: true, parentCode: '1.20' },
      { code: '1.20.01.001', name: 'Store Fixtures', type: 'ASSET', level: 4, isControl: true, parentCode: '1.20.01' },
      { code: '1.20.01.001.001', name: 'Shelving', type: 'ASSET', level: 5, isControl: false, parentCode: '1.20.01.001' },
      { code: '1.20.02', name: 'Equipment', type: 'ASSET', level: 3, isControl: true, parentCode: '1.20' },
      { code: '1.20.02.001', name: 'POS Equipment', type: 'ASSET', level: 4, isControl: true, parentCode: '1.20.02' },
      { code: '1.20.02.001.001', name: 'POS Terminal', type: 'ASSET', level: 5, isControl: false, parentCode: '1.20.02.001' },

      // LIABILITIES
      { code: '2', name: 'Liabilities', type: 'LIABILITY', level: 1, isControl: true },
      { code: '2.10', name: 'Current Liabilities', type: 'LIABILITY', level: 2, isControl: true, parentCode: '2' },
      { code: '2.10.01', name: 'Accounts Payable', type: 'LIABILITY', level: 3, isControl: true, parentCode: '2.10' },
      { code: '2.10.01.001', name: 'Trade Payables', type: 'LIABILITY', level: 4, isControl: true, parentCode: '2.10.01' },
      { code: '2.10.01.001.001', name: 'Payable - General Suppliers', type: 'LIABILITY', level: 5, isControl: false, parentCode: '2.10.01.001' },
      { code: '2.10.02', name: 'Lease Obligations', type: 'LIABILITY', level: 3, isControl: true, parentCode: '2.10' },
      { code: '2.10.02.001', name: 'Rent Payable', type: 'LIABILITY', level: 4, isControl: true, parentCode: '2.10.02' },
      { code: '2.10.02.001.001', name: 'Rent Payable - Landlord', type: 'LIABILITY', level: 5, isControl: false, parentCode: '2.10.02.001' },
      { code: '2.10.03', name: 'Taxes Payable', type: 'LIABILITY', level: 3, isControl: true, parentCode: '2.10' },
      { code: '2.10.03.001', name: 'Sales Tax / VAT Payable', type: 'LIABILITY', level: 4, isControl: true, parentCode: '2.10.03' },
      { code: '2.10.03.001.001', name: 'VAT Output', type: 'LIABILITY', level: 5, isControl: false, parentCode: '2.10.03.001' },

      // EQUITY
      { code: '3', name: 'Equity', type: 'EQUITY', level: 1, isControl: true },
      { code: '3.10', name: 'Owner\'s Equity', type: 'EQUITY', level: 2, isControl: true, parentCode: '3' },
      { code: '3.10.01', name: 'Capital', type: 'EQUITY', level: 3, isControl: true, parentCode: '3.10' },
      { code: '3.10.01.001', name: 'Owner Contribution', type: 'EQUITY', level: 4, isControl: true, parentCode: '3.10.01' },
      { code: '3.10.01.001.001', name: 'Initial Capital', type: 'EQUITY', level: 5, isControl: false, parentCode: '3.10.01.001' },
      { code: '3.10.02', name: 'Retained Earnings', type: 'EQUITY', level: 3, isControl: true, parentCode: '3.10' },
      { code: '3.10.02.001', name: 'Accumulated Profit/Loss', type: 'EQUITY', level: 4, isControl: true, parentCode: '3.10.02' },
      { code: '3.10.02.001.001', name: 'Current Year Earnings', type: 'EQUITY', level: 5, isControl: false, parentCode: '3.10.02.001' },

      // REVENUE
      { code: '4', name: 'Revenue', type: 'REVENUE', level: 1, isControl: true },
      { code: '4.10', name: 'Sales Revenue', type: 'REVENUE', level: 2, isControl: true, parentCode: '4' },
      { code: '4.10.01', name: 'In-Store Sales', type: 'REVENUE', level: 3, isControl: true, parentCode: '4.10' },
      { code: '4.10.01.001', name: 'Category A Sales', type: 'REVENUE', level: 4, isControl: true, parentCode: '4.10.01' },
      { code: '4.10.01.001.001', name: 'Sales - Main Outlet', type: 'REVENUE', level: 5, isControl: false, parentCode: '4.10.01.001' },
      { code: '4.10.02', name: 'Online/Marketplace Sales', type: 'REVENUE', level: 3, isControl: true, parentCode: '4.10' },
      { code: '4.10.02.001', name: 'Platform Channel Sales', type: 'REVENUE', level: 4, isControl: true, parentCode: '4.10.02' },
      { code: '4.10.02.001.001', name: 'Sales - App Orders', type: 'REVENUE', level: 5, isControl: false, parentCode: '4.10.02.001' },
      { code: '4.20', name: 'Other Income', type: 'REVENUE', level: 2, isControl: true, parentCode: '4' },
      { code: '4.20.01', name: 'Discounts/Rebates Received', type: 'REVENUE', level: 3, isControl: true, parentCode: '4.20' },
      { code: '4.20.01.001', name: 'Supplier Rebates', type: 'REVENUE', level: 4, isControl: true, parentCode: '4.20.01' },
      { code: '4.20.01.001.001', name: 'Rebate - General', type: 'REVENUE', level: 5, isControl: false, parentCode: '4.20.01.001' },

      // EXPENSES
      { code: '5', name: 'Expenses', type: 'EXPENSE', level: 1, isControl: true },
      { code: '5.10', name: 'Cost of Goods Sold', type: 'EXPENSE', level: 2, isControl: true, parentCode: '5' },
      { code: '5.10.01', name: 'Purchase Cost', type: 'EXPENSE', level: 3, isControl: true, parentCode: '5.10' },
      { code: '5.10.01.001', name: 'Merchandise Purchases', type: 'EXPENSE', level: 4, isControl: true, parentCode: '5.10.01' },
      { code: '5.10.01.001.001', name: 'Purchases - General', type: 'EXPENSE', level: 5, isControl: false, parentCode: '5.10.01.001' },
      { code: '5.20', name: 'Operating Expenses', type: 'EXPENSE', level: 2, isControl: true, parentCode: '5' },
      { code: '5.20.01', name: 'Occupancy Costs', type: 'EXPENSE', level: 3, isControl: true, parentCode: '5.20' },
      { code: '5.20.01.001', name: 'Rent Expense', type: 'EXPENSE', level: 4, isControl: true, parentCode: '5.20.01' },
      { code: '5.20.01.001.001', name: 'Rent - Main Outlet', type: 'EXPENSE', level: 5, isControl: false, parentCode: '5.20.01.001' },
      { code: '5.20.02', name: 'Utilities', type: 'EXPENSE', level: 3, isControl: true, parentCode: '5.20' },
      { code: '5.20.02.001', name: 'Electricity', type: 'EXPENSE', level: 4, isControl: true, parentCode: '5.20.02' },
      { code: '5.20.02.001.001', name: 'Electricity - Main Outlet', type: 'EXPENSE', level: 5, isControl: false, parentCode: '5.20.02.001' },
      { code: '5.20.03', name: 'Staff Costs', type: 'EXPENSE', level: 3, isControl: true, parentCode: '5.20' },
      { code: '5.20.03.001', name: 'Salaries & Wages', type: 'EXPENSE', level: 4, isControl: true, parentCode: '5.20.03' },
      { code: '5.20.03.001.001', name: 'Salaries - Sales Staff', type: 'EXPENSE', level: 5, isControl: false, parentCode: '5.20.03.001' },
      { code: '5.20.04', name: 'Marketing & Platform Fees', type: 'EXPENSE', level: 3, isControl: true, parentCode: '5.20' },
      { code: '5.20.04.001', name: 'Commission/Platform Fees', type: 'EXPENSE', level: 4, isControl: true, parentCode: '5.20.04' },
      { code: '5.20.04.001.001', name: 'Marketplace Commission', type: 'EXPENSE', level: 5, isControl: false, parentCode: '5.20.04.001' },
    ];

    const insertedAccounts: Record<string, string> = {}; // code -> id

    for (let i = 1; i <= 5; i++) {
      const levelAccounts = coaData.filter(a => a.level === i);
      for (const acc of levelAccounts) {
        let parentId = null;
        if (acc.parentCode) {
          parentId = insertedAccounts[acc.parentCode];
        }

        const [created] = await db.insert(accounts).values({
          tenantId: clientTenant.id,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          level: acc.level,
          parentId,
          isControl: acc.isControl,
        }).returning();

        insertedAccounts[acc.code] = created.id;
      }
    }
    console.log(`✅ ${coaData.length} Accounts created in COA tree`);

    // Create Branches and Cost Centers
    const [mainBranch] = await db.insert(branches).values({
      tenantId: clientTenant.id,
      name: 'Riyadh HQ',
      isMainBranch: true,
    }).returning();
    
    const [subBranch] = await db.insert(branches).values({
      tenantId: clientTenant.id,
      name: 'Jeddah Branch',
      isMainBranch: false,
    }).returning();

    await db.insert(costCenters).values([
      { tenantId: clientTenant.id, name: 'Sales Floor' },
      { tenantId: clientTenant.id, name: 'Warehouse' },
      { tenantId: clientTenant.id, name: 'Delivery Team' },
      { tenantId: clientTenant.id, name: 'Management' },
    ]);
    console.log(`✅ Branches and Cost Centers created`);

    // Create Counter
    const { counters } = require('../src/lib/db/schema');
    await db.insert(counters).values({
      tenantId: clientTenant.id,
      branchId: mainBranch.id,
      name: 'Counter 1',
      isActive: true,
    });
    console.log(`✅ Counter created`);

    console.log('Successfully seeded database.');
  } catch (err) {
    console.error('Error seeding DB:', err);
  }
  process.exit(0);
}

seed();
