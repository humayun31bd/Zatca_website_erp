import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsHubService } from '../../core/services/settings-hub.service';

const FALLBACK: Record<string, { en: string; ar: string }> = {
  dashboard: { en: 'Dashboard', ar: 'لوحة التحكم' },
  invoices: { en: 'Invoices', ar: 'الفواتير' },
  settings: { en: 'Settings', ar: 'الإعدادات' },
  customers: { en: 'Customers', ar: 'العملاء' },
  products: { en: 'Products', ar: 'المنتجات' },
  purchases: { en: 'Purchases', ar: 'المشتريات' },
  save: { en: 'Save', ar: 'حفظ' },
  cancel: { en: 'Cancel', ar: 'إلغاء' }
};

@Component({
  selector: 'app-language-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './language-panel.component.html',
  styleUrls: ['./settings-panel.scss']
})
export class LanguagePanelComponent implements OnInit {
  private api = inject(SettingsHubService);
  translations = signal<Record<string, { en: string; ar: string }>>(FALLBACK);
  isLoading = signal(false);
  bannerError = signal<string | null>(null);
  bannerSuccess = signal<string | null>(null);
  showDialog = signal(false);
  searchQuery = '';
  editKey = '';
  editEn = '';
  editAr = '';

  ngOnInit() { this.load(); }

  keys() {
    const q = this.searchQuery.toLowerCase();
    return Object.keys(this.translations()).filter(k => {
      const t = this.translations()[k];
      return !q || k.toLowerCase().includes(q) || t.en.toLowerCase().includes(q) || t.ar.includes(q);
    });
  }

  load() {
    this.isLoading.set(true);
    this.api.getTranslations().subscribe({
      next: data => {
        if (data && Object.keys(data).length) this.translations.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openEdit(key: string) {
    const t = this.translations()[key];
    this.editKey = key;
    this.editEn = t.en;
    this.editAr = t.ar;
    this.showDialog.set(true);
  }

  save() {
    this.api.saveTranslation({ key: this.editKey, en: this.editEn, ar: this.editAr }).subscribe({
      next: () => {
        this.translations.set({ ...this.translations(), [this.editKey]: { en: this.editEn, ar: this.editAr } });
        this.showDialog.set(false);
        this.bannerSuccess.set(`Updated ${this.editKey}`);
      },
      error: () => {
        this.translations.set({ ...this.translations(), [this.editKey]: { en: this.editEn, ar: this.editAr } });
        this.showDialog.set(false);
        this.bannerSuccess.set(`Updated ${this.editKey} locally.`);
      }
    });
  }
}
