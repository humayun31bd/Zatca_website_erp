import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { PurchasesService } from '../../../core/services/purchases.service';
import { SupplierBill } from '../../../core/models/purchases.models';
import { RecordBillDialogComponent } from '../components/record-bill-dialog/record-bill-dialog.component';

@Component({
  selector: 'app-received-bills',
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
    RecordBillDialogComponent
  ],
  templateUrl: './received-bills.component.html',
  styleUrls: ['./received-bills.component.scss']
})
export class ReceivedBillsComponent implements OnInit {
  private purchasesService = inject(PurchasesService);

  bills = signal<SupplierBill[]>([]);
  isLoading = signal(false);
  isRecordDialogOpen = signal(false);

  // Filters
  searchQuery = signal('');
  selectedStatus = signal('ALL');

  readonly statusOptions = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Unpaid', value: 'UNPAID' },
    { label: 'Partial', value: 'PARTIAL' },
    { label: 'Paid', value: 'PAID' },
    { label: 'Overdue', value: 'OVERDUE' }
  ];

  // Filtered bills computation
  filteredBills = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.selectedStatus();

    return this.bills().filter(bill => {
      const matchesSearch =
        !query ||
        bill.billNumber.toLowerCase().includes(query) ||
        bill.supplierName.toLowerCase().includes(query);

      const matchesStatus = status === 'ALL' || bill.paymentStatus === status;

      return matchesSearch && matchesStatus;
    });
  });

  // KPI Computations
  totalBillsCount = computed(() => this.bills().length);
  
  totalIncurredAmount = computed(() => {
    return this.bills().reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);
  });

  totalUnpaidBalance = computed(() => {
    return this.bills().reduce((sum, b) => {
      const total = Number(b.totalAmount) || 0;
      const paid = Number(b.paidAmount) || 0;
      return sum + Math.max(0, total - paid);
    }, 0);
  });

  overdueCount = computed(() => {
    return this.bills().filter(b => b.paymentStatus === 'OVERDUE').length;
  });

  ngOnInit() {
    this.loadBills();
  }

  loadBills() {
    this.isLoading.set(true);
    this.purchasesService.getBills().subscribe({
      next: (data) => {
        this.bills.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load bills', err);
        this.isLoading.set(false);
      }
    });
  }

  openRecordDialog() {
    this.isRecordDialogOpen.set(true);
  }

  getSeverity(status: string): 'success' | 'warn' | 'danger' | 'info' {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'PARTIAL':
        return 'info';
      case 'UNPAID':
        return 'warn';
      case 'OVERDUE':
        return 'danger';
      default:
        return 'info';
    }
  }
}
