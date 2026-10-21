import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsHubService } from '../../core/services/settings-hub.service';
import { TenantSettingsService } from '../../core/services/tenant-settings.service';

type ProductTabId = 'core' | 'pricing' | 'retail' | 'pharmacy' | 'grocery' | 'beautySalon' | 'restaurant' | 'laundry' | 'shoeStore';

interface FeatureToggle {
  key: string;
  title: string;
  subtitle: string;
  dependsOn?: string;
}

interface ProductTab {
  id: ProductTabId;
  label: string;
  icon: string;
  hint: string;
  keys: string[];
  recommended: Partial<Record<string, boolean>>;
}

@Component({
  selector: 'app-product-settings-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-settings-panel.component.html',
  styleUrls: ['./settings-panel.scss']
})
export class ProductSettingsPanelComponent implements OnInit {
  private api = inject(SettingsHubService);
  private tenantApi = inject(TenantSettingsService);

  isLoading = signal(true);
  isSaving = signal(false);
  bannerError = signal<string | null>(null);
  bannerSuccess = signal<string | null>(null);
  tenantBusinessType = signal<ProductTabId>('retail');
  activeTab = signal<ProductTabId>('core');
  businessType = 'retail';

  flags: Record<string, boolean> = {
    enableVariableProduct: true,
    enableStockManagement: true,
    enableBranches: true,
    enableCategories: true,
    enableSubCategories: true,
    enableUnits: true,
    enableTaxRates: true,
    enableGroupTax: false,
    enableLowStockAlert: true,
    enableBarcodePrinting: true,
    enableSellingPriceGroup: false,
    enableDiscountable: true,
    enableExcise: false,
    enableTaxFree: true,
    enablePublishEcommerce: false,
    enableProductExpiry: false,
    enableLowStockExpiryAlert: false,
    enableLotNumber: false,
    enableImeiSerial: false,
    enableWarrantyTracking: false,
    enableWeightScale: false,
    enablePriceEmbeddedBarcode: false,
    enablePrescription: false,
    enableServiceItems: false,
    enableStaffCommission: false,
    enableAppointments: false,
    enablePackageBundles: false,
    enableKds: false,
    enableRecipeBom: false,
    enableModifiers: false,
    enableGarmentTagging: false,
    enablePickupDelivery: false,
    enableMatrixVariants: false
  };

  catalog: FeatureToggle[] = [
    { key: 'enableVariableProduct', title: 'Enable Variable Products', subtitle: 'Allow products with multiple variations (e.g., sizes, colors)' },
    { key: 'enableStockManagement', title: 'Enable Stock Management', subtitle: 'Track and manage inventory levels for products' },
    { key: 'enableBranches', title: 'Enable Multiple Branches', subtitle: 'Track inventory across different branches/stores' },
    { key: 'enableCategories', title: 'Enable Categories', subtitle: 'Organize products into categories' },
    { key: 'enableSubCategories', title: 'Enable Sub-Categories', subtitle: 'Organize products into sub-categories', dependsOn: 'enableCategories' },
    { key: 'enableUnits', title: 'Enable Units', subtitle: 'Manage different measurement units (e.g., kg, piece, box)' },
    { key: 'enableTaxRates', title: 'Enable Tax Rates', subtitle: 'Apply specific tax rates to products' },
    { key: 'enableGroupTax', title: 'Enable Group Tax', subtitle: 'Apply combined tax groups to products' },
    { key: 'enableLowStockAlert', title: 'Enable Low Stock Alert', subtitle: 'Receive notifications when product stock goes below a threshold', dependsOn: 'enableStockManagement' },
    { key: 'enableBarcodePrinting', title: 'Enable Print Barcode & Labels', subtitle: 'Generate and print barcodes for products' },
    { key: 'enableSellingPriceGroup', title: 'Enable Selling Price Group', subtitle: 'Create different price groups (e.g., Wholesale, Retail)' },
    { key: 'enableDiscountable', title: 'Enable Discountable Products', subtitle: 'Allow cashiers and invoices to apply line discounts' },
    { key: 'enableExcise', title: 'Enable Excise Tax', subtitle: 'Mark products subject to selective / excise tax' },
    { key: 'enableTaxFree', title: 'Enable Tax-Free / VAT Exempt', subtitle: 'Allow products to be sold at 0% VAT' },
    { key: 'enablePublishEcommerce', title: 'Enable Publish to E-commerce', subtitle: 'Control whether catalog items can appear on the online store' },
    { key: 'enableProductExpiry', title: 'Enable Product Expiry', subtitle: 'Track expiry dates for perishable goods' },
    { key: 'enableLowStockExpiryAlert', title: 'Enable Low Stock Expiry Alerts', subtitle: 'Receive alerts for products approaching their expiry date', dependsOn: 'enableProductExpiry' },
    { key: 'enableLotNumber', title: 'Enable Lot Number', subtitle: 'Track batches and lot numbers for products' },
    { key: 'enableImeiSerial', title: 'Enable IMEI / Serial Number', subtitle: 'Track unique serial numbers for electronics and devices' },
    { key: 'enableWarrantyTracking', title: 'Enable Warranty Tracking', subtitle: 'Store warranty period and provider on serialized items' },
    { key: 'enableWeightScale', title: 'Enable Weight Scale', subtitle: 'Weigh loose items via RS-232/USB scale at POS' },
    { key: 'enablePriceEmbeddedBarcode', title: 'Enable Price-Embedded Barcodes', subtitle: 'Read prefix 20/02 barcodes used on grocery scales' },
    { key: 'enablePrescription', title: 'Enable Prescription Reference', subtitle: 'Require or attach a prescription on medicine sales' },
    { key: 'enableServiceItems', title: 'Enable Service Items', subtitle: 'Sell non-stock services such as treatments, meals, or laundry jobs' },
    { key: 'enableStaffCommission', title: 'Enable Staff / Beautician Commission', subtitle: 'Split service revenue with the assigned staff member' },
    { key: 'enableAppointments', title: 'Enable Appointment Booking', subtitle: 'Book chairs, rooms, or time slots against service items' },
    { key: 'enablePackageBundles', title: 'Enable Package / Treatment Bundles', subtitle: 'Sell multi-visit packages as a single product' },
    { key: 'enableKds', title: 'Enable Kitchen Display (KDS)', subtitle: 'Route prepared items to kitchen / make screens' },
    { key: 'enableRecipeBom', title: 'Enable Recipe & BOM', subtitle: 'Deduct ingredients when a menu item is sold' },
    { key: 'enableModifiers', title: 'Enable Menu Modifiers', subtitle: 'Add-ons, set menus, and option groups' },
    { key: 'enableGarmentTagging', title: 'Enable Garment Tagging', subtitle: 'Print bag/garment barcodes for laundry tracking' },
    { key: 'enablePickupDelivery', title: 'Enable Pickup & Delivery', subtitle: 'Schedule collection and ready-for-pickup alerts' },
    { key: 'enableMatrixVariants', title: 'Enable Size x Color Matrix', subtitle: 'Enter stock in a brand / size / color grid' }
  ];

  tabs: ProductTab[] = [
    {
      id: 'core',
      label: 'Core Catalog',
      icon: 'pi pi-th-large',
      hint: 'Shared catalog, stock, tax, and barcode controls used by every business type.',
      keys: [
        'enableVariableProduct', 'enableStockManagement', 'enableBranches', 'enableCategories',
        'enableSubCategories', 'enableUnits', 'enableTaxRates', 'enableGroupTax',
        'enableLowStockAlert', 'enableBarcodePrinting', 'enableSellingPriceGroup'
      ],
      recommended: {
        enableVariableProduct: true,
        enableStockManagement: true,
        enableBranches: true,
        enableCategories: true,
        enableSubCategories: true,
        enableUnits: true,
        enableTaxRates: true,
        enableLowStockAlert: true,
        enableBarcodePrinting: true
      }
    },
    {
      id: 'pricing',
      label: 'Pricing Policy',
      icon: 'pi pi-wallet',
      hint: 'Selling price groups, discounts, excise, VAT-exempt, and e-commerce publish flags used on Add Product.',
      keys: ['enableSellingPriceGroup', 'enableDiscountable', 'enableExcise', 'enableTaxFree', 'enablePublishEcommerce', 'enableTaxRates', 'enableGroupTax'],
      recommended: { enableSellingPriceGroup: true, enableDiscountable: true, enableTaxFree: true, enableTaxRates: true, enableExcise: false, enablePublishEcommerce: false }
    },
    {
      id: 'retail',
      label: 'Retail POS',
      icon: 'pi pi-shop',
      hint: 'General merchandise, apparel, and electronics. Variants, barcodes, and optional serials.',
      keys: ['enableVariableProduct', 'enableSellingPriceGroup', 'enableImeiSerial', 'enableWarrantyTracking', 'enableBarcodePrinting'],
      recommended: { enableVariableProduct: true, enableSellingPriceGroup: true, enableBarcodePrinting: true, enableImeiSerial: false }
    },
    {
      id: 'pharmacy',
      label: 'Pharmacy POS',
      icon: 'pi pi-heart',
      hint: 'Medicines need expiry, batch/lot, and optional prescription reference.',
      keys: ['enableProductExpiry', 'enableLowStockExpiryAlert', 'enableLotNumber', 'enablePrescription', 'enableUnits'],
      recommended: { enableProductExpiry: true, enableLowStockExpiryAlert: true, enableLotNumber: true, enablePrescription: true, enableImeiSerial: false }
    },
    {
      id: 'grocery',
      label: 'Grocery POS',
      icon: 'pi pi-shopping-cart',
      hint: 'Perishables, weighing scales, and price-embedded barcodes.',
      keys: ['enableProductExpiry', 'enableLowStockExpiryAlert', 'enableLotNumber', 'enableWeightScale', 'enablePriceEmbeddedBarcode'],
      recommended: { enableProductExpiry: true, enableLowStockExpiryAlert: true, enableLotNumber: true, enableWeightScale: true, enablePriceEmbeddedBarcode: true, enableImeiSerial: false }
    },
    {
      id: 'beautySalon',
      label: 'Beauty & Salon',
      icon: 'pi pi-star',
      hint: 'Service billing, staff commission, appointments, and treatment packages.',
      keys: ['enableServiceItems', 'enableStaffCommission', 'enableAppointments', 'enablePackageBundles'],
      recommended: { enableServiceItems: true, enableStaffCommission: true, enableAppointments: true, enablePackageBundles: true, enableStockManagement: true }
    },
    {
      id: 'restaurant',
      label: 'Restaurant POS',
      icon: 'pi pi-th-large',
      hint: 'Menu items, kitchen display, recipes, and modifiers.',
      keys: ['enableServiceItems', 'enableKds', 'enableRecipeBom', 'enableModifiers'],
      recommended: { enableServiceItems: true, enableKds: true, enableRecipeBom: true, enableModifiers: true, enableProductExpiry: true }
    },
    {
      id: 'laundry',
      label: 'Laundry POS',
      icon: 'pi pi-inbox',
      hint: 'Service jobs, garment tags, and pickup/delivery scheduling.',
      keys: ['enableServiceItems', 'enableGarmentTagging', 'enablePickupDelivery', 'enableBarcodePrinting'],
      recommended: { enableServiceItems: true, enableGarmentTagging: true, enablePickupDelivery: true, enableBarcodePrinting: true }
    },
    {
      id: 'shoeStore',
      label: 'Shoe Store POS',
      icon: 'pi pi-box',
      hint: 'Size x color matrix, serial/warranty, and exchange tracking.',
      keys: ['enableMatrixVariants', 'enableVariableProduct', 'enableImeiSerial', 'enableWarrantyTracking'],
      recommended: { enableMatrixVariants: true, enableVariableProduct: true, enableImeiSerial: true, enableWarrantyTracking: true, enableProductExpiry: false }
    }
  ];

  ngOnInit() {
    this.tenantApi.getTenant().subscribe({
      next: res => {
        const type = this.normalizeType(res.tenant?.businessType);
        this.tenantBusinessType.set(type);
        this.businessType = type;
        this.activeTab.set(type);
        this.loadPolicy();
      },
      error: () => this.loadPolicy()
    });
  }

  visibleToggles(): FeatureToggle[] {
    const tab = this.tabs.find(t => t.id === this.activeTab()) || this.tabs[0];
    return tab.keys
      .map(key => this.catalog.find(t => t.key === key))
      .filter((t): t is FeatureToggle => !!t);
  }

  currentTab() {
    return this.tabs.find(t => t.id === this.activeTab()) || this.tabs[0];
  }

  enabledCount(tab: ProductTab) {
    return tab.keys.filter(key => this.flags[key]).length;
  }

  selectTab(id: ProductTabId) {
    this.activeTab.set(id);
    this.bannerError.set(null);
  }

  disabled(key: string) {
    const toggle = this.catalog.find(t => t.key === key);
    return !!(toggle?.dependsOn && !this.flags[toggle.dependsOn]);
  }

  onToggle(key: string) {
    if (key === 'enableStockManagement' && !this.flags['enableStockManagement']) this.flags['enableLowStockAlert'] = false;
    if (key === 'enableCategories' && !this.flags['enableCategories']) this.flags['enableSubCategories'] = false;
    if (key === 'enableProductExpiry' && !this.flags['enableProductExpiry']) this.flags['enableLowStockExpiryAlert'] = false;
    if (key === 'enableImeiSerial' && !this.flags['enableImeiSerial']) this.flags['enableWarrantyTracking'] = false;
  }

  applyRecommended() {
    const tab = this.currentTab();
    Object.entries(tab.recommended).forEach(([key, value]) => {
      if (key in this.flags && typeof value === 'boolean') this.flags[key] = value;
    });
    this.onToggle('enableStockManagement');
    this.onToggle('enableCategories');
    this.onToggle('enableProductExpiry');
    this.bannerSuccess.set(`Applied ${tab.label} recommended flags. Save to keep them.`);
  }

  save() {
    this.isSaving.set(true);
    this.api.saveProductPolicy({
      businessType: this.businessType,
      productPolicy: { ...this.flags }
    }).subscribe({
      next: () => { this.isSaving.set(false); this.bannerSuccess.set('Product Settings saved successfully.'); },
      error: err => { this.isSaving.set(false); this.bannerError.set(err.error?.error || 'Failed to save product settings.'); }
    });
  }

  private loadPolicy() {
    this.api.getProductPolicy().subscribe({
      next: res => {
        const type = this.normalizeType(res.businessType || this.businessType);
        this.businessType = this.tenantBusinessType() || type;
        const policy = (res.productPolicy || {}) as Record<string, unknown>;
        Object.keys(this.flags).forEach(key => {
          if (typeof policy[key] === 'boolean') this.flags[key] = policy[key] as boolean;
        });
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  private normalizeType(value?: string | null): ProductTabId {
    const raw = (value || 'retail').trim();
    const key = raw.replace(/[\s&/-]+/g, '').toLowerCase();
    if (key.includes('pharmac') || key.includes('health')) return 'pharmacy';
    if (key.includes('groc')) return 'grocery';
    if (key.includes('beauty') || key.includes('salon')) return 'beautySalon';
    if (key.includes('restaurant') || key.includes('food') || key === 'fnb') return 'restaurant';
    if (key.includes('laund')) return 'laundry';
    if (key.includes('shoe') || key.includes('footwear')) return 'shoeStore';
    if (key === 'retail' || key.includes('retail')) return 'retail';
    const ids: ProductTabId[] = ['core', 'retail', 'pharmacy', 'grocery', 'beautySalon', 'restaurant', 'laundry', 'shoeStore'];
    return ids.includes(raw as ProductTabId) ? raw as ProductTabId : 'retail';
  }
}
