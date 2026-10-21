import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsHubService, BranchItem } from '../../core/services/settings-hub.service';

@Component({
  selector: 'app-branches-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branches-panel.component.html',
  styleUrls: ['./settings-panel.scss']
})
export class BranchesPanelComponent implements OnInit {
  private api = inject(SettingsHubService);
  items = signal<BranchItem[]>([]);
  isLoading = signal(false);
  bannerError = signal<string | null>(null);
  bannerSuccess = signal<string | null>(null);
  showDialog = signal(false);
  editingId: string | null = null;
  searchQuery = '';
  formName = '';
  formAddress = '';

  ngOnInit() { this.load(); }

  filtered() {
    const q = this.searchQuery.toLowerCase();
    return this.items().filter(b => !q || b.name.toLowerCase().includes(q) || (b.address || '').toLowerCase().includes(q));
  }

  load() {
    this.isLoading.set(true);
    this.api.getBranches().subscribe({
      next: res => { this.items.set(res.branches || []); this.isLoading.set(false); },
      error: err => { this.isLoading.set(false); this.bannerError.set(err.error?.error || 'Failed to load branches.'); }
    });
  }

  openAdd(branch?: BranchItem) {
    this.editingId = branch?.id || null;
    this.formName = branch?.name || '';
    this.formAddress = branch?.address || '';
    this.showDialog.set(true);
  }

  save() {
    const payload = { name: this.formName.trim(), address: this.formAddress.trim() };
    if (!payload.name) { this.bannerError.set('Branch name is required.'); return; }
    const req = this.editingId ? this.api.updateBranch(this.editingId, payload) : this.api.createBranch(payload);
    req.subscribe({
      next: () => { this.showDialog.set(false); this.bannerSuccess.set('Branch saved.'); this.load(); },
      error: err => { this.bannerError.set(err.error?.error || 'Failed to save branch.'); }
    });
  }

  remove(item: BranchItem) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    this.api.deleteBranch(item.id).subscribe({
      next: () => { this.bannerSuccess.set('Deleted branch.'); this.load(); },
      error: err => { this.bannerError.set(err.error?.error || 'Cannot delete this branch.'); }
    });
  }
}
