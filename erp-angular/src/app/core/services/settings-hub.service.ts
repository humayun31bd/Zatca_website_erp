import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SmtpSettings {
  enabled?: boolean;
  host?: string;
  port?: number;
  secure?: boolean;
  requireTls?: boolean;
  username?: string;
  password?: string;
  isPasswordSet?: boolean;
  fromName?: string;
  fromEmail?: string;
}

export interface TaxCategory {
  id: string;
  categoryName?: string;
  name?: string;
  taxRate?: number;
  rate?: number | string;
  type?: string;
}

export interface BranchItem {
  id: string;
  name: string;
  address?: string | null;
  isMainBranch?: boolean;
}

export interface WarehouseItem {
  id: string;
  name: string;
  location?: string | null;
  branchId: string;
  isActive?: boolean;
}

export interface CounterItem {
  id: string;
  name: string;
  branchId: string;
  branchName?: string;
  isActive?: boolean;
}

export interface UserItem {
  id: string;
  email: string;
  role?: string;
  tenantId?: string;
  createdAt?: string;
}

export interface CostCenterItem {
  id: string;
  code?: string;
  name: string;
  sourceType?: string;
  category?: string | null;
  monthlyBudget?: number;
  isActive?: boolean;
}

export interface VoucherPolicy {
  requireCashierApproval?: boolean;
  posVoucherControl?: string;
  directPostSystemVouchers?: boolean;
  numberingFormula?: string;
  resetPeriod?: string;
  pvCode?: string;
  rvCode?: string;
  cvCode?: string;
  jvCode?: string;
  seqPadding?: number;
}

export interface FinancialPeriodItem {
  id: string;
  periodNumber?: number;
  periodName?: string;
  startDate?: string;
  endDate?: string;
  fromDate?: string;
  toDate?: string;
  isLocked?: boolean;
}

export interface FinancialYearItem {
  id: string;
  name?: string;
  yearName?: string;
  fromDate?: string;
  toDate?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  isClosed?: boolean;
  periods?: FinancialPeriodItem[];
}

export interface PurchaseFlowSettings {
  success?: boolean;
  businessType?: string;
  purchaseFlowType?: string;
}

export interface ProductPolicyResponse {
  businessType?: string;
  productPolicy?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class SettingsHubService {
  private http = inject(HttpClient);

  getSmtp(): Observable<{ success: boolean; smtpSettings: SmtpSettings }> {
    return this.http.get<{ success: boolean; smtpSettings: SmtpSettings }>('/settings/smtp');
  }

  saveSmtp(smtpSettings: SmtpSettings): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>('/settings/smtp', { smtpSettings });
  }

  testSmtp(testEmail: string, smtpSettings: SmtpSettings): Observable<{ success: boolean; message?: string; error?: string }> {
    return this.http.post<{ success: boolean; message?: string; error?: string }>('/settings/smtp/test', {
      testEmail,
      smtpSettings
    });
  }

  getTaxes(): Observable<{ success: boolean; taxes: TaxCategory[] }> {
    return this.http.get<{ success: boolean; taxes: TaxCategory[] }>('/settings/taxes');
  }

  createTax(payload: { categoryName: string; taxRate: number }): Observable<{ success: boolean; tax: TaxCategory }> {
    return this.http.post<{ success: boolean; tax: TaxCategory }>('/settings/taxes', payload);
  }

  getBranches(): Observable<{ success: boolean; branches: BranchItem[] }> {
    return this.http.get<{ success: boolean; branches: BranchItem[] }>('/settings/branches');
  }

  createBranch(payload: Partial<BranchItem>): Observable<{ success: boolean; branch: BranchItem }> {
    return this.http.post<{ success: boolean; branch: BranchItem }>('/settings/branches', payload);
  }

  updateBranch(id: string, payload: Partial<BranchItem>): Observable<{ success: boolean; branch: BranchItem }> {
    return this.http.put<{ success: boolean; branch: BranchItem }>(`/settings/branches/${id}`, payload);
  }

  deleteBranch(id: string): Observable<{ success: boolean; error?: string }> {
    return this.http.delete<{ success: boolean; error?: string }>(`/settings/branches/${id}`);
  }

  getWarehouses(): Observable<{ success: boolean; warehouses: WarehouseItem[] }> {
    return this.http.get<{ success: boolean; warehouses: WarehouseItem[] }>('/warehouses');
  }

  createWarehouse(payload: Partial<WarehouseItem>): Observable<{ success: boolean; warehouse: WarehouseItem }> {
    return this.http.post<{ success: boolean; warehouse: WarehouseItem }>('/warehouses', payload);
  }

  updateWarehouse(id: string, payload: Partial<WarehouseItem>): Observable<{ success: boolean; warehouse: WarehouseItem }> {
    return this.http.put<{ success: boolean; warehouse: WarehouseItem }>(`/warehouses/${id}`, payload);
  }

  deleteWarehouse(id: string): Observable<{ success: boolean; error?: string }> {
    return this.http.delete<{ success: boolean; error?: string }>(`/warehouses/${id}`);
  }

  getCounters(): Observable<{ success: boolean; counters: CounterItem[] }> {
    return this.http.get<{ success: boolean; counters: CounterItem[] }>('/counters');
  }

  createCounter(payload: Partial<CounterItem>): Observable<{ success: boolean; counter: CounterItem }> {
    return this.http.post<{ success: boolean; counter: CounterItem }>('/counters', payload);
  }

  updateCounter(id: string, payload: Partial<CounterItem>): Observable<{ success: boolean; counter: CounterItem }> {
    return this.http.put<{ success: boolean; counter: CounterItem }>(`/counters/${id}`, payload);
  }

  deleteCounter(id: string): Observable<{ success: boolean; error?: string }> {
    return this.http.delete<{ success: boolean; error?: string }>(`/counters/${id}`);
  }

  getUsers(): Observable<{ success: boolean; users: UserItem[] }> {
    return this.http.get<{ success: boolean; users: UserItem[] }>('/users');
  }

  createUser(payload: { email: string; password: string; role?: string }): Observable<{ success: boolean; user: UserItem }> {
    return this.http.post<{ success: boolean; user: UserItem }>('/users', payload);
  }

  updateUser(id: string, payload: { email?: string; role?: string; password?: string }): Observable<{ success: boolean; user: UserItem }> {
    return this.http.put<{ success: boolean; user: UserItem }>(`/users/${id}`, payload);
  }

  deleteUser(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`/users/${id}`);
  }

  getCostCenters(sourceType?: string): Observable<{ success: boolean; costCenters: CostCenterItem[] }> {
    const qs = sourceType && sourceType !== 'ALL' ? `?sourceType=${encodeURIComponent(sourceType)}` : '';
    return this.http.get<{ success: boolean; costCenters: CostCenterItem[] }>(`/accounting/cost-centers${qs}`);
  }

  createCostCenter(payload: Partial<CostCenterItem>): Observable<{ success: boolean; costCenter: CostCenterItem }> {
    return this.http.post<{ success: boolean; costCenter: CostCenterItem }>('/accounting/cost-centers', payload);
  }

  updateCostCenter(payload: Partial<CostCenterItem> & { id: string }): Observable<{ success: boolean; costCenter: CostCenterItem }> {
    return this.http.put<{ success: boolean; costCenter: CostCenterItem }>('/accounting/cost-centers', payload);
  }

  deleteCostCenter(id: string): Observable<{ success: boolean; error?: string }> {
    return this.http.delete<{ success: boolean; error?: string }>(`/accounting/cost-centers?id=${encodeURIComponent(id)}`);
  }

  syncCostCenters(): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>('/accounting/cost-centers/sync', {});
  }

  getVoucherPolicy(): Observable<{ success: boolean; policy: VoucherPolicy }> {
    return this.http.get<{ success: boolean; policy: VoucherPolicy }>('/accounting/voucher-policy');
  }

  saveVoucherPolicy(payload: VoucherPolicy): Observable<{ success: boolean; policy: VoucherPolicy }> {
    return this.http.post<{ success: boolean; policy: VoucherPolicy }>('/accounting/voucher-policy', payload);
  }

  getFinancialYears(): Observable<{ success: boolean; financialYears: FinancialYearItem[] }> {
    return this.http.get<{ success: boolean; financialYears: FinancialYearItem[] }>('/accounting/financial-years');
  }

  createFinancialYear(payload: { name: string; fromDate: string; toDate: string; isActive?: boolean }): Observable<{ success: boolean; financialYear: FinancialYearItem }> {
    return this.http.post<{ success: boolean; financialYear: FinancialYearItem }>('/accounting/financial-years', payload);
  }

  lockFinancialPeriod(periodId: string, isLocked: boolean): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>('/accounts/periods/lock', { periodId, isLocked });
  }

  getPurchaseFlow(): Observable<PurchaseFlowSettings> {
    return this.http.get<PurchaseFlowSettings>('/settings/purchase-flow');
  }

  savePurchaseFlow(payload: { businessType: string; purchaseFlowType: string }): Observable<PurchaseFlowSettings> {
    return this.http.put<PurchaseFlowSettings>('/settings/purchase-flow', payload);
  }

  getProductPolicy(): Observable<ProductPolicyResponse> {
    return this.http.get<ProductPolicyResponse>('/settings/product-policy');
  }

  saveProductPolicy(payload: { businessType: string; productPolicy: Record<string, unknown> }): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>('/settings/product-policy', payload);
  }

  getTranslations(): Observable<Record<string, { en: string; ar: string }>> {
    return this.http.get<Record<string, { en: string; ar: string }>>('/settings/translations');
  }

  saveTranslation(payload: { key: string; en: string; ar: string }): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>('/settings/translations', payload);
  }
}
