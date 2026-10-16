import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { PosDashboardService, PosDashboardData } from '../../../core/services/pos-dashboard.service';

export type DateFilterPreset = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';

@Component({
  selector: 'app-pos-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ButtonModule,
    TagModule,
    TableModule,
    TooltipModule
  ],
  templateUrl: './pos-dashboard.component.html',
  styleUrls: ['./pos-dashboard.component.scss']
})
export class PosDashboardComponent implements OnInit {
  private dashboardService = inject(PosDashboardService);

  isLoading = signal(false);
  activeDateFilter = signal<DateFilterPreset>('ALL');
  
  // Configuration Settings State (matching Flutter POS settings)
  restaurantMode = signal<boolean>(false);
  selectedCurrency = signal<string>('SAR');
  printerSize = signal<string>('80mm');
  lowStockThreshold = signal<number>(5);

  dashboardData = signal<PosDashboardData>({
    totalRevenue: 0,
    totalOrders: 0,
    totalVat: 0,
    totalDiscount: 0,
    averageTicketSize: 0,
    todayRevenue: 0,
    todayOrders: 0,
    topProducts: [],
    lowStock: [],
    recentTransactions: []
  });

  // Flutter 12-item Quick Actions Grid
  readonly quickActions = [
    { label: 'POS Terminal', labelAr: 'نقطة البيع', icon: 'pi pi-desktop', route: '/pos/terminal', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { label: 'Sales Tax Invoice', labelAr: 'فاتورة ضريبية', icon: 'pi pi-receipt', route: '/invoices', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    { label: 'Purchase Order', labelAr: 'أمر شراء', icon: 'pi pi-shopping-cart', route: '/purchases', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Customers', labelAr: 'العملاء', icon: 'pi pi-users', route: '/clients', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    { label: 'Vendors / Suppliers', labelAr: 'الموردين', icon: 'pi pi-building', route: '/suppliers', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    { label: 'Accounting Ledger', labelAr: 'دفتر الحسابات', icon: 'pi pi-book', route: '/accounting', color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
    { label: 'Cash Drawer', labelAr: 'الصندوق النقدي', icon: 'pi pi-wallet', route: '/pos/terminal', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
    { label: 'Kitchen & Delivery', labelAr: 'المطبخ والتوصيل', icon: 'pi pi-truck', route: '/pos/terminal', color: '#14b8a6', bg: 'rgba(20,184,166,0.1)' },
    { label: 'Inventory Stock', labelAr: 'المخزون', icon: 'pi pi-box', route: '/pos/terminal', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
    { label: 'Trial Balance', labelAr: 'ميزان المراجعة', icon: 'pi pi-chart-line', route: '/reports/trial-balance', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    { label: 'Payment Receipts', labelAr: 'سندات القبض', icon: 'pi pi-credit-card', route: '/invoices', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { label: 'ZATCA Compliance', labelAr: 'امتثال زاتكا', icon: 'pi pi-shield', route: '/invoices', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  ];

  // Maximum revenue among top products for progress bars
  maxProductRevenue = computed(() => {
    const list = this.dashboardData().topProducts;
    if (!list || list.length === 0) return 1;
    return Math.max(...list.map(p => p.totalRevenue), 1);
  });

  ngOnInit() {
    this.loadData();
  }

  setDateFilter(preset: DateFilterPreset) {
    this.activeDateFilter.set(preset);
    this.loadData();
  }

  loadData() {
    this.isLoading.set(true);
    let startDate: string | undefined;
    let endDate: string | undefined;

    const now = new Date();
    const preset = this.activeDateFilter();

    if (preset === 'TODAY') {
      startDate = now.toISOString().split('T')[0];
      endDate = startDate;
    } else if (preset === 'WEEK') {
      const past = new Date(now.getTime() - 7 * 86400000);
      startDate = past.toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
    } else if (preset === 'MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = startOfMonth.toISOString().split('T')[0];
      endDate = now.toISOString().split('T')[0];
    }

    this.dashboardService.getDashboardData(startDate, endDate).subscribe({
      next: (data) => {
        this.dashboardData.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  toggleRestaurantMode() {
    this.restaurantMode.update(v => !v);
  }

  getZatcaSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) {
      case 'CLEARED':
      case 'REPORTED':
        return 'success';
      case 'PENDING':
      case 'DRAFT':
        return 'warn';
      case 'REJECTED':
      case 'FAILED':
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
