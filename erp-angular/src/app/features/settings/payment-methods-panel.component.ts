import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface PaymentMethod {
  id: string;
  name: string;
  nameAr: string;
  color: string;
  isActive: boolean;
  isDefault: boolean;
}

const DEFAULT_METHODS: PaymentMethod[] = [
  { id: 'cash', name: 'Cash', nameAr: 'نقداً', color: '#2E7D32', isActive: true, isDefault: true },
  { id: 'card', name: 'Card / Mada', nameAr: 'بطاقة / مدى', color: '#1565C0', isActive: true, isDefault: false },
  { id: 'stc_pay', name: 'STC Pay', nameAr: 'STC Pay', color: '#6A1B9A', isActive: true, isDefault: false },
  { id: 'bank_transfer', name: 'Bank Transfer', nameAr: 'تحويل بنكي', color: '#E65100', isActive: true, isDefault: false },
  { id: 'credit', name: 'Credit / On Account', nameAr: 'آجل / على الحساب', color: '#37474F', isActive: true, isDefault: false }
];

@Component({
  selector: 'app-payment-methods-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-methods-panel.component.html',
  styleUrls: ['./settings-panel.scss']
})
export class PaymentMethodsPanelComponent {
  methods = signal<PaymentMethod[]>(DEFAULT_METHODS.map(m => ({ ...m })));
  showDialog = signal(false);
  bannerSuccess = signal<string | null>(null);
  formName = '';
  formNameAr = '';
  formColor = '#1565C0';
  colors = ['#2E7D32', '#1565C0', '#6A1B9A', '#E65100', '#37474F', '#C62828'];

  openAdd() {
    this.formName = '';
    this.formNameAr = '';
    this.formColor = '#1565C0';
    this.showDialog.set(true);
  }

  add() {
    if (!this.formName.trim()) return;
    const id = this.formName.trim().toLowerCase().replace(/\s+/g, '_');
    this.methods.set([...this.methods(), {
      id,
      name: this.formName.trim(),
      nameAr: this.formNameAr.trim() || this.formName.trim(),
      color: this.formColor,
      isActive: true,
      isDefault: false
    }]);
    this.showDialog.set(false);
    this.bannerSuccess.set('Payment method added.');
  }

  toggleActive(id: string) {
    this.methods.set(this.methods().map(m => m.id === id ? { ...m, isActive: !m.isActive } : m));
  }

  setDefault(id: string) {
    this.methods.set(this.methods().map(m => ({ ...m, isDefault: m.id === id })));
  }

  remove(id: string) {
    if (id === 'cash') return;
    this.methods.set(this.methods().filter(m => m.id !== id));
  }
}
