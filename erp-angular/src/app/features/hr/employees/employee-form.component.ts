import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  HrService,
  Employee,
  EmployeeDocument,
  EmployeeEducation,
  EmployeeExperience
} from '../../../core/services/hr.service';
import {
  HR_COUNTRY_CODES,
  HR_DEPARTMENTS,
  HR_DESIGNATIONS,
  HR_SHIFTS,
  HR_OFF_DAYS,
  HR_YEARLY_BENEFITS,
  HR_POPULAR_SKILLS,
  HR_DOCUMENT_TYPES,
  HR_EMPLOYMENT_TYPES,
  MAX_UPLOAD_BYTES
} from '../../../core/constants/hr-constants';

type FormTab = 'personal' | 'job' | 'schedule' | 'documents' | 'education' | 'skills';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './employee-form.component.html',
  styleUrls: ['./employee-form.component.scss']
})
export class EmployeeFormComponent implements OnInit {
  private hrService = inject(HrService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly tabs: { id: FormTab; label: string; icon: string }[] = [
    { id: 'personal', label: 'Personal Info', icon: 'pi pi-user' },
    { id: 'job', label: 'Job & Designation', icon: 'pi pi-briefcase' },
    { id: 'schedule', label: 'Schedule & Benefits', icon: 'pi pi-clock' },
    { id: 'documents', label: 'Documents & IDs', icon: 'pi pi-id-card' },
    { id: 'education', label: 'Education & Exp', icon: 'pi pi-book' },
    { id: 'skills', label: 'Skills', icon: 'pi pi-star' }
  ];

  activeTab = signal<FormTab>('personal');
  isSaving = signal(false);
  isLoading = signal(false);
  saveError = signal<string | null>(null);
  employeeId = signal<string | null>(null);
  isEditMode = computed(() => !!this.employeeId());
  pageTitle = computed(() => this.isEditMode() ? 'Edit Employee' : 'Add Employee');
  saveLabel = computed(() => this.isEditMode() ? 'Save Changes' : 'Save Employee');
  employees = signal<Employee[]>([]);

  departments = signal<string[]>([...HR_DEPARTMENTS]);
  designations = signal<string[]>([...HR_DESIGNATIONS]);
  countryCodes = HR_COUNTRY_CODES;
  shifts = HR_SHIFTS;
  offDays = HR_OFF_DAYS;
  yearlyBenefitOptions = HR_YEARLY_BENEFITS;
  popularSkills = HR_POPULAR_SKILLS;
  documentTypes = HR_DOCUMENT_TYPES;
  employmentTypes = HR_EMPLOYMENT_TYPES;

  selectedCountry = signal(HR_COUNTRY_CODES[0]);
  profilePreview = signal<string | null>(null);
  selectedBenefits = signal<string[]>([]);
  skills = signal<string[]>([]);
  skillDraft = signal('');

  documents = signal<EmployeeDocument[]>([]);
  docType = signal(HR_DOCUMENT_TYPES[0]);
  docTitle = signal('');
  docIssueDate = signal('');
  docExpiryDate = signal('');
  docNotes = signal('');
  docFileName = signal('');
  docFileData = signal('');
  docUploadError = signal<string | null>(null);

  educations = signal<EmployeeEducation[]>([]);
  eduDegree = signal('');
  eduInstitution = signal('');
  eduYear = signal('');
  eduResult = signal('');

  experiences = signal<EmployeeExperience[]>([]);
  expCompany = signal('');
  expPeriod = signal('');
  expResponsibilities = signal('');

  customDept = signal('');
  customDesignation = signal('');
  showCustomDept = signal(false);
  showCustomDesignation = signal(false);

  employeeForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    fatherName: [''],
    motherName: [''],
    email: ['', [Validators.email]],
    phone: [''],
    address: [''],
    profilePicture: [''],
    departmentName: [HR_DEPARTMENTS[0]],
    designationName: [HR_DESIGNATIONS[0]],
    employmentType: [HR_EMPLOYMENT_TYPES[0]],
    managerId: [''],
    jobResponsibility: [''],
    joiningDate: [new Date().toISOString().substring(0, 10)],
    status: ['ACTIVE', Validators.required],
    basicSalary: [0],
    housingAllowance: [0],
    transportAllowance: [0],
    otherAllowance: [0],
    paymentMethod: ['BANK', Validators.required],
    payGrade: [''],
    payScale: [''],
    workingHours: [HR_SHIFTS[0]],
    offDay: [HR_OFF_DAYS[0]],
    shiftInfo: ['Day Shift'],
    nationalId: [''],
    iqamaExpiryDate: [''],
    passportNumber: [''],
    passportExpiryDate: [''],
    gosiNumber: ['']
  });

  currentTabIndex = computed(() => this.tabs.findIndex(t => t.id === this.activeTab()));

  grossPay(): number {
    const v = this.employeeForm.getRawValue();
    return (
      Number(v.basicSalary || 0) +
      Number(v.housingAllowance || 0) +
      Number(v.transportAllowance || 0) +
      Number(v.otherAllowance || 0)
    );
  }

  managerOptions = computed(() =>
    this.employees().map(e => ({
      id: e.id,
      label: `${e.firstName} ${e.lastName}${e.designationName ? ' — ' + e.designationName : ''}`
    }))
  );

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.employeeId.set(id);
      this.loadEmployee(id);
    }
    this.hrService.getEmployees().subscribe({
      next: data => this.employees.set(Array.isArray(data) ? data.filter(e => e.id !== id) : []),
      error: () => this.employees.set([])
    });
  }

  private toDateInput(val: unknown): string {
    if (!val) return '';
    const d = new Date(val as string);
    if (isNaN(d.getTime())) {
      return typeof val === 'string' && val.length >= 10 ? val.substring(0, 10) : '';
    }
    return d.toISOString().substring(0, 10);
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

  private loadEmployee(id: string) {
    this.isLoading.set(true);
    this.hrService.getEmployeeById(id).subscribe({
      next: emp => {
        this.populateFromEmployee(emp);
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoading.set(false);
        this.saveError.set(err.error?.error || err.message || 'Failed to load employee.');
      }
    });
  }

  private populateFromEmployee(emp: Employee) {
    let phone = emp.phone || '';
    const country = this.countryCodes.find(c => phone.startsWith(c.dialCode));
    if (country) {
      this.selectedCountry.set(country);
      phone = phone.slice(country.dialCode.length).trim();
    }

    let employmentType = this.employmentTypes[0];
    let jobResponsibility = emp.jobResponsibility || '';
    if (jobResponsibility.includes(' — ')) {
      const [type, ...rest] = jobResponsibility.split(' — ');
      if (this.employmentTypes.includes(type)) {
        employmentType = type;
        jobResponsibility = rest.join(' — ');
      }
    }

    if (emp.departmentName && !this.departments().includes(emp.departmentName)) {
      this.departments.update(list => [emp.departmentName as string, ...list]);
    }
    if (emp.designationName && !this.designations().includes(emp.designationName)) {
      this.designations.update(list => [emp.designationName as string, ...list]);
    }

    this.employeeForm.patchValue({
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      fatherName: emp.fatherName || '',
      motherName: emp.motherName || '',
      email: emp.email || '',
      phone,
      address: emp.address || '',
      profilePicture: emp.profilePicture || '',
      departmentName: emp.departmentName || HR_DEPARTMENTS[0],
      designationName: emp.designationName || HR_DESIGNATIONS[0],
      employmentType,
      managerId: emp.managerId || '',
      jobResponsibility,
      joiningDate: this.toDateInput(emp.joiningDate) || new Date().toISOString().substring(0, 10),
      status: emp.status || 'ACTIVE',
      basicSalary: Number(emp.basicSalary) || 0,
      housingAllowance: Number(emp.housingAllowance) || 0,
      transportAllowance: Number(emp.transportAllowance) || 0,
      otherAllowance: Number(emp.otherAllowance) || 0,
      paymentMethod: emp.paymentMethod || 'BANK',
      payGrade: emp.payGrade || '',
      payScale: emp.payScale || '',
      workingHours: emp.workingHours || HR_SHIFTS[0],
      offDay: emp.offDay || HR_OFF_DAYS[0],
      shiftInfo: emp.shiftInfo || '',
      nationalId: emp.nationalId || '',
      iqamaExpiryDate: this.toDateInput(emp.iqamaExpiryDate),
      passportNumber: emp.passportNumber || '',
      passportExpiryDate: this.toDateInput(emp.passportExpiryDate),
      gosiNumber: emp.gosiNumber || ''
    });

    this.profilePreview.set(emp.profilePicture || null);
    this.selectedBenefits.set(
      (emp.yearlyBenefits || '')
        .split(';')
        .map(v => v.trim())
        .filter(Boolean)
    );
    this.skills.set(this.parseList<string>(emp.skills));
    this.educations.set(this.parseList<EmployeeEducation>(emp.educations));
    this.experiences.set(this.parseList<EmployeeExperience>(emp.experiences));
    this.documents.set(
      this.parseList<any>(emp.documents).map((d, i) => ({
        id: d.id || `${i}`,
        documentType: d.documentType || d.document_type || 'Other Document',
        title: d.title || '',
        fileUrl: d.fileUrl || d.file_url || '',
        fileName: d.fileName || d.file_name || null,
        issueDate: d.issueDate || d.issue_date || null,
        expiryDate: d.expiryDate || d.expiry_date || null,
        notes: d.notes || null
      }))
    );
  }

  setTab(tab: FormTab) {
    this.activeTab.set(tab);
  }

  nextTab() {
    const idx = this.currentTabIndex();
    if (idx < this.tabs.length - 1) {
      this.activeTab.set(this.tabs[idx + 1].id);
    }
  }

  prevTab() {
    const idx = this.currentTabIndex();
    if (idx > 0) {
      this.activeTab.set(this.tabs[idx - 1].id);
    }
  }

  onCountryChange(dialCode: string) {
    const match = this.countryCodes.find(c => c.dialCode === dialCode);
    if (match) this.selectedCountry.set(match);
  }

  onDepartmentChange(value: string) {
    if (value === '__custom__') {
      this.showCustomDept.set(true);
      this.employeeForm.patchValue({ departmentName: '' });
      return;
    }
    this.showCustomDept.set(false);
    this.employeeForm.patchValue({ departmentName: value });
  }

  addCustomDepartment() {
    const name = this.customDept().trim();
    if (!name) return;
    if (!this.departments().includes(name)) {
      this.departments.update(list => [name, ...list]);
    }
    this.employeeForm.patchValue({ departmentName: name });
    this.customDept.set('');
    this.showCustomDept.set(false);
  }

  onDesignationChange(value: string) {
    if (value === '__custom__') {
      this.showCustomDesignation.set(true);
      this.employeeForm.patchValue({ designationName: '' });
      return;
    }
    this.showCustomDesignation.set(false);
    this.employeeForm.patchValue({ designationName: value });
  }

  addCustomDesignation() {
    const name = this.customDesignation().trim();
    if (!name) return;
    if (!this.designations().includes(name)) {
      this.designations.update(list => [name, ...list]);
    }
    this.employeeForm.patchValue({ designationName: name });
    this.customDesignation.set('');
    this.showCustomDesignation.set(false);
  }

  onProfileFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.saveError.set('Profile photo must be an image file.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      this.saveError.set('Profile photo must be 2 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      this.profilePreview.set(data);
      this.employeeForm.patchValue({ profilePicture: data });
    };
    reader.readAsDataURL(file);
  }

  clearProfilePhoto() {
    this.profilePreview.set(null);
    this.employeeForm.patchValue({ profilePicture: '' });
  }

  toggleBenefit(benefit: string) {
    this.selectedBenefits.update(list =>
      list.includes(benefit) ? list.filter(b => b !== benefit) : [...list, benefit]
    );
  }

  onDocFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.docUploadError.set(null);
    if (!file) return;
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const extOk = /\.(pdf|png|jpe?g|webp|docx?)$/i.test(file.name);
    if (!allowed.includes(file.type) && !extOk) {
      this.docUploadError.set('Allowed types: PDF, PNG, JPG, WEBP, DOC, DOCX.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      this.docUploadError.set('Each document must be 2 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.docFileData.set(reader.result as string);
      this.docFileName.set(file.name);
      if (!this.docTitle().trim()) {
        this.docTitle.set(`${this.docType().split(' ')[0]} — ${file.name}`);
      }
    };
    reader.readAsDataURL(file);
  }

  addDocument() {
    this.docUploadError.set(null);
    const title = this.docTitle().trim();
    const fileUrl = this.docFileData().trim();
    const fileName = this.docFileName().trim();
    if (!title || !fileUrl) {
      this.docUploadError.set('Choose a file and enter a document title before attaching.');
      return;
    }
    this.documents.update(list => [
      ...list,
      {
        id: `${Date.now()}`,
        documentType: this.docType(),
        title,
        fileUrl,
        fileName,
        issueDate: this.docIssueDate() || null,
        expiryDate: this.docExpiryDate() || null,
        notes: this.docNotes().trim() || null
      }
    ]);
    this.docTitle.set('');
    this.docIssueDate.set('');
    this.docExpiryDate.set('');
    this.docNotes.set('');
    this.docFileName.set('');
    this.docFileData.set('');
  }

  removeDocument(id: string) {
    this.documents.update(list => list.filter(d => d.id !== id));
  }

  addEducation() {
    const degree = this.eduDegree().trim();
    const institution = this.eduInstitution().trim();
    if (!degree || !institution) return;
    this.educations.update(list => [
      ...list,
      {
        degree,
        institution,
        passingYear: this.eduYear().trim(),
        result: this.eduResult().trim()
      }
    ]);
    this.eduDegree.set('');
    this.eduInstitution.set('');
    this.eduYear.set('');
    this.eduResult.set('');
  }

  removeEducation(index: number) {
    this.educations.update(list => list.filter((_, i) => i !== index));
  }

  addExperience() {
    const company = this.expCompany().trim();
    if (!company) return;
    this.experiences.update(list => [
      ...list,
      {
        company,
        period: this.expPeriod().trim(),
        responsibilities: this.expResponsibilities().trim()
      }
    ]);
    this.expCompany.set('');
    this.expPeriod.set('');
    this.expResponsibilities.set('');
  }

  removeExperience(index: number) {
    this.experiences.update(list => list.filter((_, i) => i !== index));
  }

  addSkill(skill?: string) {
    const value = (skill ?? this.skillDraft()).trim();
    if (!value) return;
    if (!this.skills().includes(value)) {
      this.skills.update(list => [...list, value]);
    }
    this.skillDraft.set('');
  }

  removeSkill(skill: string) {
    this.skills.update(list => list.filter(s => s !== skill));
  }

  cancel() {
    const id = this.employeeId();
    this.router.navigate(id ? ['/hr/employees', id] : ['/hr/employees']);
  }

  firstInvalidTab(): FormTab | null {
    const first = this.employeeForm.get('firstName');
    const last = this.employeeForm.get('lastName');
    if (first?.invalid || last?.invalid) return 'personal';
    return null;
  }

  saveEmployee() {
    this.saveError.set(null);
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      const tab = this.firstInvalidTab();
      if (tab) this.activeTab.set(tab);
      this.saveError.set('First name and last name are required.');
      return;
    }

    this.isSaving.set(true);
    const v = this.employeeForm.getRawValue();
    const phone = (v.phone || '').trim();
    const managerId = v.managerId || null;
    const manager = this.employees().find(e => e.id === managerId);

    const payload: Partial<Employee> = {
      firstName: v.firstName.trim(),
      lastName: v.lastName.trim(),
      fatherName: v.fatherName?.trim() || null,
      motherName: v.motherName?.trim() || null,
      email: v.email?.trim() || null,
      phone: phone ? `${this.selectedCountry().dialCode} ${phone}` : null,
      address: v.address?.trim() || null,
      profilePicture: v.profilePicture || null,
      departmentName: v.departmentName || null,
      designationName: v.designationName || null,
      managerId,
      managerName: manager ? `${manager.firstName} ${manager.lastName}` : null,
      jobResponsibility: [v.employmentType, v.jobResponsibility?.trim()].filter(Boolean).join(' — ') || null,
      joiningDate: v.joiningDate || null,
      status: v.status,
      basicSalary: Number(v.basicSalary) || 0,
      housingAllowance: Number(v.housingAllowance) || 0,
      transportAllowance: Number(v.transportAllowance) || 0,
      otherAllowance: Number(v.otherAllowance) || 0,
      paymentMethod: v.paymentMethod,
      payGrade: v.payGrade?.trim() || null,
      payScale: v.payScale?.trim() || null,
      workingHours: v.workingHours || null,
      offDay: v.offDay || null,
      shiftInfo: v.shiftInfo?.trim() || null,
      yearlyBenefits: this.selectedBenefits().join('; ') || null,
      nationalId: v.nationalId?.trim() || null,
      iqamaExpiryDate: v.iqamaExpiryDate || null,
      passportNumber: v.passportNumber?.trim() || null,
      passportExpiryDate: v.passportExpiryDate || null,
      gosiNumber: v.gosiNumber?.trim() || null,
      documents: this.documents().map(d => ({
        id: d.id,
        document_type: d.documentType,
        title: d.title,
        file_url: d.fileUrl,
        file_name: d.fileName,
        issue_date: d.issueDate,
        expiry_date: d.expiryDate,
        notes: d.notes
      })) as unknown as EmployeeDocument[],
      educations: this.educations(),
      experiences: this.experiences(),
      skills: this.skills()
    };

    const request = this.isEditMode()
      ? this.hrService.updateEmployee(this.employeeId()!, payload)
      : this.hrService.createEmployee(payload);

    request.subscribe({
      next: saved => {
        this.isSaving.set(false);
        this.router.navigate(['/hr/employees', saved?.id || this.employeeId()]);
      },
      error: err => {
        this.isSaving.set(false);
        this.saveError.set(err.error?.error || err.message || 'Failed to save employee.');
      }
    });
  }

  fieldInvalid(name: string): boolean {
    const ctrl = this.employeeForm.get(name);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }
}
