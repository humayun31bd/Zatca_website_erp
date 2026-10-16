import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Supplier, SupplierPayload } from '../models/parties.models';

@Injectable({
  providedIn: 'root'
})
export class SuppliersService {
  private http = inject(HttpClient);

  getSuppliers(): Observable<Supplier[]> {
    return this.http.get<Supplier[]>('/suppliers');
  }

  createSupplier(payload: SupplierPayload): Observable<Supplier> {
    return this.http.post<Supplier>('/suppliers', payload);
  }

  updateSupplier(id: string, payload: Partial<SupplierPayload>): Observable<Supplier> {
    return this.http.put<Supplier>(`/suppliers/${id}`, payload);
  }

  deleteSupplier(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`/suppliers/${id}`);
  }
}
