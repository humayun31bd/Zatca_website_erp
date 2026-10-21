import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { KdsService, DeliveryOrder, DeliveryDriver, NextStatusAction } from '../../core/services/kds.service';

@Component({
  selector: 'app-kds-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kds-board.component.html',
  styleUrls: ['./kds-board.component.scss']
})
export class KdsBoardComponent implements OnInit, OnDestroy {
  public kdsService = inject(KdsService);
  private router = inject(Router);

  // --- Reactive State ---
  orders = signal<DeliveryOrder[]>([]);
  drivers = signal<DeliveryDriver[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  searchQuery = signal<string>('');
  activeFilter = signal<string>('all');
  isKanbanMode = signal<boolean>(true);
  activeTab = signal<string>('new');
  autoRefreshEnabled = signal<boolean>(true);
  isSoundOn = signal<boolean>(true);
  toastMessage = signal<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  loadError = signal<string | null>(null);

  // Auto-refresh and clock timers
  private refreshTimer: any = null;
  private clockTimer: any = null;
  private knownOrderIds = new Set<string>();
  currentTime = signal<number>(Date.now());

  // --- Modals State ---
  // 1. Assign Driver Modal
  showAssignDriverModal = signal<boolean>(false);
  selectedOrderForDriver = signal<DeliveryOrder | null>(null);
  driverModalTab = signal<'fleet' | 'third_party'>('fleet');
  assignDriverForm = {
    selectedFleetDriverId: '',
    driverName: '',
    driverPhone: '',
    vehicleInfo: '',
    aggregator: 'Jahez',
    aggregatorReference: '',
    riderTrackingNote: '',
    autoDispatch: true
  };
  showInlineNewDriver = signal<boolean>(false);
  newFleetDriverForm = {
    name: '',
    phone: '',
    vehicleType: 'bike',
    vehiclePlate: ''
  };

  // 2. Proof of Delivery (POD) Modal
  showPodModal = signal<boolean>(false);
  selectedOrderForPod = signal<DeliveryOrder | null>(null);
  podForm = {
    recipientType: 'Customer in Person (العميل شخصياً)',
    recipientName: '',
    podNotes: '',
    cashCollected: true
  };

  // 3. Cancel Order Modal
  showCancelModal = signal<boolean>(false);
  selectedOrderForCancel = signal<DeliveryOrder | null>(null);
  cancelForm = {
    presetReason: 'Kitchen out of stock (المطبخ: نفاد الكمية)',
    customReason: '',
    cancelledBy: 'kitchen'
  };

  // 4. KOT Print Modal
  showKotModal = signal<boolean>(false);
  selectedOrderForKot = signal<DeliveryOrder | null>(null);
  selectedOrderKotItems = computed(() => this.selectedOrderForKot()?.items || []);

  // Platform presets for third-party riders
  readonly aggregatorPlatforms = [
    'Jahez (جاهز)',
    'HungerStation (هنقرستيشن)',
    'Marsool (مرسول)',
    'ToYou (تويو)',
    'Ninja (نينجا)',
    'Careem (كريم)',
    'Barq (برق)',
    'Other / آخر'
  ];

  readonly recipientTypes = [
    'Customer in Person (العميل شخصياً)',
    'Family Member (أحد أفراد العائلة)',
    'Building Guard / Reception (الحارس / الاستقبال)',
    'Left at Doorstep per instructions (عند الباب حسب الطلب)',
    'Platform Confirmation (تأكيد منصة التوصيل)'
  ];

  readonly cancelReasons = [
    'Kitchen out of stock (المطبخ: نفاد الكمية)',
    'Customer cancelled before prep (إلغاء من العميل قبل التحضير)',
    'Customer unreachable / wrong address (العميل لا يجيب / عنوان خاطئ)',
    'Station closed (المحطة مغلقة)',
    'Duplicate order (طلب مكرر)',
    'Manager void (إلغاء إداري)',
    'Other reason (سبب آخر)'
  ];

  // --- Computed Views ---
  filteredOrders = computed(() => {
    const list = this.orders();
    const filter = this.activeFilter();
    const q = this.searchQuery().trim().toLowerCase();

    return list.filter(order => {
      // Type Filter
      if (filter !== 'all') {
        if (filter === 'third_party' && order.channel !== 'third_party') return false;
        if (filter !== 'third_party' && order.orderType !== filter) return false;
      }

      // Search Filter
      if (q) {
        const matchNumber = order.orderNumber?.toLowerCase().includes(q);
        const matchCustomer = order.customerName?.toLowerCase().includes(q);
        const matchPhone = order.customerPhone?.toLowerCase().includes(q);
        const matchTable = order.tableNumber?.toLowerCase().includes(q);
        const matchAgg = order.aggregator?.toLowerCase().includes(q) || order.aggregatorReference?.toLowerCase().includes(q);
        const matchDriver = order.driverName?.toLowerCase().includes(q);
        if (!matchNumber && !matchCustomer && !matchPhone && !matchTable && !matchAgg && !matchDriver) {
          return false;
        }
      }

      return true;
    });
  });

  // Kanban Columns
  newOrders = computed(() => this.filteredOrders().filter(o => this.kdsService.getKanbanColumn(o.status) === 'new'));
  kitchenOrders = computed(() => this.filteredOrders().filter(o => this.kdsService.getKanbanColumn(o.status) === 'kitchen'));
  readyOrders = computed(() => this.filteredOrders().filter(o => this.kdsService.getKanbanColumn(o.status) === 'ready'));
  dispatchOrders = computed(() => this.filteredOrders().filter(o => this.kdsService.getKanbanColumn(o.status) === 'dispatch'));
  completedOrders = computed(() => this.filteredOrders().filter(o => this.kdsService.getKanbanColumn(o.status) === 'completed'));

  activeTabOrders = computed(() => {
    switch (this.activeTab()) {
      case 'new': return this.newOrders();
      case 'kitchen': return this.kitchenOrders();
      case 'ready': return this.readyOrders();
      case 'dispatch': return this.dispatchOrders();
      case 'completed': return this.completedOrders();
      default: return this.filteredOrders();
    }
  });

  ngOnInit(): void {
    this.isSoundOn.set(this.kdsService.soundEnabled);
    this.fetchOrders(true);
    this.fetchDrivers();

    // Start auto-refresh interval (12 seconds)
    this.startAutoRefresh();

    // Start clock timer to update ticket elapsed timers (30 seconds)
    this.clockTimer = setInterval(() => {
      this.currentTime.set(Date.now());
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.clockTimer) clearInterval(this.clockTimer);
  }

  // --- Data Fetching ---
  fetchOrders(isInitial = false): void {
    if (isInitial) this.isLoading.set(true);

    this.kdsService.getOrders({ limit: 100 }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.loadError.set(null);
        if (res.success && res.orders) {
          // Check for newly arrived orders to trigger chime
          let hasNewOrder = false;
          res.orders.forEach(o => {
            if (!this.knownOrderIds.has(o.id)) {
              this.knownOrderIds.add(o.id);
              if (!isInitial && (o.status === 'WFC' || o.status === 'OUP')) {
                hasNewOrder = true;
              }
            }
          });

          if (hasNewOrder && this.isSoundOn()) {
            this.kdsService.playOrderChime();
            this.showToast('🔔 New kitchen order arrived!', 'info');
          }

          this.orders.set(res.orders);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err?.error?.details || err?.error?.error || 'Failed to load kitchen orders';
        this.loadError.set(msg);
        console.error('Failed to load KDS orders:', err);
      }
    });
  }

  fetchDrivers(): void {
    this.kdsService.getDrivers().subscribe({
      next: (res) => {
        if (res.success && res.drivers) {
          this.drivers.set(res.drivers);
        }
      },
      error: (err) => console.error('Failed to load drivers:', err)
    });
  }

  startAutoRefresh(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.autoRefreshEnabled()) {
      this.refreshTimer = setInterval(() => {
        this.fetchOrders(false);
      }, 12000);
    }
  }

  toggleAutoRefresh(): void {
    const nextState = !this.autoRefreshEnabled();
    this.autoRefreshEnabled.set(nextState);
    if (nextState) {
      this.startAutoRefresh();
      this.showToast('Auto-refresh activated (12s)', 'info');
    } else {
      if (this.refreshTimer) clearInterval(this.refreshTimer);
      this.showToast('Auto-refresh paused', 'info');
    }
  }

  toggleSound(): void {
    const next = !this.isSoundOn();
    this.isSoundOn.set(next);
    this.kdsService.soundEnabled = next;
    if (next) {
      this.kdsService.playOrderChime();
      this.showToast('Order sound alert chime enabled', 'success');
    } else {
      this.showToast('Order sound alert muted', 'info');
    }
  }

  toggleViewMode(): void {
    this.isKanbanMode.set(!this.isKanbanMode());
  }

  setFilter(filter: string): void {
    this.activeFilter.set(filter);
  }

  setTab(tab: string): void {
    this.activeTab.set(tab);
  }

  goToPos(): void {
    this.router.navigate(['/pos/terminal']);
  }

  // --- Order Transition Action ---
  handlePrimaryAction(order: DeliveryOrder): void {
    const next = this.kdsService.getNextAction(order);
    if (!next) return;

    // Special routing if next status requires driver or delivery proof
    if (next.targetStatus === 'OOW' && !order.driverName && (order.orderType === 'delivery' || order.orderType === 'third_party_delivery')) {
      this.openAssignDriverModal(order);
      return;
    }

    if (next.targetStatus === 'Dlvd' && (order.orderType === 'delivery' || order.orderType === 'third_party_delivery')) {
      this.openPodModal(order);
      return;
    }

    this.transitionOrderStatus(order.id, next.targetStatus);
  }

  transitionOrderStatus(orderId: string, targetStatus: string, notes?: string, podNotes?: string): void {
    this.isSubmitting.set(true);
    this.kdsService.updateOrderStatus(orderId, targetStatus, { note: notes, podNotes }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.showToast(`Order status updated to ${targetStatus}`, 'success');
        this.fetchOrders(false);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showToast(err.error?.error || 'Failed to update order status', 'error');
      }
    });
  }

  // --- Assign Driver Modal ---
  openAssignDriverModal(order: DeliveryOrder): void {
    this.selectedOrderForDriver.set(order);
    this.showInlineNewDriver.set(false);

    const isThirdParty = order.channel === 'third_party' || !!order.aggregator;
    this.driverModalTab.set(isThirdParty ? 'third_party' : 'fleet');

    this.assignDriverForm = {
      selectedFleetDriverId: order.driverId || '',
      driverName: order.driverName || '',
      driverPhone: order.driverPhone || '',
      vehicleInfo: order.vehicleInfo || '',
      aggregator: order.aggregator || 'Jahez',
      aggregatorReference: order.aggregatorReference || '',
      riderTrackingNote: '',
      autoDispatch: true
    };

    this.showAssignDriverModal.set(true);
  }

  closeAssignDriverModal(): void {
    this.showAssignDriverModal.set(false);
    this.selectedOrderForDriver.set(null);
  }

  onFleetDriverSelected(driverId: string): void {
    this.assignDriverForm.selectedFleetDriverId = driverId;
    const drv = this.drivers().find(d => d.id === driverId);
    if (drv) {
      this.assignDriverForm.driverName = drv.name;
      this.assignDriverForm.driverPhone = drv.phone;
      this.assignDriverForm.vehicleInfo = `${drv.vehicleType.toUpperCase()} - ${drv.vehiclePlate || 'No Plate'}`;
    }
  }

  submitDriverAssignment(): void {
    const order = this.selectedOrderForDriver();
    if (!order) return;

    if (!this.assignDriverForm.driverName || !this.assignDriverForm.driverPhone) {
      this.showToast('Driver name and phone are required', 'error');
      return;
    }

    this.isSubmitting.set(true);
    const payload = {
      driverId: this.driverModalTab() === 'fleet' ? this.assignDriverForm.selectedFleetDriverId || null : null,
      driverName: this.assignDriverForm.driverName,
      driverPhone: this.assignDriverForm.driverPhone,
      vehicleInfo: this.assignDriverForm.vehicleInfo || null,
      aggregatorReference: this.assignDriverForm.aggregatorReference || null,
      riderTrackingNote: this.assignDriverForm.riderTrackingNote || null,
      autoDispatch: this.assignDriverForm.autoDispatch
    };

    this.kdsService.assignDriver(order.id, payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.closeAssignDriverModal();
        this.showToast('Driver assigned & dispatched successfully', 'success');
        this.fetchOrders(false);
        this.fetchDrivers();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showToast(err.error?.error || 'Failed to assign driver', 'error');
      }
    });
  }

  submitNewFleetDriver(): void {
    if (!this.newFleetDriverForm.name || !this.newFleetDriverForm.phone) {
      this.showToast('Please enter driver name and phone', 'error');
      return;
    }

    this.isSubmitting.set(true);
    this.kdsService.createDriver(this.newFleetDriverForm).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.showToast('New fleet driver added', 'success');
        this.showInlineNewDriver.set(false);
        this.newFleetDriverForm = { name: '', phone: '', vehicleType: 'bike', vehiclePlate: '' };
        this.fetchDrivers();
        if (res.driver) {
          this.onFleetDriverSelected(res.driver.id);
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showToast(err.error?.error || 'Failed to create driver', 'error');
      }
    });
  }

  // --- Proof of Delivery Modal ---
  openPodModal(order: DeliveryOrder): void {
    this.selectedOrderForPod.set(order);
    this.podForm = {
      recipientType: 'Customer in Person (العميل شخصياً)',
      recipientName: order.customerName || '',
      podNotes: '',
      cashCollected: true
    };
    this.showPodModal.set(true);
  }

  closePodModal(): void {
    this.showPodModal.set(false);
    this.selectedOrderForPod.set(null);
  }

  submitPod(): void {
    const order = this.selectedOrderForPod();
    if (!order) return;

    const summaryNotes = `Recipient: ${this.podForm.recipientType} (${this.podForm.recipientName || 'N/A'}). ${this.podForm.podNotes ? 'Note: ' + this.podForm.podNotes : ''}`;

    this.transitionOrderStatus(order.id, 'Dlvd', undefined, summaryNotes);
    this.closePodModal();
  }

  // --- Order Cancellation Modal ---
  openCancelModal(order: DeliveryOrder): void {
    this.selectedOrderForCancel.set(order);
    this.cancelForm = {
      presetReason: this.cancelReasons[0],
      customReason: '',
      cancelledBy: 'kitchen'
    };
    this.showCancelModal.set(true);
  }

  closeCancelModal(): void {
    this.showCancelModal.set(false);
    this.selectedOrderForCancel.set(null);
  }

  submitCancel(): void {
    const order = this.selectedOrderForCancel();
    if (!order) return;

    const reason = this.cancelForm.presetReason.startsWith('Other')
      ? (this.cancelForm.customReason || 'Other cancellation')
      : this.cancelForm.presetReason;

    this.isSubmitting.set(true);
    this.kdsService.cancelOrder(order.id, {
      reason,
      cancelledBy: this.cancelForm.cancelledBy
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.closeCancelModal();
        this.showToast('Order cancelled', 'info');
        this.fetchOrders(false);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showToast(err.error?.error || 'Failed to cancel order', 'error');
      }
    });
  }

  // --- KOT Ticket Print ---
  openKotModal(order: DeliveryOrder): void {
    this.selectedOrderForKot.set(order);
    this.showKotModal.set(true);
  }

  closeKotModal(): void {
    this.showKotModal.set(false);
    this.selectedOrderForKot.set(null);
  }

  triggerPrint(): void {
    window.print();
  }

  // --- Visual Helpers ---
  getElapsedMinutes(order: DeliveryOrder): number {
    return this.kdsService.getElapsedMinutes(order.createdAt);
  }

  isOrderLate(order: DeliveryOrder): boolean {
    if (order.status === 'CANCELLED' || order.status === 'Dlvd' || order.status === 'Srvd' || order.status === 'TA') {
      return false;
    }
    return this.getElapsedMinutes(order) >= 20;
  }

  isOrderWarning(order: DeliveryOrder): boolean {
    if (this.isOrderLate(order)) return false;
    if (order.status === 'CANCELLED' || order.status === 'Dlvd' || order.status === 'Srvd' || order.status === 'TA') {
      return false;
    }
    return this.getElapsedMinutes(order) >= 12;
  }

  getTimerClass(order: DeliveryOrder): string {
    if (this.isOrderLate(order)) return 'timer-late';
    if (this.isOrderWarning(order)) return 'timer-warning';
    return 'timer-normal';
  }

  getAggregatorBadgeClass(aggregator?: string | null): string {
    if (!aggregator) return 'agg-default';
    const lower = aggregator.toLowerCase();
    if (lower.includes('jahez')) return 'agg-jahez';
    if (lower.includes('hunger')) return 'agg-hunger';
    if (lower.includes('marsool')) return 'agg-marsool';
    if (lower.includes('toyou')) return 'agg-toyou';
    if (lower.includes('ninja')) return 'agg-ninja';
    return 'agg-default';
  }

  getOrderTypeLabel(type: string): string {
    switch (type) {
      case 'dine_in': return '🍽️ Dine In';
      case 'take_away': return '🛍️ Take Away';
      case 'delivery': return '🛵 Delivery';
      case 'third_party_delivery': return '🚀 Third-Party Delivery';
      default: return type;
    }
  }

  showToast(text: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage.set({ text, type });
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }
}
