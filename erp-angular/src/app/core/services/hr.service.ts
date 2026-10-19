import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';

export interface EmployeeDocument {
  id: string;
  documentType: string;
  title: string;
  fileUrl: string;
  fileName?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
}

export interface EmployeeEducation {
  degree: string;
  institution: string;
  passingYear: string;
  result: string;
}

export interface EmployeeExperience {
  company: string;
  period: string;
  responsibilities: string;
}

export interface Employee {
  id: string;
  tenantId?: string;
  firstName: string;
  lastName: string;
  fatherName?: string | null;
  motherName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  departmentName?: string | null;
  designationName?: string | null;
  managerId?: string | null;
  managerName?: string | null;
  jobResponsibility?: string | null;
  workingHours?: string | null;
  offDay?: string | null;
  shiftInfo?: string | null;
  yearlyBenefits?: string | null;
  nationalId?: string | null;
  iqamaExpiryDate?: string | Date | null;
  passportNumber?: string | null;
  passportExpiryDate?: string | Date | null;
  gosiNumber?: string | null;
  joiningDate?: string | Date | null;
  basicSalary?: number | string | null;
  payGrade?: string | null;
  payScale?: string | null;
  housingAllowance?: number | string | null;
  transportAllowance?: number | string | null;
  otherAllowance?: number | string | null;
  profilePicture?: string | null;
  experiences?: EmployeeExperience[] | string | null;
  skills?: string[] | string | null;
  educations?: EmployeeEducation[] | string | null;
  documents?: EmployeeDocument[] | string | null;
  paymentMethod?: 'BANK' | 'CASH' | string;
  status: 'ACTIVE' | 'INACTIVE' | 'LEFT' | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id?: string;
  tenantId?: string;
  employeeId: string;
  date: string | Date;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';
  checkIn?: string | null;
  checkOut?: string | null;
  notes?: string | null;
  createdAt?: string;
}

export interface PayrollRecord {
  id: string;
  tenantId?: string;
  employeeId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  designationName?: string;
  departmentName?: string;
  nationalId?: string;
  gosiNumber?: string;
  month: number;
  year: number;
  basicSalary: number | string;
  housingAllowance?: number | string;
  transportAllowance?: number | string;
  otherAllowance?: number | string;
  overtimeHours?: number | string;
  overtimePay?: number | string;
  presentDays?: number;
  absentDays?: number;
  lateDays?: number;
  finesPenalties?: number | string;
  loanDeduction?: number | string;
  gosiDeduction?: number | string;
  deductions?: number | string;
  netSalary: number | string;
  paymentDate?: string | Date | null;
  paymentMethod?: string;
  status: 'DRAFT' | 'APPROVED' | 'PAID' | string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HrService {
  private http = inject(HttpClient);
  private baseUrl = API_ENDPOINTS.hr;

  // --- Employees ---
  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[] | { error?: string }>(`${this.baseUrl}/employees`).pipe(
      map(data => (Array.isArray(data) ? data : []))
    );
  }

  getEmployeeById(id: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.baseUrl}/employees/${id}`);
  }

  createEmployee(employee: Partial<Employee>): Observable<Employee> {
    return this.http.post<Employee>(`${this.baseUrl}/employees`, employee);
  }

  updateEmployee(id: string, employee: Partial<Employee>): Observable<Employee> {
    return this.http.put<Employee>(`${this.baseUrl}/employees/${id}`, employee);
  }

  deleteEmployee(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/employees/${id}`);
  }

  // --- Attendance ---
  getAttendance(params?: { startDate?: string; endDate?: string; employeeId?: string }): Observable<{ success: boolean; attendance: AttendanceRecord[] }> {
    let httpParams = new HttpParams();
    if (params?.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params?.endDate) httpParams = httpParams.set('endDate', params.endDate);
    if (params?.employeeId) httpParams = httpParams.set('employeeId', params.employeeId);

    return this.http.get<{ success: boolean; attendance: AttendanceRecord[] }>(`${this.baseUrl}/attendance`, {
      params: httpParams
    });
  }

  recordAttendance(record: Partial<AttendanceRecord>): Observable<{ success: boolean; attendance: AttendanceRecord }> {
    return this.http.post<{ success: boolean; attendance: AttendanceRecord }>(`${this.baseUrl}/attendance`, record);
  }

  // --- Payroll ---
  getPayroll(params?: { month?: number; year?: number; department?: string; status?: string }): Observable<PayrollRecord[]> {
    let httpParams = new HttpParams();
    if (params?.month) httpParams = httpParams.set('month', params.month.toString());
    if (params?.year) httpParams = httpParams.set('year', params.year.toString());
    if (params?.department && params.department !== 'ALL') httpParams = httpParams.set('department', params.department);
    if (params?.status && params.status !== 'ALL') httpParams = httpParams.set('status', params.status);

    return this.http.get<PayrollRecord[]>(`${this.baseUrl}/payroll`, {
      params: httpParams
    });
  }

  generatePayroll(payload: { month: number; year: number; department?: string; startDate?: string; endDate?: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/payroll`, payload);
  }

  updatePayrollRecord(id: string, data: { status?: string; finesPenalties?: number; overtimePay?: number; netSalary?: number }): Observable<PayrollRecord> {
    return this.http.put<PayrollRecord>(`${this.baseUrl}/payroll/${id}`, data);
  }
}
