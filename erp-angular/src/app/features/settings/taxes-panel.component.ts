import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsHubService, TaxCategory } from '../../core/services/settings-hub.service';

@Component({
  selector: 'app-taxes-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './taxes-panel.component.html',
  styleUrls: ['./settings-panel.scss']
})
export class TaxesPanelComponent implements OnInit {
  private api = inject(SettingsHubService);

  taxes = signal<TaxCategory[]>([]);
  isLoading = signal(false);
  bannerError = signal<string | null>(null);
  bannerSuccess = signal<string | null>(null);
  showDialog = signal(false);
  searchQuery = '';
  formName = '';
  formRate = '15';
  formType = 'VAT';

  ngOnInit() {
    this.load();
  }

  filtered() {
    const q = this.searchQuery.toLowerCase();
    return this.taxes().filter(t => {
      const name = (t.categoryName || t.name || '').toLowerCase();
      const type = (t.type || 'VAT').toLowerCase();
      return !q || name.includes(q) || type.includes(q);
    });
  }

  load() {
    this.isLoading.set(true);
    this.api.getTaxes().subscribe({
      next: res => {
        this.taxes.set(res.taxes || []);
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoading.set(false);
        this.bannerError.set(err.error?.error || 'Failed to load taxes.');
        if (!this.taxes().length) {
          this.taxes.set([
            { id: 't1', categoryName: 'Standard Rate', taxRate: 15, type: 'VAT' },
            { id: 't2', categoryName: 'Zero Rate', taxRate: 0, type: 'VAT' },
            { id: 't3', categoryName: 'Exempt', taxRate: 0, type: 'Exempt' }
          ]);
        }
      }
    });
  }

  openAdd() {
    this.formName = '';
    this.formRate = '15';
    this.formType = 'VAT';
    this.showDialog.set(true);
  }

  save() {
    const name = this.formName.trim();
    const rate = Number(String(this.formRate).replace('%', '')) || 0;
    if (!name) {
      this.bannerError.set('Tax name is required.');
      return;
    }
    this.api.createTax({ categoryName: name, taxRate: rate }).subscribe({
      next: res => {
        this.showDialog.set(false);
        if (res.tax) this.taxes.set([...this.taxes(), res.tax]);
        this.bannerSuccess.set('Added tax');
      },
      error: () => {
        this.showDialog.set(false);
        this.taxes.set([...this.taxes(), {
          id: Date.now().toString(),
          categoryName: name,
          taxRate: rate,
          type: this.formType
        }]);
        this.bannerSuccess.set('Added tax locally (API unavailable).');
      }
    });
  }

  remove(id: string) {
    this.taxes.set(this.taxes().filter(t => t.id !== id));
    this.bannerSuccess.set('Deleted tax');
  }

  displayName(t: TaxCategory) {
    return t.categoryName || t.name || '-';
  }

  displayRate(t: TaxCategory) {
    const rate = t.taxRate ?? t.rate ?? 0;
    return String(rate).includes('%') ? rate : `${rate}%`;
  }
}
