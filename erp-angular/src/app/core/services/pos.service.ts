import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { PosProduct, CheckoutPayload, CheckoutResponse } from '../models/pos.models';

export interface CounterModel {
  id: string;
  name: string;
  branchId?: string;
  branchName?: string;
  isActive?: boolean;
}

export interface CounterSessionData {
  id: string;
  tenantId?: string;
  counterId: string;
  userId?: string;
  openingBalance: number;
  closingBalance?: number;
  cashSales?: number;
  transferAmount?: number;
  status: 'OPEN' | 'CLOSED';
  counter?: { name: string; branchName?: string };
  openedAt: string | Date;
  closedAt?: string | Date;
}

export interface TenantInfoResponse {
  success: boolean;
  tenant: {
    id: string;
    name: string;
    vatNumber: string;
    email?: string;
    logoUrl?: string;
    whatsappNumber?: string;
    businessType?: string | null;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PosService {
  private http = inject(HttpClient);
  private baseUrl = `${API_ENDPOINTS.baseUrl}/pos`;
  private countersUrl = `${API_ENDPOINTS.baseUrl}/counters`;
  private tenantUrl = `${API_ENDPOINTS.baseUrl}/settings/tenant`;

  getProducts(): Observable<PosProduct[]> {
    return this.http.get<PosProduct[]>(`${this.baseUrl}/products`);
  }

  checkout(payload: CheckoutPayload): Observable<CheckoutResponse> {
    return this.http.post<CheckoutResponse>(`${this.baseUrl}/checkout`, payload);
  }

  // Tenant / Organization Info
  getTenantInfo(): Observable<TenantInfoResponse> {
    return this.http.get<TenantInfoResponse>(this.tenantUrl);
  }

  // Counters & Register Terminals
  getCounters(): Observable<{ success: boolean; counters: CounterModel[] }> {
    return this.http.get<{ success: boolean; counters: CounterModel[] }>(this.countersUrl);
  }

  // Counter Session Lifecycle (Flutter CounterSessionApi)
  getCurrentSession(counterId: string): Observable<{ success: boolean; session: CounterSessionData | null }> {
    return this.http.get<{ success: boolean; session: CounterSessionData | null }>(`${this.countersUrl}/sessions?counterId=${counterId}`);
  }

  openSession(body: { counterId: string; openingBalance: number }): Observable<{ success: boolean; session: CounterSessionData }> {
    return this.http.post<{ success: boolean; session: CounterSessionData }>(`${this.countersUrl}/sessions`, body);
  }

  closeSession(body: { sessionId: string; transferAmount: number; cashSales: number }): Observable<{ success: boolean; session: CounterSessionData }> {
    return this.http.patch<{ success: boolean; session: CounterSessionData }>(`${this.countersUrl}/sessions`, body);
  }
}
