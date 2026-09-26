import 'dotenv/config';
import { db } from '../src/lib/db/index';
import { tenants, invoices, invoiceLineItems, users, apiKeys, packages, subscriptions, categories, products, clients, suppliers, purchaseInvoices, cashBookEntries } from '../src/lib/db/schema';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('Seeding database...');
  try {
    console.log('Cleaning existing data...');
    await db.execute(sql`TRUNCATE TABLE packages, tenants, users, invoices, subscriptions, api_keys, csid_certificates, invoice_line_items, whatsapp_messages, webhook_events, billing_credits, audit_logs, categories, products, clients, suppliers, purchase_invoices, cash_book_entries CASCADE`);
    console.log('✅ Database cleaned');

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

    console.log('Successfully seeded database.');
  } catch (err) {
    console.error('Error seeding DB:', err);
  }
  process.exit(0);
}

seed();
