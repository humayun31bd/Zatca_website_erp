import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TenantSettingsService, TenantInfo } from '../../core/services/tenant-settings.service';
import { ClientWebsitesPanelComponent } from './client-websites-panel.component';
import { SmtpSettingsPanelComponent } from './smtp-settings-panel.component';
import { TaxesPanelComponent } from './taxes-panel.component';
import { PaymentMethodsPanelComponent } from './payment-methods-panel.component';
import { BranchesPanelComponent } from './branches-panel.component';
import { WarehousesPanelComponent } from './warehouses-panel.component';
import { CountersPanelComponent } from './counters-panel.component';
import { UsersPanelComponent } from './users-panel.component';
import { CostCentersPanelComponent } from './cost-centers-panel.component';
import { PurchaseFlowPanelComponent } from './purchase-flow-panel.component';
import { ProductSettingsPanelComponent } from './product-settings-panel.component';
import { ProductsPanelComponent } from './products-panel.component';
import { HardwarePanelComponent } from './hardware-panel.component';
import { VoucherPolicyPanelComponent } from './voucher-policy-panel.component';
import { FinancialYearsPanelComponent } from './financial-years-panel.component';
import { RbacPanelComponent } from './rbac-panel.component';
import { LanguagePanelComponent } from './language-panel.component';
import { MarketingPlansPanelComponent } from './marketing-plans-panel.component';
import { ZatcaPanelComponent } from './zatca-panel.component';

interface CountryPreset {
  countryCode: string;
  countryName: string;
  flag: string;
  currencyCode: string;
  currencySymbol: string;
  decimalPlaces: number;
  defaultTaxRate: number;
  taxType: string;
  timezone: string;
  dateFormat: string;
  compliance: string;
  primaryLanguage: string;
  secondaryLanguage: string;
  tertiaryLanguage?: string;
}

interface BusinessTypeOption {
  id: string;
  label: string;
  icon: string;
  features: string[];
}

interface PlanOption {
  name: string;
  label: string;
  branches: string;
  counters: string;
  invoices: string;
}

interface SettingsNavItem {
  id: string;
  label: string;
  icon: string;
}

interface SettingsNavGroup {
  id: string;
  label: string;
  icon: string;
  items: SettingsNavItem[];
}

@Component({
  selector: 'app-tenant-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ClientWebsitesPanelComponent,
    SmtpSettingsPanelComponent,
    TaxesPanelComponent,
    PaymentMethodsPanelComponent,
    BranchesPanelComponent,
    WarehousesPanelComponent,
    CountersPanelComponent,
    UsersPanelComponent,
    CostCentersPanelComponent,
    PurchaseFlowPanelComponent,
    ProductSettingsPanelComponent,
    ProductsPanelComponent,
    HardwarePanelComponent,
    VoucherPolicyPanelComponent,
    FinancialYearsPanelComponent,
    RbacPanelComponent,
    LanguagePanelComponent,
    MarketingPlansPanelComponent,
    ZatcaPanelComponent
  ],
  templateUrl: './tenant-settings.component.html',
  styleUrls: ['./tenant-settings.component.scss']
})
export class TenantSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private tenantService = inject(TenantSettingsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private panelAliases: Record<string, string> = {
    'product-policy': 'product-settings',
    'accounting': 'voucher-policy',
    'users': 'manage-users'
  };

  isLoading = signal(true);
  isSaving = signal(false);
  saveError = signal<string | null>(null);
  saveSuccess = signal<string | null>(null);
  tenantId = signal<string | null>(null);
  status = signal('ACTIVE');
  countryCode = signal('SA');
  businessType = signal('retail');
  marketingPlan = signal('STANDARD');
  selectedNavId = signal('tenant');
  expandedGroups = signal<string[]>(['general']);

  navGroups: SettingsNavGroup[] = [
    {
      id: 'office',
      label: 'MANAGE OFFICE',
      icon: 'pi pi-building',
      items: [
        { id: 'branches', label: 'Manage Branches', icon: 'pi pi-shop' },
        { id: 'warehouses', label: 'Manage Warehouses', icon: 'pi pi-inbox' },
        { id: 'cost-centers', label: 'Cost Centers', icon: 'pi pi-briefcase' },
        { id: 'counters', label: 'Manage Counters', icon: 'pi pi-desktop' }
      ]
    },
    {
      id: 'inventory',
      label: 'MANAGE INVENTORY',
      icon: 'pi pi-box',
      items: [
        { id: 'purchase-flow', label: 'Manage Purchase Flow', icon: 'pi pi-directions' },
        { id: 'products', label: 'Manage Products', icon: 'pi pi-tags' },
        { id: 'product-settings', label: 'Product & Pricing Policy', icon: 'pi pi-shield' }
      ]
    },
    {
      id: 'devices',
      label: 'DEVICES',
      icon: 'pi pi-tablet',
      items: [
        { id: 'hardware', label: 'Hardware & Printers', icon: 'pi pi-print' }
      ]
    },
    {
      id: 'users',
      label: 'MANAGE USERS',
      icon: 'pi pi-users',
      items: [
        { id: 'manage-users', label: 'Manage Users', icon: 'pi pi-user' },
        { id: 'rbac', label: 'RBAC & Menu Permissions', icon: 'pi pi-lock' }
      ]
    },
    {
      id: 'accounting',
      label: 'ACCOUNTING SETTINGS',
      icon: 'pi pi-wallet',
      items: [
        { id: 'voucher-policy', label: 'Voucher Entry Policy', icon: 'pi pi-file' },
        { id: 'financial-year', label: 'Financial Year & Period Lock', icon: 'pi pi-calendar' }
      ]
    },
    {
      id: 'general',
      label: 'GENERAL SETTINGS',
      icon: 'pi pi-cog',
      items: [
        { id: 'websites', label: 'Client Websites', icon: 'pi pi-globe' },
        { id: 'tenant', label: 'Tenant & Business Profile', icon: 'pi pi-building' },
        { id: 'smtp', label: 'SMTP Email Setup', icon: 'pi pi-envelope' },
        { id: 'language', label: 'Language Settings', icon: 'pi pi-language' },
        { id: 'taxes', label: 'Manage Taxes', icon: 'pi pi-percentage' },
        { id: 'payments', label: 'Payment Methods', icon: 'pi pi-credit-card' },
        { id: 'plans', label: 'Marketing Plans', icon: 'pi pi-star' },
        { id: 'zatca', label: 'ZATCA Integration', icon: 'pi pi-verified' }
      ]
    }
  ];

  countries: CountryPreset[] = [
    { countryCode: 'SA', countryName: 'Saudi Arabia', flag: 'SA', currencyCode: 'SAR', currencySymbol: 'R.S', decimalPlaces: 2, defaultTaxRate: 15, taxType: 'VAT', timezone: 'Asia/Riyadh', dateFormat: 'YYYY-MM-DD', compliance: 'ZATCA (Phase 1 & 2)', primaryLanguage: 'ar', secondaryLanguage: 'en' },
    { countryCode: 'AE', countryName: 'United Arab Emirates', flag: 'AE', currencyCode: 'AED', currencySymbol: 'AED', decimalPlaces: 2, defaultTaxRate: 5, taxType: 'VAT', timezone: 'Asia/Dubai', dateFormat: 'DD/MM/YYYY', compliance: 'UAE FTA', primaryLanguage: 'ar', secondaryLanguage: 'en' },
    { countryCode: 'OM', countryName: 'Oman', flag: 'OM', currencyCode: 'OMR', currencySymbol: 'OMR', decimalPlaces: 3, defaultTaxRate: 5, taxType: 'VAT', timezone: 'Asia/Muscat', dateFormat: 'DD/MM/YYYY', compliance: 'Oman OTA', primaryLanguage: 'ar', secondaryLanguage: 'en' },
    { countryCode: 'BH', countryName: 'Bahrain', flag: 'BH', currencyCode: 'BHD', currencySymbol: 'BHD', decimalPlaces: 3, defaultTaxRate: 10, taxType: 'VAT', timezone: 'Asia/Bahrain', dateFormat: 'DD/MM/YYYY', compliance: 'Bahrain NBR', primaryLanguage: 'ar', secondaryLanguage: 'en' },
    { countryCode: 'QA', countryName: 'Qatar', flag: 'QA', currencyCode: 'QAR', currencySymbol: 'QAR', decimalPlaces: 2, defaultTaxRate: 0, taxType: 'Exempt / No VAT', timezone: 'Asia/Qatar', dateFormat: 'DD/MM/YYYY', compliance: 'Qatar GTA', primaryLanguage: 'ar', secondaryLanguage: 'en' },
    { countryCode: 'KW', countryName: 'Kuwait', flag: 'KW', currencyCode: 'KWD', currencySymbol: 'KWD', decimalPlaces: 3, defaultTaxRate: 0, taxType: 'Exempt / No VAT', timezone: 'Asia/Kuwait', dateFormat: 'DD/MM/YYYY', compliance: 'Kuwait MOF', primaryLanguage: 'ar', secondaryLanguage: 'en' },
    { countryCode: 'BD', countryName: 'Bangladesh', flag: 'BD', currencyCode: 'BDT', currencySymbol: 'BDT', decimalPlaces: 2, defaultTaxRate: 15, taxType: 'VAT / Mushuk 6.3', timezone: 'Asia/Dhaka', dateFormat: 'DD-MM-YYYY', compliance: 'NBR (Mushuk 6.3)', primaryLanguage: 'bn', secondaryLanguage: 'en', tertiaryLanguage: 'ar' }
  ];

  businessTypes: BusinessTypeOption[] = [
    { id: 'retail', label: 'Retail POS', icon: 'pi pi-shop', features: ['Service & Physical Products', 'Standard Barcode Scanning', 'Variants (Size/Color)', 'Store Credit & Layaway'] },
    { id: 'pharmacy', label: 'Pharmacy POS', icon: 'pi pi-heart', features: ['Medicine Expiry Date Alert', 'Batch & Lot Management', 'Dosage / Strip Unit Conversions', 'Prescription Reference'] },
    { id: 'grocery', label: 'Grocery POS', icon: 'pi pi-shopping-cart', features: ['Weight Scale (RS-232/USB)', 'Price-Embedded Barcodes (Prefix 20/02)', 'Fast Perishable Expiry Alert', 'Loose Product Weighing'] },
    { id: 'beautySalon', label: 'Beauty & Salon POS', icon: 'pi pi-star', features: ['Service-based Invoicing', 'Staff / Beautician Commission', 'Appointment Booking Calendar', 'Package / Treatment Bundles'] },
    { id: 'restaurant', label: 'Restaurant POS', icon: 'pi pi-th-large', features: ['Table Management & Floor Layout', 'Kitchen Display System (KDS)', 'Order Types (Dine-in, Takeaway, Delivery)', 'Waiter Registration & Table Assignment', 'Recipe & BOM Manufacturing', 'Menu Modifiers & Set Menus'] },
    { id: 'laundry', label: 'Laundry POS', icon: 'pi pi-inbox', features: ['Service-type Item Billing (Wash/Iron/Dry)', 'Garment Tagging & Bag Barcodes', 'Pickup & Delivery Scheduling', 'Ready-for-Pickup WhatsApp Alerts'] },
    { id: 'shoeStore', label: 'Shoe Store POS', icon: 'pi pi-box', features: ['Matrix Grid (Brand x Size x Color)', 'Single-Box Barcode Scanning', 'Serial & Warranty Tracking', 'Replacement & Sizing Exchanges'] }
  ];

  plans: PlanOption[] = [
    { name: 'STARTER', label: 'Starter Plan', branches: '1 Branch', counters: '1 Counter', invoices: '500 Inv/mo' },
    { name: 'STANDARD', label: 'Standard Plan', branches: '3 Branches', counters: '3 Counters', invoices: '2,000 Inv/mo' },
    { name: 'PRO', label: 'Pro / Unlimited', branches: 'Unlimited', counters: 'Unlimited', invoices: 'Unlimited' },
    { name: 'AGENCY', label: 'Agency / Enterprise', branches: 'Unlimited Multi-Tenant', counters: 'Unlimited', invoices: 'Unlimited' }
  ];

  form = this.fb.group({
    name: ['', Validators.required],
    vatNumber: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    whatsappNumber: [''],
    address: [''],
    code: [''],
    logoUrl: [''],
    countryCode: ['SA', Validators.required],
    businessType: ['retail'],
    marketingPlan: ['STANDARD'],
    currencyCode: ['SAR'],
    currencySymbol: ['R.S'],
    taxRate: [15],
    taxType: ['VAT'],
    timezone: ['Asia/Riyadh'],
    dateFormat: ['YYYY-MM-DD'],
    decimalPlaces: [2]
  });

  selectedCountry = computed(() =>
    this.countries.find(c => c.countryCode === this.countryCode()) || this.countries[0]
  );

  selectedBusiness = computed(() =>
    this.businessTypes.find(b => b.id === this.businessType()) || this.businessTypes[0]
  );

  selectedNavItem = computed(() => {
    for (const group of this.navGroups) {
      const item = group.items.find(i => i.id === this.selectedNavId());
      if (item) return item;
    }
    return this.navGroups[5].items[1];
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const panel = params.get('panel');
      this.selectNav(this.resolvePanel(panel || 'tenant'), false);
    });
    this.loadTenant();
  }

  resolvePanel(panel: string): string {
    const mapped = this.panelAliases[panel] || panel;
    const known = this.navGroups.some(g => g.items.some(i => i.id === mapped));
    return known ? mapped : 'tenant';
  }

  isGroupExpanded(id: string): boolean {
    return this.expandedGroups().includes(id);
  }

  toggleGroup(id: string) {
    const current = this.expandedGroups();
    this.expandedGroups.set(
      current.includes(id) ? current.filter(g => g !== id) : [...current, id]
    );
  }

  selectNav(id: string, navigate = true) {
    const resolved = this.resolvePanel(id);
    this.selectedNavId.set(resolved);
    const owner = this.navGroups.find(g => g.items.some(i => i.id === resolved));
    if (owner && !this.isGroupExpanded(owner.id)) {
      this.expandedGroups.set([...this.expandedGroups(), owner.id]);
    }
    if (navigate) {
      const target = resolved === 'tenant' ? '/settings' : `/settings/${resolved}`;
      void this.router.navigateByUrl(target);
    }
  }

  loadTenant() {
    this.isLoading.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(null);
    this.tenantService.getTenant().subscribe({
      next: res => {
        const t = res.tenant;
        if (t) this.patchForm(t);
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoading.set(false);
        this.saveError.set(err.error?.error || err.message || 'Failed to load tenant settings.');
      }
    });
  }

  patchForm(t: TenantInfo) {
    this.tenantId.set(t.id || null);
    this.status.set(t.status || 'ACTIVE');
    const country = this.countries.find(c => c.countryCode === (t.countryCode || 'SA')) || this.countries[0];
    const business = (t.businessType || 'retail').toLowerCase();
    const plan = (t.marketingPlan || 'STANDARD').toUpperCase();
    this.countryCode.set(country.countryCode);
    this.businessType.set(business);
    this.marketingPlan.set(plan);
    this.form.patchValue({
      name: t.name || '',
      vatNumber: t.vatNumber || '',
      email: t.email || '',
      whatsappNumber: t.whatsappNumber || t.phone || '',
      address: t.address || '',
      code: t.code || t.subdomain || '',
      logoUrl: t.logoUrl || '',
      countryCode: country.countryCode,
      businessType: business,
      marketingPlan: plan,
      currencyCode: t.currencyCode || country.currencyCode,
      currencySymbol: t.currencySymbol || country.currencySymbol,
      taxRate: t.taxRate ?? country.defaultTaxRate,
      taxType: t.taxType || country.taxType,
      timezone: t.timezone || country.timezone,
      dateFormat: t.dateFormat || country.dateFormat,
      decimalPlaces: t.decimalPlaces ?? country.decimalPlaces
    });
  }

  applyCountryDefaults() {
    const country = this.selectedCountry();
    this.form.patchValue({
      currencyCode: country.currencyCode,
      currencySymbol: country.currencySymbol,
      taxRate: country.defaultTaxRate,
      taxType: country.taxType,
      timezone: country.timezone,
      dateFormat: country.dateFormat,
      decimalPlaces: country.decimalPlaces
    });
  }

  onCountryChange(code: string) {
    this.countryCode.set(code);
    this.form.patchValue({ countryCode: code });
    this.applyCountryDefaults();
  }

  setBusinessType(id: string) {
    this.businessType.set(id);
    this.form.patchValue({ businessType: id });
  }

  setPlan(name: string) {
    this.marketingPlan.set(name);
    this.form.patchValue({ marketingPlan: name });
  }

  save() {
    this.saveError.set(null);
    this.saveSuccess.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.saveError.set('Company name, VAT number, and email are required.');
      return;
    }
    this.isSaving.set(true);
    const v = this.form.getRawValue();
    const payload: Partial<TenantInfo> = {
      name: v.name?.trim() || '',
      vatNumber: v.vatNumber?.trim() || '',
      email: v.email?.trim() || '',
      whatsappNumber: v.whatsappNumber?.trim() || '',
      address: v.address?.trim() || '',
      code: v.code?.trim() || '',
      logoUrl: v.logoUrl?.trim() || '',
      countryCode: v.countryCode || 'SA',
      businessType: v.businessType || 'retail',
      marketingPlan: v.marketingPlan || 'STANDARD',
      currencyCode: v.currencyCode || 'SAR',
      currencySymbol: v.currencySymbol || 'R.S',
      taxRate: Number(v.taxRate) || 0,
      taxType: v.taxType || 'VAT',
      timezone: v.timezone || 'Asia/Riyadh',
      dateFormat: v.dateFormat || 'YYYY-MM-DD',
      decimalPlaces: Number(v.decimalPlaces) || 2
    };
    this.tenantService.updateTenant(payload).subscribe({
      next: res => {
        this.isSaving.set(false);
        if (res.tenant) this.patchForm(res.tenant);
        this.saveSuccess.set('Tenant location, business policy & marketing plan updated successfully!');
      },
      error: err => {
        this.isSaving.set(false);
        this.saveError.set(err.error?.error || err.message || 'Failed to save tenant settings.');
      }
    });
  }

  fieldInvalid(name: string): boolean {
    const ctrl = this.form.get(name);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }
}
