import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HrService, Employee } from '../../../core/services/hr.service';

@Component({
  selector: 'app-employees-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './employees-list.component.html',
  styleUrls: ['./employees-list.component.scss']
})
export class EmployeesListComponent implements OnInit {
  private hrService = inject(HrService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  employees = signal<Employee[]>([]);
  isLoading = signal(true);
  isSaving = signal(false);

  // Filters
  searchQuery = signal('');
  statusFilter = signal('ALL');
  paymentFilter = signal('ALL');
  departmentFilter = signal('ALL');
  isGridView = signal(false);

  // Dialog State
  showDialog = signal(false);
  isEditMode = signal(false);
  currentEmployeeId = signal<string | null>(null);
  activeTab = signal<'personal' | 'job' | 'financial'>('personal');

  employeeForm: FormGroup = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: [''],
    phone: [''],
    address: [''],
    nationalId: [''],
    iqamaExpiryDate: [''],
    passportNumber: [''],
    passportExpiryDate: [''],
    departmentName: [''],
    designationName: [''],
    joiningDate: [''],
    status: ['ACTIVE', Validators.required],
    basicSalary: [0],
    housingAllowance: [0],
    transportAllowance: [0],
    otherAllowance: [0],
    paymentMethod: ['BANK', Validators.required]
  });

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
        this.openCreateDialog();
      }
    });
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

  openCreateDialog() {
    this.isEditMode.set(false);
    this.currentEmployeeId.set(null);
    this.activeTab.set('personal');
    this.employeeForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      nationalId: '',
      iqamaExpiryDate: '',
      passportNumber: '',
      passportExpiryDate: '',
      departmentName: '',
      designationName: '',
      joiningDate: new Date().toISOString().substring(0, 10),
      status: 'ACTIVE',
      basicSalary: 0,
      housingAllowance: 0,
      transportAllowance: 0,
      otherAllowance: 0,
      paymentMethod: 'BANK'
    });
    this.showDialog.set(true);
  }

  openEditDialog(emp: Employee) {
    this.isEditMode.set(true);
    this.currentEmployeeId.set(emp.id);
    this.activeTab.set('personal');

    const formatDateStr = (val: any) => {
      if (!val) return '';
      const d = new Date(val);
      return isNaN(d.getTime()) ? '' : d.toISOString().substring(0, 10);
    };

    this.employeeForm.patchValue({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email || '',
      phone: emp.phone || '',
      address: emp.address || '',
      nationalId: emp.nationalId || '',
      iqamaExpiryDate: formatDateStr(emp.iqamaExpiryDate),
      passportNumber: emp.passportNumber || '',
      passportExpiryDate: formatDateStr(emp.passportExpiryDate),
      departmentName: emp.departmentName || '',
      designationName: emp.designationName || '',
      joiningDate: formatDateStr(emp.joiningDate),
      status: emp.status || 'ACTIVE',
      basicSalary: Number(emp.basicSalary) || 0,
      housingAllowance: Number(emp.housingAllowance) || 0,
      transportAllowance: Number(emp.transportAllowance) || 0,
      otherAllowance: Number(emp.otherAllowance) || 0,
      paymentMethod: emp.paymentMethod || 'BANK'
    });
    this.showDialog.set(true);
  }

  saveEmployee() {
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formVal = this.employeeForm.value;

    if (this.isEditMode() && this.currentEmployeeId()) {
      this.hrService.updateEmployee(this.currentEmployeeId()!, formVal).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showDialog.set(false);
          this.loadEmployees();
        },
        error: (err) => {
          this.isSaving.set(false);
          alert('Failed to update employee: ' + (err.error?.error || err.message));
        }
      });
    } else {
      this.hrService.createEmployee(formVal).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showDialog.set(false);
          this.loadEmployees();
        },
        error: (err) => {
          this.isSaving.set(false);
          alert('Failed to create employee: ' + (err.error?.error || err.message));
        }
      });
    }
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

  closeDialog() {
    this.showDialog.set(false);
  }
}
