import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsHubService, UserItem } from '../../core/services/settings-hub.service';
import { RBAC_HELP, RbacHelpTab, RbacHelpTopic } from './rbac-help';

type RbacTab = 'users' | 'delegates' | 'login' | 'password' | 'roles' | 'pages' | 'hibernate';

interface DelegateRecord {
  id: string;
  fromEmail: string;
  toEmail: string;
  startsAt: string;
  endsAt: string;
  scope: string;
  status: 'Active' | 'Scheduled' | 'Expired' | 'Revoked';
}

interface LoginProfile {
  email: string;
  displayName: string;
  canLogin: boolean;
  locked: boolean;
  lastLogin: string;
  mfa: boolean;
}

interface RoleAssignment {
  email: string;
  name: string;
  role: string;
}

interface PageAccess {
  group: string;
  page: string;
  route: string;
  view: boolean;
  create: boolean;
  edit: boolean;
}

interface HibernateModule {
  key: string;
  name: string;
  description: string;
  hibernated: boolean;
}

@Component({
  selector: 'app-rbac-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rbac-panel.component.html',
  styleUrls: ['./settings-panel.scss']
})
export class RbacPanelComponent implements OnInit {
  private api = inject(SettingsHubService);

  tab = signal<RbacTab>('users');
  tabs: { id: RbacTab; label: string; icon: string }[] = [
    { id: 'users', label: 'Users', icon: 'pi pi-users' },
    { id: 'delegates', label: 'Delegate Users', icon: 'pi pi-share-alt' },
    { id: 'login', label: 'Login Users', icon: 'pi pi-sign-in' },
    { id: 'password', label: 'Change Password', icon: 'pi pi-key' },
    { id: 'roles', label: 'User Roles', icon: 'pi pi-id-card' },
    { id: 'pages', label: 'Page Permissions', icon: 'pi pi-th-large' },
    { id: 'hibernate', label: 'Module Hibernation', icon: 'pi pi-pause' }
  ];

  bannerError = signal<string | null>(null);
  bannerSuccess = signal<string | null>(null);
  isLoading = signal(false);
  showHelp = signal(false);
  helpTopic = signal<RbacHelpTopic>(RBAC_HELP.users);

  users = signal<UserItem[]>([]);
  searchQuery = '';
  roleFilter = 'All';
  showUserDialog = signal(false);
  editingId: string | null = null;
  formEmail = '';
  formPassword = '';
  formRole = 'TENANT_USER';
  apiRoles = ['SUPERADMIN', 'TENANT_ADMIN', 'TENANT_USER'];

  delegates: DelegateRecord[] = [];
  showDelegateDialog = signal(false);
  delegateForm: DelegateRecord = this.emptyDelegate();

  loginProfiles: LoginProfile[] = [];

  passwordUser = '';
  newPassword = '';
  confirmPassword = '';
  showNewPassword = false;
  showConfirmPassword = false;

  selectedRole = 'MAKER';
  roles = ['Sys Admin', 'MAKER', 'CHECKER', 'APPROVER', 'Budget Off.', 'Int. Auditor', 'Ext. Auditor', 'Mgmt (DG)'];
  assignmentRoles = ['SUPERADMIN', 'TENANT_ADMIN', 'MAKER', 'CHECKER', 'APPROVER', 'BUDGET_OFFICER', 'INTERNAL_AUDITOR', 'TENANT_USER'];
  modules = [
    'Vouchers & General Ledger (PV, RV, JV, CV)',
    'Chart of Accounts & Mappings',
    'POS Checkout & Sales Invoices',
    'Purchases & Vendor Bills',
    'Inventory Stock Management',
    'HR & Payroll Management',
    'Financial Years & Period Lock',
    'Financial Reports & Auditor Portal'
  ];
  actions = ['C', 'R', 'U', 'A', 'P'];
  actionLabels: Record<string, string> = {
    C: 'C (Create)',
    R: 'R (Read)',
    U: 'U (Update)',
    A: 'A (Approve)',
    P: 'P (Post)'
  };
  matrix: Record<string, Record<string, Record<string, boolean>>> = this.seedMatrix();
  assignments: RoleAssignment[] = [];

  pageAccess: PageAccess[] = [];
  hibernateModules: HibernateModule[] = [];

  ngOnInit() {
    this.delegates = this.loadLocal('zatca.rbac.delegates', this.seedDelegates());
    this.loginProfiles = this.loadLocal('zatca.rbac.login', this.seedLogin());
    this.assignments = this.loadLocal('zatca.rbac.assignments', this.seedAssignments());
    this.matrix = this.loadLocal('zatca.rbac.matrix', this.seedMatrix());
    this.pageAccess = this.loadLocal('zatca.rbac.pages', this.seedPages());
    this.hibernateModules = this.loadLocal('zatca.rbac.hibernate', this.seedHibernate());
    this.loadUsers();
  }

  selectTab(id: RbacTab) {
    this.tab.set(id);
    this.clearBanners();
  }

  openHelp(id: RbacTab, event?: Event) {
    event?.stopPropagation();
    this.tab.set(id);
    this.helpTopic.set(RBAC_HELP[id as RbacHelpTab]);
    this.showHelp.set(true);
  }

  filteredUsers() {
    const q = this.searchQuery.toLowerCase();
    return this.users().filter(u => {
      const match = !q || u.email.toLowerCase().includes(q);
      const roleOk = this.roleFilter === 'All' || u.role === this.roleFilter;
      return match && roleOk;
    });
  }

  displayRole(role?: string) {
    if (role === 'TENANT_ADMIN') return 'ADMIN';
    return role || 'TENANT_USER';
  }

  displayName(email: string) {
    const local = email.split('@')[0] || email;
    return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  loadUsers() {
    this.isLoading.set(true);
    this.api.getUsers().subscribe({
      next: res => {
        this.users.set(res.users || []);
        this.isLoading.set(false);
        this.syncLoginFromUsers();
        this.syncAssignmentsFromUsers();
      },
      error: err => {
        this.isLoading.set(false);
        this.bannerError.set(err.error?.message || 'Failed to load users.');
      }
    });
  }

  openUser(user?: UserItem) {
    this.editingId = user?.id || null;
    this.formEmail = user?.email || '';
    this.formPassword = '';
    this.formRole = user?.role || 'TENANT_USER';
    this.showUserDialog.set(true);
  }

  saveUser() {
    if (!this.formEmail.trim() || (!this.editingId && !this.formPassword)) {
      this.bannerError.set('Email and password are required for new users.');
      return;
    }
    const payload: { email: string; role: string; password?: string } = {
      email: this.formEmail.trim(),
      role: this.formRole
    };
    if (this.formPassword) payload.password = this.formPassword;
    const req = this.editingId
      ? this.api.updateUser(this.editingId, payload)
      : this.api.createUser({ email: payload.email, password: this.formPassword, role: payload.role });
    req.subscribe({
      next: () => {
        this.showUserDialog.set(false);
        this.flash('User saved.');
        this.loadUsers();
      },
      error: err => this.bannerError.set(err.error?.message || 'Failed to save user.')
    });
  }

  removeUser(user: UserItem) {
    if (!confirm(`Delete ${user.email}?`)) return;
    this.api.deleteUser(user.id).subscribe({
      next: () => {
        this.flash('Deleted user.');
        this.loadUsers();
      },
      error: err => this.bannerError.set(err.error?.message || 'Cannot delete this user.')
    });
  }

  openDelegate(row?: DelegateRecord) {
    this.delegateForm = row ? { ...row } : this.emptyDelegate();
    this.showDelegateDialog.set(true);
  }

  saveDelegate() {
    if (!this.delegateForm.fromEmail || !this.delegateForm.toEmail || !this.delegateForm.startsAt || !this.delegateForm.endsAt) {
      this.bannerError.set('Delegator, delegatee, and dates are required.');
      return;
    }
    const idx = this.delegates.findIndex(d => d.id === this.delegateForm.id);
    const next = { ...this.delegateForm, status: this.computeDelegateStatus(this.delegateForm) };
    if (idx >= 0) this.delegates[idx] = next;
    else this.delegates = [next, ...this.delegates];
    this.persist('zatca.rbac.delegates', this.delegates);
    this.showDelegateDialog.set(false);
    this.flash('Delegation saved locally.');
  }

  revokeDelegate(row: DelegateRecord) {
    row.status = 'Revoked';
    this.persist('zatca.rbac.delegates', this.delegates);
    this.flash(`Revoked delegation for ${row.toEmail}.`);
  }

  toggleLogin(profile: LoginProfile) {
    profile.canLogin = !profile.canLogin;
    if (!profile.canLogin) profile.locked = true;
    this.persist('zatca.rbac.login', this.loginProfiles);
  }

  toggleLock(profile: LoginProfile) {
    profile.locked = !profile.locked;
    if (profile.locked) profile.canLogin = false;
    this.persist('zatca.rbac.login', this.loginProfiles);
  }

  toggleMfa(profile: LoginProfile) {
    profile.mfa = !profile.mfa;
    this.persist('zatca.rbac.login', this.loginProfiles);
  }

  changePassword() {
    if (!this.passwordUser) {
      this.bannerError.set('Select a user.');
      return;
    }
    if (!this.newPassword || this.newPassword.length < 8) {
      this.bannerError.set('Password must be at least 8 characters.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.bannerError.set('New password and confirmation do not match.');
      return;
    }
    const user = this.users().find(u => u.email === this.passwordUser || u.id === this.passwordUser);
    if (!user) {
      this.bannerError.set('Selected user was not found.');
      return;
    }
    this.api.updateUser(user.id, { password: this.newPassword }).subscribe({
      next: () => {
        this.newPassword = '';
        this.confirmPassword = '';
        this.flash(`Password updated for ${user.email}.`);
      },
      error: err => this.bannerError.set(err.error?.message || 'Failed to change password.')
    });
  }

  perm(module: string, action: string): boolean {
    const roleMatrix = this.matrix[this.selectedRole];
    if (!roleMatrix) return this.selectedRole === 'Sys Admin' || this.selectedRole === 'Mgmt (DG)';
    return !!roleMatrix[module]?.[action];
  }

  toggle(module: string, action: string) {
    if (!this.matrix[this.selectedRole]) this.matrix[this.selectedRole] = {};
    if (!this.matrix[this.selectedRole][module]) {
      this.matrix[this.selectedRole][module] = { C: false, R: false, U: false, A: false, P: false };
    }
    this.matrix[this.selectedRole][module][action] = !this.perm(module, action);
    this.persist('zatca.rbac.matrix', this.matrix);
  }

  onRoleChange() {
    if (!this.matrix[this.selectedRole]) {
      this.matrix[this.selectedRole] = {};
      for (const module of this.modules) {
        this.matrix[this.selectedRole][module] = { C: false, R: true, U: false, A: false, P: false };
      }
      this.persist('zatca.rbac.matrix', this.matrix);
    }
  }

  applyPreset(preset: 'MAKER' | 'CHECKER' | 'APPROVER' | 'AUDITOR') {
    if (!this.matrix[this.selectedRole]) this.matrix[this.selectedRole] = {};
    for (const module of this.modules) {
      const current = this.matrix[this.selectedRole][module] || { C: false, R: false, U: false, A: false, P: false };
      if (preset === 'MAKER') Object.assign(current, { C: true, R: true, U: true, A: false, P: false });
      if (preset === 'CHECKER') Object.assign(current, { C: false, R: true, U: true, A: true, P: false });
      if (preset === 'APPROVER') Object.assign(current, { C: false, R: true, U: false, A: true, P: true });
      if (preset === 'AUDITOR') Object.assign(current, { C: false, R: true, U: false, A: false, P: false });
      this.matrix[this.selectedRole][module] = current;
    }
    this.persist('zatca.rbac.matrix', this.matrix);
    this.flash(`Applied ${preset} preset for ${this.selectedRole}.`);
  }

  savePolicy() {
    this.persist('zatca.rbac.matrix', this.matrix);
    this.persist('zatca.rbac.pages', this.pageAccess);
    this.flash('RBAC menu permission policy saved and applied across sessions.');
  }

  assignRole(row: RoleAssignment, role: string) {
    row.role = role;
    this.persist('zatca.rbac.assignments', this.assignments);
    const apiUser = this.users().find(u => u.email === row.email);
    if (apiUser && this.apiRoles.includes(role)) {
      this.api.updateUser(apiUser.id, { role }).subscribe({
        next: () => this.flash(`Updated ${row.email} role to ${role}.`),
        error: () => this.flash(`Stored ${row.email} as ${role} locally (API role not updated).`)
      });
      return;
    }
    this.flash(`Updated ${row.email} role to ${role}.`);
  }

  togglePage(row: PageAccess, field: 'view' | 'create' | 'edit') {
    row[field] = !row[field];
    if (field === 'view' && !row.view) {
      row.create = false;
      row.edit = false;
    }
    this.persist('zatca.rbac.pages', this.pageAccess);
  }

  toggleHibernate(mod: HibernateModule) {
    mod.hibernated = !mod.hibernated;
    this.persist('zatca.rbac.hibernate', this.hibernateModules);
    this.flash(mod.hibernated ? `${mod.name} hibernated.` : `${mod.name} reactivated.`);
  }

  hibernatedCount() {
    return this.hibernateModules.filter(m => m.hibernated).length;
  }

  statusClass(status: string) {
    if (status === 'Active') return 'active';
    if (status === 'Revoked' || status === 'Expired' || status === 'Locked') return 'inactive';
    return '';
  }

  private emptyDelegate(): DelegateRecord {
    const today = new Date().toISOString().slice(0, 10);
    return {
      id: crypto.randomUUID(),
      fromEmail: '',
      toEmail: '',
      startsAt: today,
      endsAt: today,
      scope: 'All modules',
      status: 'Scheduled'
    };
  }

  private computeDelegateStatus(row: DelegateRecord): DelegateRecord['status'] {
    if (row.status === 'Revoked') return 'Revoked';
    const today = new Date().toISOString().slice(0, 10);
    if (row.endsAt < today) return 'Expired';
    if (row.startsAt > today) return 'Scheduled';
    return 'Active';
  }

  private syncLoginFromUsers() {
    const existing = new Map(this.loginProfiles.map(p => [p.email, p]));
    for (const user of this.users()) {
      if (!existing.has(user.email)) {
        this.loginProfiles.push({
          email: user.email,
          displayName: this.displayName(user.email),
          canLogin: true,
          locked: false,
          lastLogin: 'Never',
          mfa: false
        });
      }
    }
    this.persist('zatca.rbac.login', this.loginProfiles);
  }

  private syncAssignmentsFromUsers() {
    const existing = new Set(this.assignments.map(a => a.email));
    for (const user of this.users()) {
      if (!existing.has(user.email)) {
        this.assignments.push({
          email: user.email,
          name: this.displayName(user.email),
          role: user.role || 'TENANT_USER'
        });
      }
    }
    this.persist('zatca.rbac.assignments', this.assignments);
  }

  private seedDelegates(): DelegateRecord[] {
    return [
      {
        id: 'dlg-1',
        fromEmail: 'approver-1@shaplamart.com',
        toEmail: 'checker-1@shaplamart.com',
        startsAt: '2026-10-18',
        endsAt: '2026-10-31',
        scope: 'Vouchers & Approvals',
        status: 'Active'
      },
      {
        id: 'dlg-2',
        fromEmail: 'accounts@shaplamart.com',
        toEmail: 'maker-1@shaplamart.com',
        startsAt: '2026-11-01',
        endsAt: '2026-11-15',
        scope: 'POS Checkout',
        status: 'Scheduled'
      }
    ];
  }

  private seedLogin(): LoginProfile[] {
    return [
      { email: 'accounts@shaplamart.com', displayName: 'Finance Lead', canLogin: true, locked: false, lastLogin: '2026-10-19 09:12', mfa: true },
      { email: 'maker-1@shaplamart.com', displayName: 'Voucher Data Entry Officer', canLogin: true, locked: false, lastLogin: '2026-10-19 08:41', mfa: false },
      { email: 'checker-1@shaplamart.com', displayName: 'Accounting Verification Officer', canLogin: true, locked: false, lastLogin: '2026-10-18 17:02', mfa: true },
      { email: 'approver-1@shaplamart.com', displayName: 'CFO & Financial Approver', canLogin: true, locked: false, lastLogin: '2026-10-19 07:55', mfa: true },
      { email: 'cashier-1@shaplamart.com', displayName: 'POS Cashier', canLogin: true, locked: false, lastLogin: '2026-10-19 10:04', mfa: false }
    ];
  }

  private seedAssignments(): RoleAssignment[] {
    return [
      { email: 'accounts@shaplamart.com', name: 'Finance Lead (Shapla Supermarket)', role: 'TENANT_ADMIN' },
      { email: 'maker-1@shaplamart.com', name: 'Voucher Data Entry Officer', role: 'MAKER' },
      { email: 'checker-1@shaplamart.com', name: 'Accounting Verification Officer', role: 'CHECKER' },
      { email: 'approver-1@shaplamart.com', name: 'CFO & Financial Approver', role: 'APPROVER' },
      { email: 'auditor-1@shaplamart.com', name: 'Internal Compliance Auditor', role: 'INTERNAL_AUDITOR' },
      { email: 'cashier-1@shaplamart.com', name: 'Dhanmondi POS Cashier', role: 'TENANT_USER' }
    ];
  }

  private seedMatrix(): Record<string, Record<string, Record<string, boolean>>> {
    return {
      MAKER: {
        'Vouchers & General Ledger (PV, RV, JV, CV)': { C: true, R: true, U: true, A: false, P: false },
        'Chart of Accounts & Mappings': { C: false, R: true, U: false, A: false, P: false },
        'POS Checkout & Sales Invoices': { C: true, R: true, U: true, A: false, P: false },
        'Purchases & Vendor Bills': { C: true, R: true, U: true, A: false, P: false },
        'Inventory Stock Management': { C: false, R: true, U: false, A: false, P: false },
        'HR & Payroll Management': { C: true, R: true, U: false, A: false, P: false },
        'Financial Years & Period Lock': { C: false, R: true, U: false, A: false, P: false },
        'Financial Reports & Auditor Portal': { C: false, R: true, U: false, A: false, P: false }
      },
      CHECKER: {
        'Vouchers & General Ledger (PV, RV, JV, CV)': { C: false, R: true, U: true, A: true, P: false },
        'Chart of Accounts & Mappings': { C: false, R: true, U: false, A: false, P: false },
        'POS Checkout & Sales Invoices': { C: false, R: true, U: false, A: true, P: false },
        'Purchases & Vendor Bills': { C: false, R: true, U: true, A: true, P: false },
        'Inventory Stock Management': { C: false, R: true, U: false, A: false, P: false },
        'HR & Payroll Management': { C: false, R: true, U: true, A: true, P: false },
        'Financial Years & Period Lock': { C: false, R: true, U: false, A: false, P: false },
        'Financial Reports & Auditor Portal': { C: false, R: true, U: false, A: false, P: false }
      },
      APPROVER: {
        'Vouchers & General Ledger (PV, RV, JV, CV)': { C: false, R: true, U: false, A: true, P: true },
        'Chart of Accounts & Mappings': { C: true, R: true, U: true, A: true, P: true },
        'POS Checkout & Sales Invoices': { C: false, R: true, U: false, A: true, P: true },
        'Purchases & Vendor Bills': { C: false, R: true, U: false, A: true, P: true },
        'Inventory Stock Management': { C: true, R: true, U: true, A: true, P: true },
        'HR & Payroll Management': { C: false, R: true, U: false, A: true, P: true },
        'Financial Years & Period Lock': { C: false, R: true, U: false, A: true, P: true },
        'Financial Reports & Auditor Portal': { C: false, R: true, U: false, A: true, P: true }
      }
    };
  }

  private seedPages(): PageAccess[] {
    return [
      { group: 'Main', page: 'Executive Dashboard', route: '/dashboard', view: true, create: false, edit: false },
      { group: 'Sales & POS', page: 'POS Register Terminal', route: '/pos/terminal', view: true, create: true, edit: true },
      { group: 'Sales & POS', page: 'Sales Tax Invoices', route: '/invoices', view: true, create: true, edit: true },
      { group: 'Inventory', page: 'Products & Master Catalog', route: '/inventory', view: true, create: true, edit: true },
      { group: 'Procurement', page: 'Purchase Bills & Invoices', route: '/purchases', view: true, create: true, edit: false },
      { group: 'Accounts', page: 'Vouchers', route: '/accounting/vouchers', view: true, create: true, edit: true },
      { group: 'Accounts', page: 'Voucher Approval Center', route: '/accounting/voucher-approval', view: true, create: false, edit: true },
      { group: 'HR', page: 'Employee Directory', route: '/hr/employees', view: true, create: true, edit: true },
      { group: 'HR', page: 'Payroll Engine & Slips', route: '/hr/payroll', view: true, create: false, edit: false },
      { group: 'Settings', page: 'Tenant General Settings', route: '/settings', view: true, create: false, edit: true },
      { group: 'Settings', page: 'RBAC & Menu Permissions', route: '/settings/rbac', view: true, create: false, edit: true }
    ];
  }

  private seedHibernate(): HibernateModule[] {
    return [
      { key: 'main', name: 'Main / Analytics', description: 'Dashboard, insights, and AI copilot menus.', hibernated: false },
      { key: 'sales', name: 'Sales & POS', description: 'POS terminal, invoices, customers, and KDS.', hibernated: false },
      { key: 'inventory', name: 'Inventory & Stock', description: 'Catalog, transfers, categories, and labels.', hibernated: false },
      { key: 'purchasing', name: 'Procurement', description: 'Purchase bills and supplier directory.', hibernated: false },
      { key: 'accounting', name: 'Accounts & Finance', description: 'COA, vouchers, ledger, cheques, and reports.', hibernated: false },
      { key: 'hr', name: 'Human Resource', description: 'Employees, attendance, payroll, loans, and EOSB.', hibernated: false },
      { key: 'communication', name: 'Communication', description: 'WhatsApp messaging and integrations.', hibernated: false },
      { key: 'settings', name: 'System Administration', description: 'Tenant, branches, cost centers, and policies.', hibernated: false }
    ];
  }

  private flash(message: string) {
    this.bannerSuccess.set(message);
    this.bannerError.set(null);
  }

  private clearBanners() {
    this.bannerError.set(null);
    this.bannerSuccess.set(null);
  }

  private loadLocal<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : fallback;
    } catch {
      return fallback;
    }
  }

  private persist(key: string, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
