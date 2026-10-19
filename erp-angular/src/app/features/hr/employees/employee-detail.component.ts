import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  HrService,
  Employee,
  EmployeeDocument,
  EmployeeEducation,
  EmployeeExperience
} from '../../../core/services/hr.service';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './employee-detail.component.html',
  styleUrls: ['./employee-detail.component.scss']
})
export class EmployeeDetailComponent implements OnInit {
  private hrService = inject(HrService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  employee = signal<Employee | null>(null);
  isLoading = signal(true);
  loadError = signal<string | null>(null);
  isDeleting = signal(false);

  fullName = computed(() => {
    const e = this.employee();
    return e ? `${e.firstName} ${e.lastName}`.trim() : '';
  });

  initials = computed(() => {
    const e = this.employee();
    if (!e) return 'E';
    return `${(e.firstName || '?').charAt(0)}${(e.lastName || '').charAt(0)}`.toUpperCase();
  });

  documents = computed(() => this.parseList<EmployeeDocument>(this.employee()?.documents));
  educations = computed(() => this.parseList<EmployeeEducation>(this.employee()?.educations));
  experiences = computed(() => this.parseList<EmployeeExperience>(this.employee()?.experiences));
  skills = computed(() => this.parseList<string>(this.employee()?.skills));
  benefits = computed(() =>
    (this.employee()?.yearlyBenefits || '')
      .split(';')
      .map(v => v.trim())
      .filter(Boolean)
  );

  grossPay = computed(() => {
    const e = this.employee();
    if (!e) return 0;
    return (
      Number(e.basicSalary || 0) +
      Number(e.housingAllowance || 0) +
      Number(e.transportAllowance || 0) +
      Number(e.otherAllowance || 0)
    );
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.isLoading.set(false);
      this.loadError.set('Employee id is missing.');
      return;
    }
    this.loadEmployee(id);
  }

  loadEmployee(id: string) {
    this.isLoading.set(true);
    this.loadError.set(null);
    this.hrService.getEmployeeById(id).subscribe({
      next: emp => {
        this.employee.set(emp);
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoading.set(false);
        this.loadError.set(err.error?.error || err.message || 'Failed to load employee.');
      }
    });
  }

  display(value: unknown): string {
    if (value === null || value === undefined || value === '') return 'Not specified';
    return String(value);
  }

  money(value: unknown): string {
    const n = Number(value);
    if (!n) return 'Not specified';
    return `SAR ${n.toLocaleString('en-SA', { maximumFractionDigits: 0 })}`;
  }

  formatDate(value: unknown): string {
    if (!value) return 'Not specified';
    const d = new Date(value as string);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  docType(doc: EmployeeDocument): string {
    return doc.documentType || (doc as any).document_type || 'Document';
  }

  docFile(doc: EmployeeDocument): string {
    return doc.fileName || (doc as any).file_name || doc.fileUrl || (doc as any).file_url || 'Attachment';
  }

  docExpiry(doc: EmployeeDocument): string | null {
    return doc.expiryDate || (doc as any).expiry_date || null;
  }

  goEdit() {
    const id = this.employee()?.id;
    if (id) this.router.navigate(['/hr/employees', id, 'edit']);
  }

  goBack() {
    this.router.navigate(['/hr/employees']);
  }

  deleteEmployee() {
    const emp = this.employee();
    if (!emp) return;
    if (!confirm(`Delete ${emp.firstName} ${emp.lastName}? This cannot be undone.`)) return;
    this.isDeleting.set(true);
    this.hrService.deleteEmployee(emp.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.router.navigate(['/hr/employees']);
      },
      error: err => {
        this.isDeleting.set(false);
        this.loadError.set(err.error?.error || err.message || 'Failed to delete employee.');
      }
    });
  }

  private parseList<T>(val: unknown): T[] {
    if (!val) return [];
    if (Array.isArray(val)) return val as T[];
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}
