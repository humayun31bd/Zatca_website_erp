import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';

export interface RecentActivityItem {
  id: string;
  invoiceNumber: string;
  buyerName: string;
  totalAmount: number;
  totalVatAmount?: number;
  zatcaStatus: 'CLEARED' | 'REPORTED' | 'PENDING' | 'FAILED' | string;
  issueDatetime: string;
  zatcaQrBase64?: string;
}

export interface DashboardStats {
  totalRevenue: number;
  invoicesCleared: number;
  overdueAmount: number;
  totalCashOnHand: number;
  isZatcaHealthy: boolean;
  recentActivity: RecentActivityItem[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = `${API_ENDPOINTS.baseUrl}/dashboard/stats`;

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(this.apiUrl).pipe(
      catchError(() => of(this.getFallbackStats()))
    );
  }

  private getFallbackStats(): DashboardStats {
    return {
      totalRevenue: 128450.00,
      invoicesCleared: 18,
      overdueAmount: 8200.00,
      totalCashOnHand: 94650.00,
      isZatcaHealthy: true,
      recentActivity: [
        {
          id: '1',
          invoiceNumber: 'INV-2026-001',
          buyerName: 'Al-Madina Trading Ltd',
          totalAmount: 14500.00,
          totalVatAmount: 2175.00,
          zatcaStatus: 'CLEARED',
          issueDatetime: new Date().toISOString()
        },
        {
          id: '2',
          invoiceNumber: 'INV-2026-002',
          buyerName: 'Riyadh Tech Solutions',
          totalAmount: 3200.00,
          totalVatAmount: 480.00,
          zatcaStatus: 'REPORTED',
          issueDatetime: new Date(Date.now() - 3600000 * 4).toISOString()
        },
        {
          id: '3',
          invoiceNumber: 'INV-2026-003',
          buyerName: 'Gulf Star Logistics Corp',
          totalAmount: 9800.50,
          totalVatAmount: 1470.08,
          zatcaStatus: 'CLEARED',
          issueDatetime: new Date(Date.now() - 3600000 * 12).toISOString()
        },
        {
          id: '4',
          invoiceNumber: 'INV-2026-004',
          buyerName: 'Arabian Builders Corp',
          totalAmount: 22400.00,
          totalVatAmount: 3360.00,
          zatcaStatus: 'PENDING',
          issueDatetime: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
          id: '5',
          invoiceNumber: 'INV-2026-005',
          buyerName: 'Eastern Petrochem Industry',
          totalAmount: 5600.00,
          totalVatAmount: 840.00,
          zatcaStatus: 'CLEARED',
          issueDatetime: new Date(Date.now() - 3600000 * 48).toISOString()
        }
      ]
    };
  }
}
