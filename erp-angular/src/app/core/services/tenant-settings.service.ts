import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TenantInfo {
  id?: string;
  name?: string;
  vatNumber?: string;
  email?: string;
  subdomain?: string;
  logoUrl?: string | null;
  status?: string;
  whatsappNumber?: string | null;
  address?: string | null;
  countryCode?: string | null;
  currencyCode?: string | null;
  currencySymbol?: string | null;
  taxRate?: number | null;
  taxType?: string | null;
  timezone?: string | null;
  dateFormat?: string | null;
  decimalPlaces?: number | null;
  marketingPlan?: string | null;
  businessType?: string | null;
  code?: string | null;
  phone?: string | null;
}

export interface TenantInfoResponse {
  success: boolean;
  tenant: TenantInfo | null;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class TenantSettingsService {
  private http = inject(HttpClient);
  private url = '/settings/tenant';

  getTenant(): Observable<TenantInfoResponse> {
    return this.http.get<TenantInfoResponse>(this.url);
  }

  updateTenant(payload: Partial<TenantInfo>): Observable<TenantInfoResponse> {
    return this.http.put<TenantInfoResponse>(this.url, payload);
  }
}
