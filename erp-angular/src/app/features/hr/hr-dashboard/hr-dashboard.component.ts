import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HrService, Employee } from '../../../core/services/hr.service';

@Component({
  selector: 'app-hr-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './hr-dashboard.component.html',
  styleUrls: ['./hr-dashboard.component.scss']
})
export class HrDashboardComponent implements OnInit {
  private hrService = inject(HrService);
  private router = inject(Router);

  employees = signal<Employee[]>([]);
  isLoading = signal(true);

  totalEmployees = computed(() => this.employees().length);
  activeEmployees = computed(() => this.employees().filter(e => e.status === 'ACTIVE').length);

  upcomingIqamaExpiries = computed(() => {
    const now = new Date();
    return this.employees().filter(e => {
      if (!e.iqamaExpiryDate) return false;
      const expiry = new Date(e.iqamaExpiryDate);
      if (isNaN(expiry.getTime())) return false;
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    }).length;
  });

  upcomingPassportExpiries = computed(() => {
    const now = new Date();
    return this.employees().filter(e => {
      if (!e.passportExpiryDate) return false;
      const expiry = new Date(e.passportExpiryDate);
      if (isNaN(expiry.getTime())) return false;
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    }).length;
  });

  departmentStats = computed(() => {
    const map = new Map<string, number>();
    for (const emp of this.employees()) {
      const dept = emp.departmentName || 'General';
      map.set(dept, (map.get(dept) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  });

  recentEmployees = computed(() => {
    return [...this.employees()].slice(0, 5);
  });

  ngOnInit() {
    this.loadEmployees();
  }

  loadEmployees() {
    this.isLoading.set(true);
    this.hrService.getEmployees().subscribe({
      next: (data) => {
        this.employees.set(data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  navigateToAddEmployee() {
    this.router.navigate(['/hr/employees/new']);
  }
}
