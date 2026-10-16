import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { Invoice, CreateInvoicePayload } from '../models/invoice.models';

@Injectable({
  providedIn: 'root'
})
export class InvoicesService {
  private http = inject(HttpClient);

  getInvoices(clientId?: string): Observable<Invoice[]> {
    const url = clientId ? `/invoices?clientId=${clientId}` : '/invoices';
    return this.http.get<any>(url).pipe(
      map(res => {
        let list: Invoice[] = [];
        if (Array.isArray(res)) {
          list = res;
        } else if (res && Array.isArray(res.invoices)) {
          list = res.invoices;
        } else if (res && Array.isArray(res.data)) {
          list = res.data;
        }
        return list;
      }),
      catchError(err => {
        console.error('Failed to fetch invoices from backend:', err);
        return of([]);
      })
    );
  }

  getInvoiceById(id: string): Observable<Invoice> {
    return this.http.get<any>(`/invoices/${id}`).pipe(
      map(res => {
        if (res && res.invoice) return res.invoice;
        return res;
      })
    );
  }

  createInvoice(payload: CreateInvoicePayload): Observable<any> {
    return this.http.post<any>('/invoices', payload);
  }
}
