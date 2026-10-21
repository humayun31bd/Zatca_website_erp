import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ClientWebsite {
  id: string;
  tenantId?: string;
  clientId?: string | null;
  domainName: string;
  appType: string;
  appPort?: number | null;
  documentRoot?: string | null;
  phpVersion?: string | null;
  status: string;
  sslActive: boolean;
  createdAt?: string | number | Date | null;
  updatedAt?: string | number | Date | null;
}

export interface ClientWebsitesResponse {
  success: boolean;
  data?: ClientWebsite[];
  error?: string;
}

export interface ProvisionWebsitePayload {
  domainName: string;
  appType: string;
  appPort?: string | number | null;
  documentRoot?: string | null;
  phpVersion?: string | null;
}

export interface HealthCheckResponse {
  success: boolean;
  summary?: { total: number; active: number; offline: number };
  data?: Array<{
    id: string;
    domainName: string;
    status: string;
    statusCode: number | null;
    responseTimeMs: number | null;
    sslActive: boolean;
    lastChecked: string;
  }>;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ClientWebsitesService {
  private http = inject(HttpClient);
  private url = '/api/settings/client-websites';

  list(): Observable<ClientWebsitesResponse> {
    return this.http.get<ClientWebsitesResponse>(this.url);
  }

  provision(payload: ProvisionWebsitePayload): Observable<{ success: boolean; data?: ClientWebsite; error?: string }> {
    return this.http.post<{ success: boolean; data?: ClientWebsite; error?: string }>(this.url, payload);
  }

  healthCheck(): Observable<HealthCheckResponse> {
    return this.http.get<HealthCheckResponse>(`${this.url}/health-check`);
  }
}
