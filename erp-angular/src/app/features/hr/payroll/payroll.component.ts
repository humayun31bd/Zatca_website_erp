import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HrService, PayrollRecord, Employee } from '../../../core/services/hr.service';

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './payroll.component.html',
  styleUrls: ['./payroll.component.scss']
})
export class PayrollComponent implements OnInit {
  private hrService = inject(HrService);
  private fb = inject(FormBuilder);

  records = signal<PayrollRecord[]>([]);
  employees = signal<Employee[]>([]);
  isLoading = signal(true);
  isGenerating = signal(false);

  selectedMonth = signal<number>(new Date().getMonth() + 1);
  selectedYear = signal<number>(new Date().getFullYear());
  departmentFilter = signal<string>('ALL');
  statusFilter = signal<string>('ALL');

  // Modals
  showGenerateDialog = signal(false);
  showPayslipDialog = signal(false);
  selectedPayslip = signal<PayrollRecord | null>(null);

  generateForm: FormGroup = this.fb.group({
    month: [new Date().getMonth() + 1, Validators.required],
    year: [new Date().getFullYear(), Validators.required],
    departmentName: ['ALL'],
    startDate: [''],
    endDate: ['']
  });

  months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' }
  ];

  years = [2024, 2025, 2026, 2027];

  departments = computed(() => {
    const set = new Set<string>();
    for (const r of this.records()) {
      if (r.departmentName) set.add(r.departmentName);
    }
    return Array.from(set).sort();
  });

  filteredRecords = computed(() => {
    let list = this.records();
    if (this.departmentFilter() !== 'ALL') {
      list = list.filter(r => r.departmentName === this.departmentFilter());
    }
    if (this.statusFilter() !== 'ALL') {
      list = list.filter(r => r.status === this.statusFilter());
    }
    return list;
  });

  // KPI Computations
  totalNetSalary = computed(() => {
    return this.filteredRecords().reduce((acc, r) => acc + (Number(r.netSalary) || 0), 0);
  });

  totalBasicSalary = computed(() => {
    return this.filteredRecords().reduce((acc, r) => acc + (Number(r.basicSalary) || 0), 0);
  });

  totalAllowances = computed(() => {
    return this.filteredRecords().reduce((acc, r) => {
      const h = Number(r.housingAllowance) || 0;
      const t = Number(r.transportAllowance) || 0;
      const o = Number(r.otherAllowance) || 0;
      const ot = Number(r.overtimePay) || 0;
      return acc + h + t + o + ot;
    }, 0);
  });

  totalDeductions = computed(() => {
    return this.filteredRecords().reduce((acc, r) => {
      const g = Number(r.gosiDeduction) || 0;
      const l = Number(r.loanDeduction) || 0;
      const f = Number(r.finesPenalties) || 0;
      return acc + g + l + f;
    }, 0);
  });

  ngOnInit() {
    this.loadPayroll();
  }

  loadPayroll() {
    this.isLoading.set(true);
    this.hrService.getPayroll({
      month: this.selectedMonth(),
      year: this.selectedYear(),
      department: this.departmentFilter(),
      status: this.statusFilter()
    }).subscribe({
      next: (data) => {
        this.records.set(data || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  onPeriodChange() {
    this.loadPayroll();
  }

  openGenerateDialog() {
    const y = this.selectedYear();
    const m = this.selectedMonth();
    const start = new Date(y, m - 1, 1).toISOString().substring(0, 10);
    const end = new Date(y, m, 0).toISOString().substring(0, 10);

    this.generateForm.patchValue({
      month: m,
      year: y,
      departmentName: 'ALL',
      startDate: start,
      endDate: end
    });
    this.showGenerateDialog.set(true);
  }

  executeGeneratePayroll() {
    this.isGenerating.set(true);
    const val = this.generateForm.value;
    this.hrService.generatePayroll({
      month: Number(val.month),
      year: Number(val.year),
      department: val.departmentName === 'ALL' ? undefined : val.departmentName,
      startDate: val.startDate,
      endDate: val.endDate
    }).subscribe({
      next: () => {
        this.isGenerating.set(false);
        this.showGenerateDialog.set(false);
        this.selectedMonth.set(Number(val.month));
        this.selectedYear.set(Number(val.year));
        this.loadPayroll();
      },
      error: (err) => {
        this.isGenerating.set(false);
        alert('Payroll execution error: ' + (err.error?.error || err.message));
      }
    });
  }

  markAsPaid(rec: PayrollRecord) {
    if (!confirm(`Mark salary as PAID for ${rec.firstName || 'Employee'}?`)) return;

    this.hrService.updatePayrollRecord(rec.id, { status: 'PAID' }).subscribe({
      next: () => {
        this.loadPayroll();
      },
      error: (err) => {
        alert('Failed to update status: ' + (err.error?.error || err.message));
      }
    });
  }

  viewPayslip(rec: PayrollRecord) {
    this.selectedPayslip.set(rec);
    this.showPayslipDialog.set(true);
  }

  printPayslip() {
    window.print();
  }

  closePayslipDialog() {
    this.showPayslipDialog.set(false);
  }
}
