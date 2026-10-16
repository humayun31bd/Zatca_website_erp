import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface DeliveryOrderItem {
  id?: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice?: number;
  price?: number;
  totalPrice?: number;
  sku?: string;
}

export interface NextStatusAction {
  label: string;
  labelAr: string;
  targetStatus: string;
  buttonClass: string;
}

export interface DeliveryOrder {
  id: string;
  tenantId?: string;
  orderNumber: string;
  invoiceId?: string | null;
  orderType: 'dine_in' | 'take_away' | 'delivery' | 'third_party_delivery' | string;
  channel: 'pos' | 'online' | 'third_party' | string;
  aggregator?: string | null;
  aggregatorReference?: string | null;
  status: 'WFC' | 'OUP' | 'RTS' | 'RFT' | 'RFD' | 'OOW' | 'TA' | 'Srvd' | 'Dlvd' | 'CANCELLED' | string;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  tableNumber?: string | null;
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  vehicleInfo?: string | null;
  deliveryFee: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  items: DeliveryOrderItem[];
  note?: string | null;
  estimatedTimeMinutes?: number;
  confirmedAt?: string | null;
  cookingStartedAt?: string | null;
  readyAt?: string | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  cancelledBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryDriver {
  id: string;
  tenantId?: string;
  name: string;
  phone: string;
  vehicleType: 'bike' | 'car' | 'van' | string;
  vehiclePlate?: string | null;
  isActive: boolean;
  isAvailable: boolean;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrdersResponse {
  success: boolean;
  orders: DeliveryOrder[];
  count: number;
}

export interface DriversResponse {
  success: boolean;
  drivers: DeliveryDriver[];
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class KdsService {
  private http = inject(HttpClient);
  private apiUrl = '/api/v1/orders/delivery';
  private driversUrl = '/api/v1/orders/drivers';

  private audioCtx: AudioContext | null = null;
  public soundEnabled = true;

  getOrders(filters?: {
    status?: string;
    channel?: string;
    orderType?: string;
    search?: string;
    limit?: number;
  }): Observable<OrdersResponse> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.channel) params = params.set('channel', filters.channel);
    if (filters?.orderType) params = params.set('orderType', filters.orderType);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit.toString());

    return this.http.get<OrdersResponse>(this.apiUrl, { params });
  }

  updateOrderStatus(
    orderId: string,
    targetStatus: string,
    extra?: { note?: string; podNotes?: string; actorRole?: string }
  ): Observable<{ success: boolean; order: DeliveryOrder }> {
    return this.http.patch<{ success: boolean; order: DeliveryOrder }>(
      `${this.apiUrl}/${orderId}/status`,
      {
        status: targetStatus,
        note: extra?.note,
        podNotes: extra?.podNotes,
        actorRole: extra?.actorRole || 'kitchen'
      }
    );
  }

  assignDriver(
    orderId: string,
    payload: {
      driverId?: string | null;
      driverName: string;
      driverPhone: string;
      vehicleInfo?: string | null;
      aggregatorReference?: string | null;
      riderTrackingNote?: string | null;
      autoDispatch?: boolean;
    }
  ): Observable<{ success: boolean; order: DeliveryOrder }> {
    return this.http.patch<{ success: boolean; order: DeliveryOrder }>(
      `${this.apiUrl}/${orderId}/assign-driver`,
      payload
    );
  }

  cancelOrder(
    orderId: string,
    payload: {
      reason: string;
      cancelledBy?: string;
    }
  ): Observable<{ success: boolean; order: DeliveryOrder }> {
    return this.http.post<{ success: boolean; order: DeliveryOrder }>(
      `${this.apiUrl}/${orderId}/cancel`,
      payload
    );
  }

  getDrivers(availableOnly: boolean = false): Observable<DriversResponse> {
    let params = new HttpParams();
    if (availableOnly) params = params.set('availableOnly', 'true');
    return this.http.get<DriversResponse>(this.driversUrl, { params });
  }

  createDriver(driver: {
    name: string;
    phone: string;
    vehicleType?: string;
    vehiclePlate?: string;
  }): Observable<{ success: boolean; driver: DeliveryDriver }> {
    return this.http.post<{ success: boolean; driver: DeliveryDriver }>(
      this.driversUrl,
      driver
    );
  }

  // --- Audio Alert Bell using Web Audio API ---
  playOrderChime(): void {
    if (!this.soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // Bell chime: Tone 1 (587.33 Hz - D5) followed by Tone 2 (880 Hz - A5)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.45);

      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.15);
      gain2.gain.setValueAtTime(0.3, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.7);
    } catch (e) {
      console.warn('Audio alert play failed:', e);
    }
  }

  // Helper: Elapsed minutes from order creation
  getElapsedMinutes(createdAt: string | Date): number {
    if (!createdAt) return 0;
    const created = new Date(createdAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((now - created) / 60000));
  }

  // Helper: Status to Kanban column mapping
  getKanbanColumn(status: string): 'new' | 'kitchen' | 'ready' | 'dispatch' | 'completed' | 'cancelled' {
    switch (status) {
      case 'WFC':
        return 'new';
      case 'OUP':
        return 'kitchen';
      case 'RTS':
      case 'RFT':
      case 'RFD':
        return 'ready';
      case 'OOW':
        return 'dispatch';
      case 'Dlvd':
      case 'Srvd':
      case 'TA':
        return 'completed';
      case 'CANCELLED':
      default:
        return 'cancelled';
    }
  }

  // Helper: Next status action determination
  getNextAction(order: DeliveryOrder): NextStatusAction | null {
    switch (order.status) {
      case 'WFC':
        return {
          label: 'Accept & Cook',
          labelAr: 'قبول وبدء التحضير',
          targetStatus: 'OUP',
          buttonClass: 'btn-cook'
        };

      case 'OUP':
        if (order.orderType === 'dine_in') {
          return {
            label: 'Ready to Serve',
            labelAr: 'جاهز للتقديم',
            targetStatus: 'RTS',
            buttonClass: 'btn-ready'
          };
        } else if (order.orderType === 'take_away') {
          return {
            label: 'Ready for Pickup',
            labelAr: 'جاهز للاستلام',
            targetStatus: 'RFT',
            buttonClass: 'btn-ready'
          };
        } else {
          return {
            label: 'Ready for Delivery',
            labelAr: 'جاهز للتوصيل',
            targetStatus: 'RFD',
            buttonClass: 'btn-ready'
          };
        }

      case 'RTS':
        return {
          label: 'Mark as Served',
          labelAr: 'تم التقديم للطاولة',
          targetStatus: 'Srvd',
          buttonClass: 'btn-complete'
        };

      case 'RFT':
        return {
          label: 'Handover to Customer',
          labelAr: 'تسليم للعميل',
          targetStatus: 'TA',
          buttonClass: 'btn-complete'
        };

      case 'RFD':
        return {
          label: 'Dispatch (On the Way)',
          labelAr: 'تسليم للسائق (في الطريق)',
          targetStatus: 'OOW',
          buttonClass: 'btn-dispatch'
        };

      case 'OOW':
        return {
          label: 'Confirm Delivered',
          labelAr: 'تأكيد التسليم للعميل',
          targetStatus: 'Dlvd',
          buttonClass: 'btn-complete'
        };

      default:
        return null;
    }
  }
}
