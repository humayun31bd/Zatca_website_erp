import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsHubService, BranchItem, CounterItem } from '../../core/services/settings-hub.service';

@Component({
  selector: 'app-counters-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './counters-panel.component.html',
  styleUrls: ['./settings-panel.scss']
})
export class CountersPanelComponent implements OnInit {
  private api = inject(SettingsHubService);
  items = signal<CounterItem[]>([]);
  branches = signal<BranchItem[]>([]);
  isLoading = signal(false);
  bannerError = signal<string | null>(null);
  bannerSuccess = signal<string | null>(null);
  showDialog = signal(false);
  editingId: string | null = null;
  searchQuery = '';
  statusFilter = 'All';
  formName = '';
  formBranchId = '';
  formActive = true;

  ngOnInit() { this.load(); }

  filtered() {
    const q = this.searchQuery.toLowerCase();
    return this.items().filter(c => {
      const match = !q || c.name.toLowerCase().includes(q) || (c.branchName || '').toLowerCase().includes(q);
      const statusOk = this.statusFilter === 'All'
        || (this.statusFilter === 'Active' && c.isActive !== false)
        || (this.statusFilter === 'Inactive' && c.isActive === false);
      return match && statusOk;
    });
  }

  load() {
    this.isLoading.set(true);
    this.api.getBranches().subscribe({ next: res => this.branches.set(res.branches || []) });
    this.api.getCounters().subscribe({
      next: res => { this.items.set(res.counters || []); this.isLoading.set(false); },
      error: err => { this.isLoading.set(false); this.bannerError.set(err.error?.error || 'Failed to load counters.'); }
    });
  }

  openAdd(item?: CounterItem) {
    this.editingId = item?.id || null;
    this.formName = item?.name || '';
    this.formBranchId = item?.branchId || this.branches()[0]?.id || '';
    this.formActive = item?.isActive !== false;
    this.showDialog.set(true);
  }

  save() {
    const payload = { name: this.formName.trim(), branchId: this.formBranchId, isActive: this.formActive };
    if (!payload.name || !payload.branchId) { this.bannerError.set('Name and branch are required.'); return; }
    const req = this.editingId ? this.api.updateCounter(this.editingId, payload) : this.api.createCounter(payload);
    req.subscribe({
      next: () => { this.showDialog.set(false); this.bannerSuccess.set('Counter saved.'); this.load(); },
      error: err => { this.bannerError.set(err.error?.error || 'Failed to save counter.'); }
    });
  }

  remove(item: CounterItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    this.api.deleteCounter(item.id).subscribe({
      next: () => { this.bannerSuccess.set('Deleted counter.'); this.load(); },
      error: err => { this.bannerError.set(err.error?.error || 'Cannot delete this counter.'); }
    });
  }
}
