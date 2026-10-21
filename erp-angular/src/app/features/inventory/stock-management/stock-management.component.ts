import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ProductsService,
  StockRow,
  StockTransfer,
  StockTransferItem
} from '../../../core/services/products.service';
import { resolveStockStatus, stockStatusLabel, StockStatus } from './stock-status';

@Component({
  selector: 'app-stock-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './stock-management.component.html',
  styleUrls: ['./stock-management.component.scss']
})
export class StockManagementComponent implements OnInit {
  private productsService = inject(ProductsService);

  stock = signal<StockRow[]>([]);
  transfers = signal<StockTransfer[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);
  loadError = signal<string | null>(null);
  toast = signal<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  searchQuery = signal('');
  statusFilter = signal<'ALL' | StockStatus>('ALL');
  activeTab = signal<'stock' | 'transfers'>('stock');

  showAdjustModal = signal(false);
  adjusting = signal<StockRow | null>(null);
  adjustQuantity = 0;
  adjustMinLevel = 0;

  showTransferModal = signal(false);
  transferForm = {
    fromWarehouseName: 'Main Warehouse',
    toWarehouseName: 'Main Outlet',
    remarks: ''
  };
  transferItems = signal<Array<{ productId: string; productName: string; quantity: number }>>([
    { productId: '', productName: '', quantity: 1 }
  ]);

  totalSku = computed(() => this.stock().length);
  outOfStockCount = computed(() => this.stock().filter(s => resolveStockStatus(s.stockQuantity, s.minStockLevel) === 'out').length);
  lowStockCount = computed(() => this.stock().filter(s => resolveStockStatus(s.stockQuantity, s.minStockLevel) === 'low').length);
  inStockCount = computed(() => this.stock().filter(s => resolveStockStatus(s.stockQuantity, s.minStockLevel) === 'ok').length);
  totalUnits = computed(() => this.stock().reduce((sum, s) => sum + (Number(s.stockQuantity) || 0), 0));

  filteredStock = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    return this.stock().filter(row => {
      if (q) {
        const hay = `${row.name || ''} ${row.barcode || ''} ${row.brand || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (status !== 'ALL') {
        return resolveStockStatus(row.stockQuantity, row.minStockLevel) === status;
      }
      return true;
    });
  });

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    let remaining = 2;
    const done = () => {
      remaining -= 1;
      if (remaining <= 0) this.isLoading.set(false);
    };

    this.productsService.getStock().subscribe({
      next: (rows) => {
        this.stock.set(Array.isArray(rows) ? rows : []);
        done();
      },
      error: () => {
        this.loadError.set('Failed to load stock');
        this.showToast('Failed to load stock', 'error');
        done();
      }
    });

    this.productsService.getTransfers().subscribe({
      next: (res) => {
        const list = res?.transfers || res?.data || [];
        this.transfers.set(Array.isArray(list) ? list : []);
        done();
      },
      error: () => {
        this.transfers.set([]);
        done();
      }
    });
  }

  statusOf(row: StockRow): StockStatus {
    return resolveStockStatus(row.stockQuantity, row.minStockLevel);
  }

  statusLabel(row: StockRow): string {
    return stockStatusLabel(this.statusOf(row));
  }

  openAdjust(row: StockRow): void {
    this.adjusting.set(row);
    this.adjustQuantity = Number(row.stockQuantity) || 0;
    this.adjustMinLevel = Number(row.minStockLevel) || 0;
    this.showAdjustModal.set(true);
  }

  closeAdjust(): void {
    this.showAdjustModal.set(false);
    this.adjusting.set(null);
  }

  saveAdjust(): void {
    const row = this.adjusting();
    if (!row) return;
    const qty = Math.max(0, Math.floor(Number(this.adjustQuantity) || 0));
    const min = Math.max(0, Math.floor(Number(this.adjustMinLevel) || 0));
    this.isSubmitting.set(true);
    this.productsService.updateStock(row.id, { stockQuantity: qty, minStockLevel: min }).subscribe({
      next: () => {
        this.stock.update(list => list.map(item => item.id === row.id
          ? { ...item, stockQuantity: qty, minStockLevel: min }
          : item));
        this.isSubmitting.set(false);
        this.closeAdjust();
        this.showToast('Stock updated', 'success');
      },
      error: () => {
        this.isSubmitting.set(false);
        this.showToast('Failed to update stock', 'error');
      }
    });
  }

  openTransfer(): void {
    this.transferForm = {
      fromWarehouseName: 'Main Warehouse',
      toWarehouseName: 'Main Outlet',
      remarks: ''
    };
    const first = this.stock()[0];
    this.transferItems.set([{
      productId: first?.id || '',
      productName: first?.name || '',
      quantity: 1
    }]);
    this.showTransferModal.set(true);
  }

  closeTransfer(): void {
    this.showTransferModal.set(false);
  }

  addTransferRow(): void {
    this.transferItems.update(rows => [...rows, { productId: '', productName: '', quantity: 1 }]);
  }

  removeTransferRow(index: number): void {
    this.transferItems.update(rows => rows.filter((_, i) => i !== index));
  }

  onTransferProductChange(index: number, productId: string): void {
    const product = this.stock().find(s => s.id === productId);
    this.transferItems.update(rows => rows.map((row, i) => i === index
      ? { ...row, productId, productName: product?.name || row.productName }
      : row));
  }

  saveTransfer(): void {
    const items: StockTransferItem[] = this.transferItems()
      .filter(row => row.productId && row.quantity > 0)
      .map(row => ({
        productId: row.productId,
        productName: row.productName,
        quantity: Number(row.quantity) || 1
      }));
    if (items.length === 0) {
      this.showToast('Add at least one product to transfer', 'error');
      return;
    }
    if (!this.transferForm.fromWarehouseName.trim() || !this.transferForm.toWarehouseName.trim()) {
      this.showToast('Source and destination are required', 'error');
      return;
    }
    this.isSubmitting.set(true);
    this.productsService.createTransfer({
      fromWarehouseId: this.slug(this.transferForm.fromWarehouseName),
      fromWarehouseName: this.transferForm.fromWarehouseName.trim(),
      toWarehouseId: this.slug(this.transferForm.toWarehouseName),
      toWarehouseName: this.transferForm.toWarehouseName.trim(),
      remarks: this.transferForm.remarks.trim(),
      items
    }).subscribe({
      next: (res) => {
        if (res?.data) {
          this.transfers.update(list => [res.data, ...list]);
        }
        this.isSubmitting.set(false);
        this.closeTransfer();
        this.showToast('Transfer recorded', 'success');
        this.activeTab.set('transfers');
      },
      error: () => {
        this.isSubmitting.set(false);
        this.showToast('Failed to create transfer', 'error');
      }
    });
  }

  private slug(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, '-') || crypto.randomUUID();
  }

  showToast(text: string, type: 'success' | 'error' | 'info'): void {
    this.toast.set({ text, type });
    setTimeout(() => {
      if (this.toast()?.text === text) this.toast.set(null);
    }, 3500);
  }
}
