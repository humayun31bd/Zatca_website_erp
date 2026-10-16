import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ProductsService, ProductItem } from '../../../core/services/products.service';
import { generateCode128Svg } from '../../../core/utils/barcode.util';
import * as QRCode from 'qrcode';

export interface LabelItem {
  productId: string;
  productName: string;
  variantAttrs?: string | null;
  barcode: string;
  hsnCode?: string | null;
  copiesCount: number;
  packingDate?: string;
  expiryDate?: string;
  batchNumber?: string | null;
  serialNumber?: string | null;
  retailPrice: number;
  wholesalePrice?: number | null;
  discountPrice?: number | null;
  qrDataUrl?: string;
}

export interface LabelSettings {
  showShopName: boolean;
  shopName: string;
  showShopPhone: boolean;
  shopPhone: string;
  showShopAddress: boolean;
  shopAddress: string;

  showProductName: boolean;
  showBarcodeText: boolean;
  showHsnCode: boolean;

  showPackingDate: boolean;
  requireExpiryDate: boolean;
  requireBatchNumber: boolean;
  requireSerialNumber: boolean;

  showRetailPrice: boolean;
  showWholesalePrice: boolean;
  showDiscountPrice: boolean;
  currencySymbol: string;

  showBarcode: boolean;
  showQrCode: boolean;
  showLabelDimensions: boolean;
}

export interface LabelSheetPreset {
  key: string;
  name: string;
  description: string;
  columns: number;
  rows: number;
  labelsPerPage: number;
  labelWidthMm: number;
  labelHeightMm: number;
  isRoll: boolean;
}

@Component({
  selector: 'app-print-labels',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './print-labels.component.html',
  styleUrls: ['./print-labels.component.scss']
})
export class PrintLabelsComponent implements OnInit {
  private productsService = inject(ProductsService);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);

  // --- Presets List (Matching Flutter printlebel.md) ---
  readonly presets: LabelSheetPreset[] = [
    {
      key: 'sheet20',
      name: '20 Labels per Sheet',
      description: 'Sheet: 8.5" x 11.5", Label: 4" x 1" (2 cols x 10 rows)',
      columns: 2,
      rows: 10,
      labelsPerPage: 20,
      labelWidthMm: 101.6,
      labelHeightMm: 25.4,
      isRoll: false,
    },
    {
      key: 'sheet30',
      name: '30 Labels per Sheet',
      description: 'Sheet: 8.5" x 11.5", Label: 2" x 1" (3 cols x 10 rows)',
      columns: 3,
      rows: 10,
      labelsPerPage: 30,
      labelWidthMm: 50.8,
      labelHeightMm: 25.4,
      isRoll: false,
    },
    {
      key: 'sheet32',
      name: '32 Labels per Sheet',
      description: 'Sheet: 8.5" x 11.5", Label: 2" x 1.35" (4 cols x 8 rows)',
      columns: 4,
      rows: 8,
      labelsPerPage: 32,
      labelWidthMm: 50.8,
      labelHeightMm: 34.2,
      isRoll: false,
    },
    {
      key: 'sheet40',
      name: '40 Labels per Sheet',
      description: 'Sheet: 8.5" x 11.5", Label: 2" x 1" (4 cols x 10 rows)',
      columns: 4,
      rows: 10,
      labelsPerPage: 40,
      labelWidthMm: 50.8,
      labelHeightMm: 25.4,
      isRoll: false,
    },
    {
      key: 'sheet50',
      name: '50 Labels per Sheet',
      description: 'Sheet: 8.5" x 11.5", Label: 1.5" x 1" (5 cols x 10 rows)',
      columns: 5,
      rows: 10,
      labelsPerPage: 50,
      labelWidthMm: 38.1,
      labelHeightMm: 25.4,
      isRoll: false,
    },
    {
      key: 'roll3',
      name: 'Continuous Roll 3" (Thermal)',
      description: 'Roll width: 31.75 mm x 25.40 mm, Gap: 3.18 mm',
      columns: 1,
      rows: 1,
      labelsPerPage: 1,
      labelWidthMm: 31.75,
      labelHeightMm: 25.4,
      isRoll: true,
    }
  ];

  // --- Reactive Signals State ---
  queue = signal<LabelItem[]>([]);
  catalogProducts = signal<ProductItem[]>([]);
  isLoadingProducts = signal<boolean>(false);
  isPrinting = signal<boolean>(false);

  selectedPresetKey = signal<string>('sheet30');
  activeTab = signal<'queue' | 'settings'>('queue');
  showProductPickerModal = signal<boolean>(false);
  pickerSearch = signal<string>('');
  toastMessage = signal<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Settings Object
  settings: LabelSettings = {
    showShopName: true,
    shopName: 'Intelligent ERP Store',
    showShopPhone: true,
    shopPhone: '+966 50 123 4567',
    showShopAddress: false,
    shopAddress: 'Riyadh, Saudi Arabia',

    showProductName: true,
    showBarcodeText: true,
    showHsnCode: true,

    showPackingDate: false,
    requireExpiryDate: false,
    requireBatchNumber: false,
    requireSerialNumber: false,

    showRetailPrice: true,
    showWholesalePrice: false,
    showDiscountPrice: false,
    currencySymbol: 'SAR',

    showBarcode: true,
    showQrCode: false,
    showLabelDimensions: false
  };

  // --- Computed Properties ---
  selectedPreset = computed(() => {
    const key = this.selectedPresetKey();
    return this.presets.find(p => p.key === key) || this.presets[1];
  });

  totalCount = computed(() => {
    return this.queue().reduce((sum, item) => sum + (item.copiesCount || 1), 0);
  });

  // Flattened labels list for the sheet grid
  flattenedLabels = computed(() => {
    const res: LabelItem[] = [];
    this.queue().forEach(item => {
      const count = Math.max(1, item.copiesCount || 1);
      for (let i = 0; i < count; i++) {
        res.push(item);
      }
    });
    return res;
  });

  pagesCount = computed(() => {
    const total = this.totalCount();
    const perPage = this.selectedPreset().labelsPerPage;
    return Math.max(1, Math.ceil(total / perPage));
  });

  filteredPickerProducts = computed(() => {
    const q = this.pickerSearch().trim().toLowerCase();
    if (!q) return this.catalogProducts();
    return this.catalogProducts().filter(p => {
      const name = (p.name || p.productName || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();
      return name.includes(q) || sku.includes(q) || barcode.includes(q);
    });
  });

  ngOnInit(): void {
    this.loadCatalogProducts();
  }

  loadCatalogProducts(): void {
    this.isLoadingProducts.set(true);
    this.productsService.getProducts().subscribe({
      next: (prods) => {
        this.isLoadingProducts.set(false);
        this.catalogProducts.set(prods || []);

        // Pre-populate queue with first 2 products if queue is empty
        if (this.queue().length === 0 && prods && prods.length > 0) {
          prods.slice(0, 2).forEach(p => this.addProductToQueue(p, 4));
        }
      },
      error: (err) => {
        this.isLoadingProducts.set(false);
        console.error('Failed to load products for label printing:', err);
      }
    });
  }

  // --- Queue Actions ---
  addProductToQueue(product: ProductItem, defaultCopies = 2): void {
    const existingIdx = this.queue().findIndex(i => i.productId === product.id);
    if (existingIdx >= 0) {
      const list = [...this.queue()];
      list[existingIdx] = {
        ...list[existingIdx],
        copiesCount: list[existingIdx].copiesCount + 1
      };
      this.queue.set(list);
      this.showToast(`Added another copy of ${product.name}`, 'info');
      return;
    }

    const retail = Number(product.retailPrice || product.price || 0);
    const wholesale = Number(product.distributorPrice || 0);
    const discount = Number(product.discountedPrice || 0);
    const barcodeCode = product.barcode || product.sku || product.id.slice(0, 8).toUpperCase();

    const newItem: LabelItem = {
      productId: product.id,
      productName: product.name || product.productName || 'Product',
      variantAttrs: product.modelNumber || null,
      barcode: barcodeCode,
      hsnCode: 'HSN-8471',
      copiesCount: defaultCopies,
      packingDate: new Date().toISOString().slice(0, 10),
      expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      batchNumber: `BAT-${new Date().getFullYear()}`,
      serialNumber: 'SN-001',
      retailPrice: retail,
      wholesalePrice: wholesale > 0 ? wholesale : null,
      discountPrice: discount > 0 ? discount : null
    };

    // Generate QR code async
    QRCode.toDataURL(barcodeCode, { margin: 1, width: 64 })
      .then(url => {
        newItem.qrDataUrl = url;
      })
      .catch(() => {});

    this.queue.set([...this.queue(), newItem]);
    this.showToast(`Added ${newItem.productName} to queue`, 'success');
  }

  updateCopies(index: number, delta: number): void {
    const list = [...this.queue()];
    const current = list[index].copiesCount;
    const next = Math.max(1, current + delta);
    list[index] = { ...list[index], copiesCount: next };
    this.queue.set(list);
  }

  setCopiesManual(index: number, value: number): void {
    const list = [...this.queue()];
    list[index] = { ...list[index], copiesCount: Math.max(1, value || 1) };
    this.queue.set(list);
  }

  removeQueueItem(index: number): void {
    const list = [...this.queue()];
    list.splice(index, 1);
    this.queue.set(list);
    this.showToast('Item removed from queue', 'info');
  }

  clearQueue(): void {
    this.queue.set([]);
    this.showToast('Label queue cleared', 'info');
  }

  // --- SVG Barcode Helper ---
  getBarcodeSvg(code: string): SafeHtml {
    const svgStr = generateCode128Svg(code || '00000000', 36);
    return this.sanitizer.bypassSecurityTrustHtml(svgStr);
  }

  // --- Direct Printing Trigger ---
  triggerPrint(): void {
    if (this.queue().length === 0) {
      this.showToast('Please add at least one product to the queue before printing', 'error');
      return;
    }

    this.isPrinting.set(true);
    setTimeout(() => {
      window.print();
      this.isPrinting.set(false);
    }, 200);
  }

  // --- Navigation & Picker ---
  openProductPicker(): void {
    this.pickerSearch.set('');
    this.showProductPickerModal.set(true);
  }

  closeProductPicker(): void {
    this.showProductPickerModal.set(false);
  }

  backToCatalog(): void {
    this.router.navigate(['/inventory']);
  }

  showToast(text: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage.set({ text, type });
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }
}
