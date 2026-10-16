import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HrService, AttendanceRecord, Employee } from '../../../core/services/hr.service';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './attendance.component.html',
  styleUrls: ['./attendance.component.scss']
})
export class AttendanceComponent implements OnInit {
  private hrService = inject(HrService);
  private fb = inject(FormBuilder);

  records = signal<AttendanceRecord[]>([]);
  employees = signal<Employee[]>([]);
  isLoading = signal(true);
  isSaving = signal(false);

  selectedDate = signal<string>(new Date().toISOString().substring(0, 10));
  selectedEmployeeId = signal<string>('ALL');
  statusFilter = signal<string>('ALL');

  showRecordDialog = signal(false);

  attendanceForm: FormGroup = this.fb.group({
    employeeId: ['', Validators.required],
    date: [new Date().toISOString().substring(0, 10), Validators.required],
    status: ['PRESENT', Validators.required],
    checkIn: ['09:00'],
    checkOut: ['18:00'],
    notes: ['']
  });

  // Map employee ID to Employee object for quick name lookups
  employeeMap = computed(() => {
    const map = new Map<string, Employee>();
    for (const emp of this.employees()) {
      map.set(emp.id, emp);
    }
    return map;
  });

  filteredRecords = computed(() => {
    let list = this.records();
    if (this.selectedEmployeeId() !== 'ALL') {
      list = list.filter(r => r.employeeId === this.selectedEmployeeId());
    }
    if (this.statusFilter() !== 'ALL') {
      list = list.filter(r => r.status === this.statusFilter());
    }
    return list;
  });

  // KPI Metrics
  presentCount = computed(() => this.records().filter(r => r.status === 'PRESENT').length);
  absentCount = computed(() => this.records().filter(r => r.status === 'ABSENT').length);
  lateCount = computed(() => this.records().filter(r => r.status === 'LATE').length);
  leaveCount = computed(() => this.records().filter(r => r.status === 'LEAVE' || r.status === 'HALF_DAY').length);

  ngOnInit() {
    this.loadEmployees();
    this.loadAttendance();
  }

  loadEmployees() {
    this.hrService.getEmployees().subscribe({
      next: (data) => this.employees.set(data || [])
    });
  }

  loadAttendance() {
    this.isLoading.set(true);
    const date = this.selectedDate();
    this.hrService.getAttendance({ startDate: date, endDate: date }).subscribe({
      next: (res) => {
        this.records.set(res?.attendance || []);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  onDateChange(newDate: string) {
    this.selectedDate.set(newDate);
    this.loadAttendance();
  }

  openRecordDialog() {
    this.attendanceForm.reset({
      employeeId: this.employees().length > 0 ? this.employees()[0].id : '',
      date: this.selectedDate(),
      status: 'PRESENT',
      checkIn: '09:00',
      checkOut: '18:00',
      notes: ''
    });
    this.showRecordDialog.set(true);
  }

  saveAttendance() {
    if (this.attendanceForm.invalid) {
      this.attendanceForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.hrService.recordAttendance(this.attendanceForm.value).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showRecordDialog.set(false);
        this.loadAttendance();
      },
      error: (err) => {
        this.isSaving.set(false);
        alert('Failed to log attendance: ' + (err.error?.error || err.message));
      }
    });
  }

  getEmployeeName(empId: string): string {
    const emp = this.employeeMap().get(empId);
    return emp ? `${emp.firstName} ${emp.lastName}` : `ID: ${empId}`;
  }

  getEmployeeDept(empId: string): string {
    const emp = this.employeeMap().get(empId);
    return emp ? (emp.departmentName || 'General') : '—';
  }
}
