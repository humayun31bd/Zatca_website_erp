import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { InvoicesService } from '../../../core/services/invoices.service';
import { Invoice } from '../../../core/models/invoice.models';
import { CreateInvoiceDialogComponent } from '../components/create-invoice-dialog/create-invoice-dialog.component';
import { InvoiceViewDialogComponent } from '../components/invoice-view-dialog/invoice-view-dialog.component';

export type InvoiceQuickFilter = 'ALL' | 'CLEARED' | 'REPORTED' | 'PENDING' | 'UNPAID';

@Component({
  selector: 'app-invoices-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    TagModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TooltipModule,
    CreateInvoiceDialogComponent,
    InvoiceViewDialogComponent
  ],
  templateUrl: './invoices-list.component.html',
  styleUrls: ['./invoices-list.component.scss']
})
export class InvoicesListComponent implements OnInit {
  private invoicesService = inject(InvoicesService);

  invoices = signal<Invoice[]>([]);
  isLoading = signal(false);

  // View Mode: Table vs Grid/Card
  viewMode = signal<'table' | 'grid'>('table');

  // Modal dialog states
  isCreateDialogOpen = signal(false);
  isViewDialogOpen = signal(false);
  selectedInvoiceId = signal<string | null>(null);

  // Filters
  searchQuery = signal('');
  activeQuickFilter = signal<InvoiceQuickFilter>('ALL');
  selectedPaymentStatus = signal('ALL');
  selectedZatcaStatus = signal('ALL');

  readonly paymentStatusOptions = [
    { label: 'All Payment Statuses', value: 'ALL' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Partial', value: 'PARTIAL' },
    { label: 'Unpaid', value: 'UNPAID' }
  ];

  readonly zatcaStatusOptions = [
    { label: 'All ZATCA Statuses', value: 'ALL' },
    { label: 'Cleared', value: 'CLEARED' },
    { label: 'Reported', value: 'REPORTED' },
    { label: 'Pending', value: 'PENDING' }
  ];

  // Filtered Invoices
  filteredInvoices = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const payStatus = this.selectedPaymentStatus();
    const zatca = this.selectedZatcaStatus();

    return this.invoices().filter(inv => {
      const matchesSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.buyerName.toLowerCase().includes(q) ||
        (inv.buyerVat && inv.buyerVat.toLowerCase().includes(q));

      const matchesPay = payStatus === 'ALL' || inv.paymentStatus === payStatus;
      const matchesZatca = zatca === 'ALL' || inv.zatcaStatus === zatca;

      const qf = this.activeQuickFilter();
      let matchesQuick = true;
      if (qf === 'CLEARED') matchesQuick = inv.zatcaStatus === 'CLEARED';
      else if (qf === 'REPORTED') matchesQuick = inv.zatcaStatus === 'REPORTED';
      else if (qf === 'PENDING') matchesQuick = inv.zatcaStatus === 'PENDING' || inv.zatcaStatus === 'DRAFT';
      else if (qf === 'UNPAID') matchesQuick = inv.paymentStatus === 'UNPAID';

      return matchesSearch && matchesPay && matchesZatca && matchesQuick;
    });
  });

  // KPI Computations
  totalInvoicesCount = computed(() => this.invoices().length);

  totalBilledAmount = computed(() => {
    return this.invoices().reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
  });

  zatcaClearedCount = computed(() => {
    return this.invoices().filter(inv => inv.zatcaStatus === 'CLEARED' || inv.zatcaStatus === 'REPORTED').length;
  });

  unpaidTotalAmount = computed(() => {
    return this.invoices()
      .filter(inv => inv.paymentStatus === 'UNPAID')
      .reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
  });

  ngOnInit() {
    this.loadInvoices();
  }

  loadInvoices() {
    this.isLoading.set(true);
    this.invoicesService.getInvoices().subscribe({
      next: (data) => {
        this.invoices.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load invoices', err);
        this.isLoading.set(false);
      }
    });
  }

  openCreateDialog() {
    this.isCreateDialogOpen.set(true);
  }

  openViewDialog(invoice: Invoice) {
    this.selectedInvoiceId.set(invoice.id);
    this.isViewDialogOpen.set(true);
  }

  getZatcaSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) {
      case 'CLEARED':
        return 'success';
      case 'REPORTED':
        return 'info';
      case 'PENDING':
        return 'warn';
      case 'REJECTED':
        return 'danger';
      default:
        return 'info';
    }
  }

  getPaymentSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'PARTIAL':
        return 'info';
      case 'UNPAID':
        return 'warn';
      default:
        return 'info';
    }
  }
}
