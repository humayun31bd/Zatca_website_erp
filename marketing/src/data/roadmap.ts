export interface RoadmapFeature {
  id: string;
  name: string;
  category: string;
  version: 'v1.0' | 'v1.5' | 'v2.0';
  status: 'Live' | 'In Testing' | 'Planned';
  plans: string[];
  description: string;
}

export const ROADMAP_FEATURES: RoadmapFeature[] = [
  // v1.0 Live
  {
    id: 'zatca_phase2',
    name: 'ZATCA Phase 2 E-Invoicing & B2B XML',
    category: 'Invoicing & ZATCA',
    version: 'v1.0',
    status: 'Live',
    plans: ['Free', 'Basic', 'Standard', 'Premium'],
    description: 'Full Saudi ZATCA Phase 2 integration, XML generation, UBL 2.1 compliance, CSR signing, and QR codes.',
  },
  {
    id: 'thermal_pos',
    name: 'Thermal POS Billing & Counter Session',
    category: 'Point of Sale',
    version: 'v1.0',
    status: 'Live',
    plans: ['Free', 'Basic', 'Standard', 'Premium'],
    description: 'High-speed offline-capable retail & restaurant POS cashier counter interface.',
  },
  {
    id: 'voucher_ledger',
    name: 'General Ledger Vouchers (PV, RV, CV, JV)',
    category: 'Accounting',
    version: 'v1.0',
    status: 'Live',
    plans: ['Free', 'Basic', 'Standard', 'Premium'],
    description: 'Double-entry accounting voucher system with balanced debit/credit invariants.',
  },
  {
    id: 'supplier_returns',
    name: 'Supplier Returns & Debit Notes',
    category: 'Purchasing',
    version: 'v1.0',
    status: 'Live',
    plans: ['Basic', 'Standard', 'Premium'],
    description: 'Automated defective item returns, credit/debit note generation, and bill reconciliation.',
  },

  // v1.5 Upcoming Q4 2026
  {
    id: 'forex_revaluation',
    name: 'Multi-Currency & Forex Revaluation',
    category: 'Accounting',
    version: 'v1.5',
    status: 'In Testing',
    plans: ['Standard', 'Premium'],
    description: 'Auto-fetch exchange rates, multi-currency ledger posting, and unrealized gain/loss revaluation.',
  },
  {
    id: 'kot_table_qr',
    name: 'Restaurant KOT & Table QR Menu',
    category: 'POS & Dining',
    version: 'v1.5',
    status: 'In Testing',
    plans: ['Standard', 'Premium'],
    description: 'Kitchen Order Ticket dispatch, digital table mapping, and customer mobile QR menu.',
  },
  {
    id: 'recurring_vouchers',
    name: 'Recurring Vouchers Auto-Scheduler',
    category: 'Accounting',
    version: 'v1.5',
    status: 'In Testing',
    plans: ['Standard', 'Premium'],
    description: 'Automated cron posting for recurring lease, subscription, and retainer vouchers.',
  },
  {
    id: 'whatsapp_receipts',
    name: 'WhatsApp Business Automated Receipts',
    category: 'Integrations',
    version: 'v1.5',
    status: 'In Testing',
    plans: ['Standard', 'Premium'],
    description: 'Instant PDF e-invoice and payment receipt delivery via official WhatsApp Business API.',
  },

  // v2.0 Next-Gen Q1 2027
  {
    id: 'ai_copilot',
    name: 'AI Financial & Inventory Copilot',
    category: 'Artificial Intelligence',
    version: 'v2.0',
    status: 'Planned',
    plans: ['Standard', 'Premium'],
    description: 'Natural language database queries, automated anomaly detection, and smart profit insights.',
  },
  {
    id: 'rest_api_webhooks',
    name: 'External REST API & Webhooks Access',
    category: 'Developer API',
    version: 'v2.0',
    status: 'Planned',
    plans: ['Premium', 'Agency'],
    description: 'Rate-limited REST API and webhooks for external e-commerce integrations (Shopify, Salla, Zid).',
  },
  {
    id: 'data_migration_wizard',
    name: 'Bulk Data Migration Import Wizard',
    category: 'Data Tools',
    version: 'v2.0',
    status: 'Planned',
    plans: ['Premium', 'Agency'],
    description: 'Automated CSV/Excel import wizard for legacy Tally, QuickBooks, and Excel books.',
  },
  {
    id: 'recipe_manufacturing',
    name: 'BOM Recipe Manufacturing & Margin Protection',
    category: 'Manufacturing',
    version: 'v2.0',
    status: 'Planned',
    plans: ['Basic', 'Standard', 'Premium'],
    description: 'Raw ingredient recipe tracking, WIP to finished goods assembly, and ingredient inflation margin protection.',
  },
];
