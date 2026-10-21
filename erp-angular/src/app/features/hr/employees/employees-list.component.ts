import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HrService, Employee } from '../../../core/services/hr.service';

@Component({
  selector: 'app-employees-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './employees-list.component.html',
  styleUrls: ['./employees-list.component.scss']
})
export class EmployeesListComponent implements OnInit {
  private hrService = inject(HrService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  employees = signal<Employee[]>([]);
  isLoading = signal(true);

  searchQuery = signal('');
  statusFilter = signal('ALL');
  paymentFilter = signal('ALL');
  departmentFilter = signal('ALL');
  isGridView = signal(false);

  // Unique departments for filter dropdown
  departments = computed(() => {
    const set = new Set<string>();
    for (const emp of this.employees()) {
      if (emp.departmentName) set.add(emp.departmentName);
    }
    return Array.from(set).sort();
  });

  // Filtered employees
  filteredEmployees = computed(() => {
    let list = this.employees();
    const query = this.searchQuery().toLowerCase().trim();

    if (query) {
      list = list.filter(e =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(query) ||
        (e.email && e.email.toLowerCase().includes(query)) ||
        (e.phone && e.phone.toLowerCase().includes(query)) ||
        (e.nationalId && e.nationalId.toLowerCase().includes(query)) ||
        (e.departmentName && e.departmentName.toLowerCase().includes(query)) ||
        (e.designationName && e.designationName.toLowerCase().includes(query))
      );
    }

    if (this.statusFilter() !== 'ALL') {
      list = list.filter(e => e.status === this.statusFilter());
    }

    if (this.paymentFilter() !== 'ALL') {
      list = list.filter(e => e.paymentMethod === this.paymentFilter());
    }

    if (this.departmentFilter() !== 'ALL') {
      list = list.filter(e => e.departmentName === this.departmentFilter());
    }

    return list;
  });

  // --- Pagination State & Logic ---
  pageSize = signal<number>(10);
  currentPage = signal<number>(1);
  readonly pageSizeOptions: number[] = [5, 10, 25, 50, 100];

  totalItems = computed(() => this.filteredEmployees().length);

  totalPages = computed(() => {
    const total = Math.ceil(this.totalItems() / this.pageSize());
    return Math.max(1, total);
  });

  paginatedEmployees = computed(() => {
    const list = this.filteredEmployees();
    const size = this.pageSize();
    const maxPage = Math.max(1, Math.ceil(list.length / size));
    const page = Math.min(Math.max(1, this.currentPage()), maxPage);
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  showingStart = computed(() => {
    if (this.totalItems() === 0) return 0;
    const page = Math.min(Math.max(1, this.currentPage()), this.totalPages());
    return (page - 1) * this.pageSize() + 1;
  });

  showingEnd = computed(() => {
    const page = Math.min(Math.max(1, this.currentPage()), this.totalPages());
    return Math.min(page * this.pageSize(), this.totalItems());
  });

  pageNumbers = computed<(number | string)[]>(() => {
    const total = this.totalPages();
    const current = Math.min(Math.max(1, this.currentPage()), total);

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }
    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
  });

  // Filter & Search Handlers (with auto-reset to page 1)
  onSearchChange(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  onDepartmentChange(dept: string) {
    this.departmentFilter.set(dept);
    this.currentPage.set(1);
  }

  onStatusChange(status: string) {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  onPaymentChange(pay: string) {
    this.paymentFilter.set(pay);
    this.currentPage.set(1);
  }

  onPageSizeChange(size: number | string) {
    this.pageSize.set(Number(size));
    this.currentPage.set(1);
  }

  // Pagination Navigation
  goToPage(page: number | string) {
    if (typeof page === 'number') {
      const target = Math.min(Math.max(1, page), this.totalPages());
      this.currentPage.set(target);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  firstPage() {
    this.currentPage.set(1);
  }

  lastPage() {
    this.currentPage.set(this.totalPages());
  }

  ngOnInit() {
    this.loadEmployees();
    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'new') {
        this.openCreatePage();
      }
    });
  }

  openCreatePage() {
    this.router.navigate(['/hr/employees/new']);
  }

  loadEmployees() {
    this.isLoading.set(true);
    this.hrService.getEmployees().subscribe({
      next: (data) => {
        this.employees.set(Array.isArray(data) ? data : []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  openDetail(emp: Employee) {
    this.router.navigate(['/hr/employees', emp.id]);
  }

  openEditPage(emp: Employee) {
    this.router.navigate(['/hr/employees', emp.id, 'edit']);
  }

  deleteEmployee(emp: Employee) {
    if (!confirm(`Are you sure you want to remove ${emp.firstName} ${emp.lastName}?`)) {
      return;
    }
    this.hrService.deleteEmployee(emp.id).subscribe({
      next: () => {
        this.loadEmployees();
      },
      error: (err) => {
        alert('Failed to delete employee: ' + (err.error?.error || err.message));
      }
    });
  }
}
