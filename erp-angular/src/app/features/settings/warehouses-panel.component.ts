import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsHubService, BranchItem, WarehouseItem } from '../../core/services/settings-hub.service';

@Component({
  selector: 'app-warehouses-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './warehouses-panel.component.html',
  styleUrls: ['./settings-panel.scss']
})
export class WarehousesPanelComponent implements OnInit {
  private api = inject(SettingsHubService);
  items = signal<WarehouseItem[]>([]);
  branches = signal<BranchItem[]>([]);
  isLoading = signal(false);
  bannerError = signal<string | null>(null);
  bannerSuccess = signal<string | null>(null);
  showDialog = signal(false);
  editingId: string | null = null;
  searchQuery = '';
  formName = '';
  formLocation = '';
  formBranchId = '';

  ngOnInit() { this.load(); }

  filtered() {
    const q = this.searchQuery.toLowerCase();
    return this.items().filter(w => !q || w.name.toLowerCase().includes(q) || (w.location || '').toLowerCase().includes(q));
  }

  branchName(id: string) {
    return this.branches().find(b => b.id === id)?.name || id || '-';
  }

  load() {
    this.isLoading.set(true);
    this.api.getBranches().subscribe({
      next: res => {
        this.branches.set(res.branches || []);
        if (!this.formBranchId && this.branches().length) this.formBranchId = this.branches()[0].id;
      }
    });
    this.api.getWarehouses().subscribe({
      next: res => { this.items.set(res.warehouses || []); this.isLoading.set(false); },
      error: err => { this.isLoading.set(false); this.bannerError.set(err.error?.error || 'Failed to load warehouses.'); }
    });
  }

  openAdd(item?: WarehouseItem) {
    this.editingId = item?.id || null;
    this.formName = item?.name || '';
    this.formLocation = item?.location || '';
    this.formBranchId = item?.branchId || this.branches()[0]?.id || '';
    this.showDialog.set(true);
  }

  save() {
    const payload = { name: this.formName.trim(), location: this.formLocation.trim(), branchId: this.formBranchId, isActive: true };
    if (!payload.name || !payload.branchId) { this.bannerError.set('Name and branch are required.'); return; }
    const req = this.editingId ? this.api.updateWarehouse(this.editingId, payload) : this.api.createWarehouse(payload);
    req.subscribe({
      next: () => { this.showDialog.set(false); this.bannerSuccess.set('Warehouse saved.'); this.load(); },
      error: err => { this.bannerError.set(err.error?.error || 'Failed to save warehouse.'); }
    });
  }

  remove(item: WarehouseItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    this.api.deleteWarehouse(item.id).subscribe({
      next: () => { this.bannerSuccess.set('Deleted warehouse.'); this.load(); },
      error: err => { this.bannerError.set(err.error?.error || 'Cannot delete this warehouse.'); }
    });
  }
}
