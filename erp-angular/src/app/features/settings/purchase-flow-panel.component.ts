import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsHubService } from '../../core/services/settings-hub.service';

@Component({
  selector: 'app-purchase-flow-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './purchase-flow-panel.component.html',
  styleUrls: ['./settings-panel.scss']
})
export class PurchaseFlowPanelComponent implements OnInit {
  private api = inject(SettingsHubService);
  isLoading = signal(true);
  isSaving = signal(false);
  bannerError = signal<string | null>(null);
  bannerSuccess = signal<string | null>(null);
  selectedBusinessType = 'Retail Business';
  selectedFlow = 'NORMAL';

  businessTypes = [
    { name: 'Retail Business', defaultFlow: 'NORMAL', desc: 'Supermarkets, clothing stores, electronics, retail outlets' },
    { name: 'Food & Beverage (F&B) Business', defaultFlow: 'NORMAL', desc: 'Restaurants, cafes, bakeries, grocery suppliers' },
    { name: 'Services Business', defaultFlow: 'SIMPLE', desc: 'Consulting, IT agencies, legal, accounting services' },
    { name: 'Professional/Office-based SMEs Business', defaultFlow: 'SIMPLE', desc: 'Corporate offices, agencies, consultancy firms' },
    { name: 'Healthcare & Wellness Business', defaultFlow: 'NORMAL', desc: 'Clinics, pharmacies, diagnostic labs' },
    { name: 'Trade & Light Manufacturing Business', defaultFlow: 'COMPLEX', desc: 'Factories, assembly plants, wholesale trade' },
    { name: 'E-commerce/Warehouse-linked Business', defaultFlow: 'COMPLEX', desc: 'Online stores, multi-warehouse fulfillment centers' }
  ];

  flowFeatures: Record<string, string[]> = {
    SIMPLE: [
      '1. Create Purchase Invoice (Quick Entry)',
      '2. Make Payment to Supplier (AP Cash/Bank)'
    ],
    NORMAL: [
      '1. Create Purchase Invoice & Stock Update',
      '2. Return to Supplier (Debit Notes)',
      '3. Make Payment to Supplier',
      '4. Manage Inventory Adjustment (Manager Approved)'
    ],
    COMPLEX: [
      '1. Supplier Quotations Input',
      '2. Comparative Statement (CS) Matrix Generator',
      '3. Purchase Orders (PO) with Approval Workflow',
      '4. Goods Received Notes (GRN) & Receiving',
      '5. Quality Check (QC)',
      '6. Received Bills Processing',
      '7. Accounts Payable Make Payment',
      '8. Multi-Location Inventory Transfers',
      '9. Inventory Adjustments (Manager Approval)'
    ]
  };

  ngOnInit() {
    this.api.getPurchaseFlow().subscribe({
      next: res => {
        this.selectedBusinessType = res.businessType || 'Retail Business';
        this.selectedFlow = res.purchaseFlowType || 'NORMAL';
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoading.set(false);
        this.bannerError.set(err.error?.error || 'Failed to load purchase flow.');
      }
    });
  }

  onBusinessTypeChange() {
    const matched = this.businessTypes.find(b => b.name === this.selectedBusinessType);
    this.selectedFlow = matched?.defaultFlow || 'NORMAL';
  }

  save() {
    this.isSaving.set(true);
    this.api.savePurchaseFlow({
      businessType: this.selectedBusinessType,
      purchaseFlowType: this.selectedFlow
    }).subscribe({
      next: () => { this.isSaving.set(false); this.bannerSuccess.set('Purchase Flow Settings updated successfully!'); },
      error: err => { this.isSaving.set(false); this.bannerError.set(err.error?.error || 'Failed to save.'); }
    });
  }
}
