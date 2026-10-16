import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  tenantId: string;
}

export interface LoginResponse {
  success: boolean;
  accessToken: string;
  redirect?: string;
  error?: string;
}

const DEV_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiI0NzFkNDMyYi1lMmJlLTQ2NDUtODE1NS0xOTQ3OGI1YjE5NmYiLCJyb2xlIjoiVEVOQU5UX0FETUlOIiwiZW1haWwiOiJvd25lckBkZW1vLWNsaWVudC5jb20iLCJ0ZW5hbnRJZCI6IjMzNmVhZjgyLWE1MjQtNGIwYS05MzI2LTcxOTdiMWU1NDU5ZSIsImlhdCI6MTc5MTMzNTcwNiwiZXhwIjoyMTA2OTExNzA2fQ.sNeIKK1REq_KZ63Nkj1oJvxMx5FX50mCZFUk3LiLGZY';
const DEV_TENANT_ID = '336eaf82-a524-4b0a-9326-7197b1e5459e';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Reactive State via Signals
  readonly token = signal<string>(this.getStoredItem('erp_token') || DEV_TOKEN);
  readonly tenantId = signal<string>(this.getStoredItem('erp_tenant_id') || DEV_TENANT_ID);
  readonly currentUser = signal<UserProfile | null>(this.getStoredUser() || {
    id: '471d432b-e2be-4645-8155-19478b5b196f',
    email: 'owner@demo-client.com',
    role: 'TENANT_ADMIN',
    tenantId: DEV_TENANT_ID
  });

  readonly isAuthenticated = computed(() => !!this.token());

  private getStoredItem(key: string): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem(key);
    }
    return null;
  }

  private setStoredItem(key: string, value: string | null): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (value) {
        localStorage.setItem(key, value);
      } else {
        localStorage.removeItem(key);
      }
    }
  }

  private getStoredUser(): UserProfile | null {
    const raw = this.getStoredItem('erp_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  decodeJwt(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(API_ENDPOINTS.auth.login, credentials).pipe(
      tap(res => {
        if (res && res.accessToken) {
          const payload = this.decodeJwt(res.accessToken);
          const tenant = payload?.tenantId || DEV_TENANT_ID;
          const user: UserProfile = {
            id: payload?.userId || 'user-1',
            email: payload?.email || credentials.email,
            role: payload?.role || 'TENANT_ADMIN',
            tenantId: tenant
          };

          this.setSession(res.accessToken, tenant, user);
        }
      })
    );
  }

  setSession(token: string, tenantId: string, user: UserProfile): void {
    this.token.set(token);
    this.tenantId.set(tenantId);
    this.currentUser.set(user);
    this.setStoredItem('erp_token', token);
    this.setStoredItem('erp_tenant_id', tenantId);
    this.setStoredItem('erp_user', JSON.stringify(user));
  }

  setTenant(tenantId: string): void {
    this.tenantId.set(tenantId);
    this.setStoredItem('erp_tenant_id', tenantId);
  }

  logout(): void {
    this.token.set('');
    this.tenantId.set('');
    this.currentUser.set(null);
    this.setStoredItem('erp_token', null);
    this.setStoredItem('erp_tenant_id', null);
    this.setStoredItem('erp_user', null);
    this.router.navigate(['/auth/login']);
  }
}
