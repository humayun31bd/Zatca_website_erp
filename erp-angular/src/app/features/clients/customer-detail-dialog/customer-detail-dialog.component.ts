import { Component, EventEmitter, Input, Output, inject, signal, OnChanges, SimpleChanges, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { InvoicesService } from '../../../core/services/invoices.service';
import { Client } from '../../../core/models/parties.models';
import { Invoice } from '../../../core/models/invoice.models';
import { InvoiceViewDialogComponent } from '../../invoicing/components/invoice-view-dialog/invoice-view-dialog.component';

export interface AgingBucketSummary {
  current: number;    // 0-30 days
  days31to60: number; // 31-60 days
  days61to90: number; // 61-90 days
  days91to120: number;// 91-120 days
  days120plus: number;// 120+ days
}

@Component({
  selector: 'app-customer-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    TagModule,
    TableModule,
    ProgressBarModule,
    TooltipModule,
    InvoiceViewDialogComponent
  ],
  templateUrl: './customer-detail-dialog.component.html',
  styleUrls: ['./customer-detail-dialog.component.scss']
})
export class CustomerDetailDialogComponent implements OnChanges {
  private invoicesService = inject(InvoicesService);

  @Input() visible = false;
  @Input() client: Client | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() edit = new EventEmitter<Client>();

  activeTab = signal<'overview' | 'invoices' | 'statement'>('overview');
  invoices = signal<Invoice[]>([]);
  isLoadingInvoices = signal(false);

  // Nested Invoice View Dialog
  selectedInvoiceId = signal<string | null>(null);
  isInvoiceViewOpen = signal(false);

  // Computed Financials
  totalInvoiced = computed(() => {
    return this.invoices().reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
  });

  totalVatPaid = computed(() => {
    return this.invoices().reduce((sum, inv) => sum + (Number(inv.totalVatAmount) || 0), 0);
  });

  creditUtilizationPercent = computed(() => {
    if (!this.client || !this.client.permitCredit || !this.client.creditLimit || this.client.creditLimit <= 0) {
      return 0;
    }
    const dues = Math.max(0, Number(this.client.dues) || 0);
    const limit = Number(this.client.creditLimit);
    return Math.min(100, Math.round((dues / limit) * 100));
  });

  // Aging Buckets Calculation
  agingBuckets = computed<AgingBucketSummary>(() => {
    const buckets: AgingBucketSummary = {
      current: 0,
      days31to60: 0,
      days61to90: 0,
      days91to120: 0,
      days120plus: 0
    };

    const now = new Date().getTime();
    for (const inv of this.invoices()) {
      // If invoice has outstanding dues or unpaid
      const isUnpaid = inv.paymentStatus !== 'PAID';
      const amount = Number(inv.totalAmount) || 0;
      if (!isUnpaid || amount <= 0) continue;

      const dateStr = inv.issueDatetime || inv.createdAt;
      const invDate = dateStr ? new Date(dateStr).getTime() : now;
      const days = Math.floor((now - invDate) / (1000 * 60 * 60 * 24));

      if (days <= 30) buckets.current += amount;
      else if (days <= 60) buckets.days31to60 += amount;
      else if (days <= 90) buckets.days61to90 += amount;
      else if (days <= 120) buckets.days91to120 += amount;
      else buckets.days120plus += amount;
    }

    return buckets;
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible'] && this.visible && this.client) {
      this.loadInvoices(this.client.id);
    }
  }

  loadInvoices(clientId: string) {
    this.isLoadingInvoices.set(true);
    this.invoicesService.getInvoices(clientId).subscribe({
      next: (list) => {
        this.invoices.set(list || []);
        this.isLoadingInvoices.set(false);
      },
      error: (err) => {
        console.error('Failed to load customer invoices', err);
        this.isLoadingInvoices.set(false);
      }
    });
  }

  viewInvoice(invoice: Invoice) {
    this.selectedInvoiceId.set(invoice.id);
    this.isInvoiceViewOpen.set(true);
  }

  close() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onEdit() {
    if (this.client) {
      this.close();
      this.edit.emit(this.client);
    }
  }

  printStatement() {
    window.print();
  }

  copyVat() {
    if (this.client?.vatNumber) {
      navigator.clipboard?.writeText(this.client.vatNumber);
    }
  }

  openWhatsApp() {
    if (!this.client?.phoneNumber) return;
    const cleanPhone = this.client.phoneNumber.replace(/[^0-9]/g, '');
    const dues = (this.client.dues || 0).toFixed(2);
    const text = encodeURIComponent(
      `Hello ${this.client.name}, this is a statement notification regarding your account balance of SAR ${dues}. Please contact us if you have any questions.`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  }

  getTypeSeverity(type?: string | null): 'success' | 'info' | 'warn' | 'secondary' {
    switch (type) {
      case 'BUSINESS': return 'info';
      case 'INDIVIDUAL': return 'success';
      case 'GOVERNMENT': return 'warn';
      default: return 'secondary';
    }
  }

  getZatcaStatusSeverity(status?: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch ((status || '').toUpperCase()) {
      case 'CLEARED':
      case 'REPORTED':
      case 'PAID':
        return 'success';
      case 'PENDING':
      case 'DRAFT':
        return 'warn';
      case 'REJECTED':
      case 'CANCELLED':
      case 'FAILED':
        return 'danger';
      default:
        return 'info';
    }
  }
}
