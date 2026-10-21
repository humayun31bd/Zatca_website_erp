import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsHubService, FinancialYearItem, FinancialPeriodItem } from '../../core/services/settings-hub.service';

@Component({
  selector: 'app-financial-years-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './financial-years-panel.component.html',
  styleUrls: ['./settings-panel.scss']
})
export class FinancialYearsPanelComponent implements OnInit {
  private api = inject(SettingsHubService);
  items = signal<FinancialYearItem[]>([]);
  expandedYearId = signal<string | null>(null);
  lockingId = signal<string | null>(null);
  isLoading = signal(false);
  bannerError = signal<string | null>(null);
  bannerSuccess = signal<string | null>(null);
  showDialog = signal(false);
  formName = 'FY 2026-2027';
  formFrom = '2026-07-01';
  formTo = '2027-06-30';

  ngOnInit() { this.load(); }

  displayName(item: FinancialYearItem) {
    return item.yearName || item.name || '-';
  }

  displayStart(item: FinancialYearItem) {
    return item.startDate || (item.fromDate ? String(item.fromDate).slice(0, 10) : '-');
  }

  displayEnd(item: FinancialYearItem) {
    return item.endDate || (item.toDate ? String(item.toDate).slice(0, 10) : '-');
  }

  periodsOf(item: FinancialYearItem): FinancialPeriodItem[] {
    return item.periods || [];
  }

  lockedCount(item: FinancialYearItem): number {
    return this.periodsOf(item).filter(p => p.isLocked).length;
  }

  toggleYear(id: string) {
    this.expandedYearId.set(this.expandedYearId() === id ? null : id);
  }

  load() {
    this.isLoading.set(true);
    this.api.getFinancialYears().subscribe({
      next: res => {
        const years = res.financialYears || [];
        this.items.set(years);
        if (!this.expandedYearId() && years.length) this.expandedYearId.set(years[0].id);
        this.isLoading.set(false);
      },
      error: err => { this.isLoading.set(false); this.bannerError.set(err.error?.error || 'Failed to load financial years.'); }
    });
  }

  openAdd() {
    this.formName = 'FY 2026-2027';
    this.formFrom = '2026-07-01';
    this.formTo = '2027-06-30';
    this.showDialog.set(true);
  }

  save() {
    if (!this.formName.trim() || !this.formFrom || !this.formTo) {
      this.bannerError.set('Name, from date, and to date are required.');
      return;
    }
    this.api.createFinancialYear({
      name: this.formName.trim(),
      fromDate: this.formFrom,
      toDate: this.formTo,
      isActive: true
    }).subscribe({
      next: () => { this.showDialog.set(false); this.bannerSuccess.set('Financial year created.'); this.load(); },
      error: err => { this.bannerError.set(err.error?.error || 'Failed to create financial year.'); }
    });
  }

  toggleLock(period: FinancialPeriodItem) {
    if (!period.id) return;
    const next = !period.isLocked;
    this.lockingId.set(period.id);
    this.api.lockFinancialPeriod(period.id, next).subscribe({
      next: res => {
        this.lockingId.set(null);
        this.bannerSuccess.set(res.message || (next ? 'Period locked.' : 'Period unlocked.'));
        this.load();
      },
      error: err => {
        this.lockingId.set(null);
        this.bannerError.set(err.error?.error || 'Failed to update period lock.');
      }
    });
  }
}
