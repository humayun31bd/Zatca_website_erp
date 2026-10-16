import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { SupplierBill, Supplier, CreateBillPayload } from '../models/purchases.models';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  bills?: T;
  suppliers?: T;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PurchasesService {
  private http = inject(HttpClient);

  getBills(): Observable<SupplierBill[]> {
    return this.http.get<ApiResponse<SupplierBill[]>>('/procurement/bills').pipe(
      map(res => res.data || res.bills || [])
    );
  }

  createBill(payload: CreateBillPayload): Observable<any> {
    return this.http.post<ApiResponse<any>>('/procurement/bills', payload);
  }

  getSuppliers(): Observable<Supplier[]> {
    return this.http.get<ApiResponse<Supplier[]>>('/suppliers').pipe(
      map(res => res.data || res.suppliers || [])
    );
  }
}
