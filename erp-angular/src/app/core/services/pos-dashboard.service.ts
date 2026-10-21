import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

export interface TopProduct {
  productId: string;
  name: string;
  totalQuantitySold: number;
  totalRevenue: number;
}

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  stockQuantity: number;
  minStockLevel: number;
  price: number;
}

export interface RecentPosTransaction {
  id: string;
  invoiceNumber: string;
  buyerName: string;
  totalAmount: number;
  zatcaStatus: string;
  paymentStatus: string;
  paymentMethod?: string;
  issueDatetime: string;
  deliveryType?: string;
}

export interface PosDashboardData {
  totalRevenue: number;
  totalOrders: number;
  totalVat: number;
  totalDiscount: number;
  averageTicketSize: number;
  todayRevenue: number;
  todayOrders: number;
  topProducts: TopProduct[];
  lowStock: LowStockProduct[];
  recentTransactions: RecentPosTransaction[];
}

@Injectable({
  providedIn: 'root'
})
export class PosDashboardService {
  private http = inject(HttpClient);

  getDashboardData(startDate?: string, endDate?: string): Observable<PosDashboardData> {
    let url = '/pos/dashboard';
    const params: string[] = [];
    if (startDate) params.push(`startDate=${startDate}`);
    if (endDate) params.push(`endDate=${endDate}`);
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    return this.http.get<any>(url).pipe(
      map(res => this.normalize(res?.data || res)),
      catchError(err => {
        console.error('Failed to fetch POS Dashboard data', err);
        return of(this.getEmptyData());
      })
    );
  }

  private normalize(raw: Partial<PosDashboardData> | null | undefined): PosDashboardData {
    const empty = this.getEmptyData();
    if (!raw || typeof raw !== 'object') return empty;
    return {
      totalRevenue: Number(raw.totalRevenue) || 0,
      totalOrders: Number(raw.totalOrders) || 0,
      totalVat: Number(raw.totalVat) || 0,
      totalDiscount: Number(raw.totalDiscount) || 0,
      averageTicketSize: Number(raw.averageTicketSize) || 0,
      todayRevenue: Number(raw.todayRevenue) || 0,
      todayOrders: Number(raw.todayOrders) || 0,
      topProducts: Array.isArray(raw.topProducts) ? raw.topProducts : [],
      lowStock: Array.isArray(raw.lowStock) ? raw.lowStock : [],
      recentTransactions: Array.isArray(raw.recentTransactions) ? raw.recentTransactions : []
    };
  }

  private getEmptyData(): PosDashboardData {
    return {
      totalRevenue: 0,
      totalOrders: 0,
      totalVat: 0,
      totalDiscount: 0,
      averageTicketSize: 0,
      todayRevenue: 0,
      todayOrders: 0,
      topProducts: [],
      lowStock: [],
      recentTransactions: []
    };
  }
}
