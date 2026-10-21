import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsHubService, CostCenterItem } from '../../core/services/settings-hub.service';

@Component({
  selector: 'app-cost-centers-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cost-centers-panel.component.html',
  styleUrls: ['./settings-panel.scss']
})
export class CostCentersPanelComponent implements OnInit {
  private api = inject(SettingsHubService);
  items = signal<CostCenterItem[]>([]);
  isLoading = signal(false);
  isSyncing = signal(false);
  bannerError = signal<string | null>(null);
  bannerSuccess = signal<string | null>(null);
  showDialog = signal(false);
  sourceType = 'ALL';
  searchQuery = '';
  formName = '';
  formCode = '';
  formSource = 'GENERAL';
  formBudget = 0;
  filters = [
    { type: 'ALL', label: 'All Cost Centers' },
    { type: 'EMPLOYEE', label: 'Employees' },
    { type: 'CAR_VEHICLE', label: 'Vehicles & Fleet' },
    { type: 'BRANCH', label: 'Branches' },
    { type: 'SUPPLIER', label: 'Suppliers' },
    { type: 'CUSTOMER', label: 'Customers' },
    { type: 'PROJECT', label: 'Projects' },
    { type: 'GENERAL', label: 'General Overhead' }
  ];

  ngOnInit() { this.load(); }

  filtered() {
    const q = this.searchQuery.toLowerCase();
    return this.items().filter(c => !q || c.name.toLowerCase().includes(q) || (c.code || '').toLowerCase().includes(q));
  }

  load() {
    this.isLoading.set(true);
    this.api.getCostCenters(this.sourceType).subscribe({
      next: res => { this.items.set(res.costCenters || []); this.isLoading.set(false); },
      error: err => { this.isLoading.set(false); this.bannerError.set(err.error?.error || 'Failed to load cost centers.'); }
    });
  }

  sync() {
    this.isSyncing.set(true);
    this.api.syncCostCenters().subscribe({
      next: res => { this.isSyncing.set(false); this.bannerSuccess.set(res.message || 'Synced.'); this.load(); },
      error: err => { this.isSyncing.set(false); this.bannerError.set(err.error?.error || 'Sync failed.'); }
    });
  }

  openAdd() {
    this.formName = '';
    this.formCode = '';
    this.formSource = this.sourceType === 'ALL' ? 'GENERAL' : this.sourceType;
    this.formBudget = 0;
    this.showDialog.set(true);
  }

  save() {
    if (!this.formName.trim()) { this.bannerError.set('Name is required.'); return; }
    this.api.createCostCenter({
      name: this.formName.trim(),
      code: this.formCode.trim() || undefined,
      sourceType: this.formSource,
      monthlyBudget: Number(this.formBudget) || 0
    }).subscribe({
      next: () => { this.showDialog.set(false); this.bannerSuccess.set('Cost center created.'); this.load(); },
      error: err => { this.bannerError.set(err.error?.error || 'Failed to create cost center.'); }
    });
  }

  remove(item: CostCenterItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    this.api.deleteCostCenter(item.id).subscribe({
      next: () => { this.bannerSuccess.set('Deleted cost center.'); this.load(); },
      error: err => { this.bannerError.set(err.error?.error || 'Cannot delete this cost center.'); }
    });
  }
}
