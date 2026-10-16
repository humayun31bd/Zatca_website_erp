import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { Client, ClientPayload } from '../models/parties.models';

@Injectable({
  providedIn: 'root'
})
export class ClientsService {
  private http = inject(HttpClient);

  getClients(): Observable<Client[]> {
    return this.http.get<any>('/clients').pipe(
      map(res => {
        let list: Client[] = [];
        if (Array.isArray(res)) {
          list = res;
        } else if (res && Array.isArray(res.clients)) {
          list = res.clients;
        } else if (res && Array.isArray(res.data)) {
          list = res.data;
        }

        return list.map(c => ({
          ...c,
          customerType: (c.customerType === 'newCustomer' || !c.customerType) ? 'BUSINESS' : c.customerType,
          city: c.city || 'Riyadh',
          country: c.country || 'Saudi Arabia',
          dues: Number(c.dues) || 0,
          funds: Number(c.funds) || 0
        }));
      }),
      catchError(err => {
        console.error('Failed to fetch clients from backend:', err);
        return of([]);
      })
    );
  }

  getClientById(id: string): Observable<Client> {
    return this.http.get<Client>(`/clients/${id}`);
  }

  createClient(payload: ClientPayload): Observable<Client> {
    return this.http.post<Client>('/clients', payload);
  }

  updateClient(id: string, payload: Partial<ClientPayload>): Observable<Client> {
    return this.http.put<Client>(`/clients/${id}`, payload);
  }

  deleteClient(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`/clients/${id}`);
  }
}
