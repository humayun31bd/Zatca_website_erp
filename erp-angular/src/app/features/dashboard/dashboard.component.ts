import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardService, DashboardStats, RecentActivityItem } from '../../core/services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);

  stats = signal<DashboardStats>({
    totalRevenue: 0,
    invoicesCleared: 0,
    overdueAmount: 0,
    totalCashOnHand: 0,
    isZatcaHealthy: true,
    recentActivity: []
  });

  isLoading = signal(true);
  selectedActivity = signal<RecentActivityItem | null>(null);
  showDetailModal = signal(false);

  // Liquidity health ratio
  liquidityRatio = computed(() => {
    const rev = this.stats().totalRevenue;
    const cash = this.stats().totalCashOnHand;
    if (rev <= 0) return 72; // default visual representation
    return Math.min(100, Math.round((cash / rev) * 100));
  });

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.isLoading.set(true);
    this.dashboardService.getDashboardStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  openActivityDetail(item: RecentActivityItem) {
    this.selectedActivity.set(item);
    this.showDetailModal.set(true);
  }

  closeModal() {
    this.showDetailModal.set(false);
  }
}
