import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProductsService, ProductItem, ProductCategory, ProductSubCategory, ProductUnit, ProductBrand } from '../../../core/services/products.service';
import { SettingsHubService } from '../../../core/services/settings-hub.service';
import { DEFAULT_PRODUCT_POLICY, ProductFormVisibility, resolveProductFormVisibility } from './product-form-visibility';
import { BRAND_LETTERS, BrandLookupItem, collectBrandCatalog, filterBrands } from './brand-lookup';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.scss']
})
export class ProductsListComponent implements OnInit {
  private productsService = inject(ProductsService);
  private settingsHub = inject(SettingsHubService);
  private router = inject(Router);

  // --- Reactive Signals State ---
  products = signal<ProductItem[]>([]);
  categories = signal<ProductCategory[]>([]);
  subCategories = signal<ProductSubCategory[]>([]);
  units = signal<ProductUnit[]>([]);
  storedBrands = signal<BrandLookupItem[]>([]);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Filters & Controls
  searchQuery = signal<string>('');
  selectedProductType = signal<string>('All');
  selectedCategory = signal<string | null>(null);
  selectedBrand = signal<string | null>(null);
  statusFilter = signal<string>('All');
  notForSellFilter = signal<boolean>(false);
  isWebFilter = signal<boolean>(false);

  showTopPanel = signal<boolean>(true);
  isTableView = signal<boolean>(true);

  // Sorting
  sortColumn = signal<string>('name');
  sortAscending = signal<boolean>(true);

  // Column Visibility Configuration
  columnVisibility = {
    image: true,
    actions: true,
    name: true,
    costPrice: true,
    price: true,
    stock: true,
    type: true,
    tax: true,
    brand: true,
    sku: true
  };

  // Modals & Drawers
  showProductFormModal = signal<boolean>(false);
  editingProduct = signal<ProductItem | null>(null);
  activeFormTab = signal<'general' | 'pricing' | 'stock' | 'verticals' | 'channels'>('general');

  showDetailsModal = signal<boolean>(false);
  selectedProductForDetails = signal<ProductItem | null>(null);

  showDeleteConfirmModal = signal<boolean>(false);
  productToDelete = signal<ProductItem | null>(null);

  showColumnVisibilityModal = signal<boolean>(false);
  showImportCsvModal = signal<boolean>(false);
  csvImportText = signal<string>('');

  showBrandLookupModal = signal<boolean>(false);
  brandSearchQuery = signal<string>('');
  brandLetterFilter = signal<string>('ALL');
  brandLetters = BRAND_LETTERS;
  newBrandName = '';

  toastMessage = signal<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  formVis = signal<ProductFormVisibility>(resolveProductFormVisibility(DEFAULT_PRODUCT_POLICY));

  // --- Product Form Model ---
  productForm = this.getDefaultProductForm();

  brandCatalog = computed(() => collectBrandCatalog(
    this.storedBrands(),
    this.products().map(p => p.brandId)
  ));

  availableBrands = computed(() => this.brandCatalog().map(b => b.name));

  filteredLookupBrands = computed(() =>
    filterBrands(this.brandCatalog(), this.brandSearchQuery(), this.brandLetterFilter())
  );

  // Filtered and Sorted Products List
  filteredProducts = computed(() => {
    let list = this.products();
    const q = this.searchQuery().trim().toLowerCase();
    const typeFilter = this.selectedProductType();
    const catFilter = this.selectedCategory();
    const brandFilter = this.selectedBrand();
    const status = this.statusFilter();
    const notForSell = this.notForSellFilter();
    const isWeb = this.isWebFilter();

    list = list.filter(p => {
      // Search
      if (q) {
        const matchesName = (p.name || p.productName || '').toLowerCase().includes(q);
        const matchesSku = (p.sku || '').toLowerCase().includes(q);
        const matchesBarcode = (p.barcode || '').toLowerCase().includes(q);
        const matchesBrand = (p.brandId || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesBarcode && !matchesBrand) return false;
      }

      // Status
      if (status === 'Active' && !p.isActive) return false;
      if (status === 'Inactive' && p.isActive) return false;

      // Product Type
      if (typeFilter === 'Electronics' && !p.isElectronics) return false;
      if (typeFilter === 'Pharmacy' && !p.isMedicine && !p.isPharmacy) return false;
      if (typeFilter === 'Apparel' && !p.isApparel) return false;
      if (typeFilter === 'Standard' && (p.isElectronics || p.isMedicine || p.isPharmacy || p.isApparel)) return false;

      // Category
      if (catFilter && p.categoryId !== catFilter) return false;

      // Brand
      if (brandFilter && p.brandId?.toLowerCase() !== brandFilter.toLowerCase()) return false;

      // Special flags
      if (notForSell && p.isProductDisplayPosApp) return false;
      if (isWeb && !p.isProductDisplayWebsiteApp) return false;

      return true;
    });

    // Sorting
    const col = this.sortColumn();
    const asc = this.sortAscending();

    list.sort((a, b) => {
      let cmp = 0;
      switch (col) {
        case 'name':
          cmp = (a.name || '').localeCompare(b.name || '');
          break;
        case 'costPrice':
          cmp = (Number(a.costPrice) || 0) - (Number(b.costPrice) || 0);
          break;
        case 'price':
          cmp = (Number(a.price) || 0) - (Number(b.price) || 0);
          break;
        case 'stockQuantity':
          cmp = (a.stockQuantity || 0) - (b.stockQuantity || 0);
          break;
        case 'sku':
          cmp = (a.sku || '').localeCompare(b.sku || '');
          break;
        default:
          cmp = (a.name || '').localeCompare(b.name || '');
      }
      return asc ? cmp : -cmp;
    });

    return list;
  });

  // Summary KPI Counters
  totalProductsCount = computed(() => this.products().length);
  activeProductsCount = computed(() => this.products().filter(p => p.isActive).length);
  lowStockProductsCount = computed(() => this.products().filter(p => (p.stockQuantity || 0) <= (p.minStockLevel || 5)).length);
  totalInventoryValuation = computed(() => {
    return this.products().reduce((sum, p) => {
      const price = Number(p.costPrice || p.price || 0);
      return sum + (price * (p.stockQuantity || 0));
    }, 0);
  });

  ngOnInit(): void {
    this.fetchProducts();
    this.fetchCategories();
    this.fetchSubCategories();
    this.fetchUnits();
    this.fetchBrands();
    this.loadProductPolicy();
  }

  loadProductPolicy(): void {
    this.settingsHub.getProductPolicy().subscribe({
      next: (res) => {
        const policy = (res.productPolicy || {}) as Record<string, boolean>;
        this.formVis.set(resolveProductFormVisibility(policy));
        this.ensureActiveFormTabVisible();
      },
      error: () => {
        this.formVis.set(resolveProductFormVisibility(DEFAULT_PRODUCT_POLICY));
      }
    });
  }

  ensureActiveFormTabVisible(): void {
    const vis = this.formVis();
    const tab = this.activeFormTab();
    if (tab === 'stock' && !vis.showStockTab) this.activeFormTab.set('general');
    if (tab === 'verticals' && !vis.showVerticalsTab) this.activeFormTab.set('general');
  }

  fetchProducts(): void {
    this.isLoading.set(true);
    this.productsService.getProducts().subscribe({
      next: (data) => {
        this.isLoading.set(false);
        this.products.set(data || []);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Failed to load products:', err);
        this.showToast('Failed to load catalog products', 'error');
      }
    });
  }

  fetchCategories(): void {
    this.productsService.getCategories().subscribe({
      next: (data) => this.categories.set(data || []),
      error: (err) => console.error('Failed to load categories:', err)
    });
  }

  fetchSubCategories(): void {
    this.productsService.getSubCategories().subscribe({
      next: (data) => this.subCategories.set(data || []),
      error: (err) => console.error('Failed to load sub-categories:', err)
    });
  }

  fetchUnits(): void {
    this.productsService.getUnits().subscribe({
      next: (data) => this.units.set(data || []),
      error: (err) => console.error('Failed to load units:', err)
    });
  }

  fetchBrands(): void {
    this.productsService.getBrands().subscribe({
      next: (data) => this.storedBrands.set(this.normalizeBrands(data)),
      error: (err) => console.error('Failed to load brands:', err)
    });
  }

  openBrandLookupModal(): void {
    this.brandSearchQuery.set('');
    this.brandLetterFilter.set('ALL');
    this.newBrandName = '';
    this.showBrandLookupModal.set(true);
  }

  closeBrandLookupModal(): void {
    this.showBrandLookupModal.set(false);
  }

  setBrandLetterFilter(letter: string): void {
    this.brandLetterFilter.set(letter);
  }

  selectBrand(brand: BrandLookupItem): void {
    this.productForm.brandId = brand.name;
    this.closeBrandLookupModal();
  }

  clearSelectedBrand(): void {
    this.productForm.brandId = '';
  }

  createBrandFromLookup(): void {
    const name = (this.newBrandName || this.brandSearchQuery()).trim();
    if (!name) {
      this.showToast('Enter a brand name to add', 'error');
      return;
    }

    this.productsService.createBrand({ name }).subscribe({
      next: (created) => {
        const item = { id: created.id, name: created.name || created.brandName || name };
        this.storedBrands.set(collectBrandCatalog([...this.storedBrands(), item], []));
        this.productForm.brandId = item.name;
        this.closeBrandLookupModal();
        this.showToast(`Brand "${item.name}" added`, 'success');
      },
      error: (err) => {
        this.showToast(err.error?.error || 'Failed to add brand', 'error');
      }
    });
  }

  private normalizeBrands(data: ProductBrand[] | null | undefined): BrandLookupItem[] {
    return (data || [])
      .map(item => ({
        id: item.id,
        name: (item.name || item.brandName || '').trim()
      }))
      .filter(item => item.name.length > 0);
  }

  // --- Sorting & View Toggles ---
  setSort(col: string): void {
    if (this.sortColumn() === col) {
      this.sortAscending.set(!this.sortAscending());
    } else {
      this.sortColumn.set(col);
      this.sortAscending.set(true);
    }
  }

  toggleViewMode(): void {
    this.isTableView.set(!this.isTableView());
  }

  toggleFilterPanel(): void {
    this.showTopPanel.set(!this.showTopPanel());
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedProductType.set('All');
    this.selectedCategory.set(null);
    this.selectedBrand.set(null);
    this.statusFilter.set('All');
    this.notForSellFilter.set(false);
    this.isWebFilter.set(false);
  }

  // --- Product Form Modal (Create & Edit) ---
  openNewProductModal(): void {
    this.editingProduct.set(null);
    this.productForm = this.getDefaultProductForm();
    this.activeFormTab.set('general');
    this.ensureActiveFormTabVisible();
    this.showProductFormModal.set(true);
  }

  openEditProductModal(product: ProductItem): void {
    this.editingProduct.set(product);
    this.productForm = {
      name: product.name || product.productName || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      description: product.description || '',
      categoryId: product.categoryId || '',
      subCategoryId: product.subCategoryId || '',
      brandId: product.brandId || '',
      unitId: product.unitId || '',
      isActive: product.isActive !== false,

      // Pricing
      costPrice: Number(product.costPrice || 0),
      marginPercentage: product.marginPercentage ?? 20,
      price: Number(product.price || 0),
      taxRate: product.taxRate ?? 15,
      taxType: 'Exclusive',
      isTaxExempt: !!product.isTaxExempt,
      isDiscountable: product.isDiscountable !== false,
      isExcizable: !!product.isExcizable,
      retailPrice: Number(product.retailPrice || product.price || 0),
      distributorPrice: Number(product.distributorPrice || product.price || 0),
      specialPrice: Number(product.specialPrice || product.price || 0),
      discountedPrice: Number(product.discountedPrice || 0),

      // Stock
      stockQuantity: product.stockQuantity ?? 0,
      minStockLevel: product.minStockLevel ?? 5,
      minOrderQty: product.minOrderQty ?? 1,
      weight: product.weight ?? 1.0,
      packetSize: product.packetSize ?? 1,
      isWeightBased: !!product.isWeightBased,
      isPacketOfPieces: !!product.isPacketOfPieces,

      // Vertical
      productType: this.determineProductType(product),
      modelNumber: product.modelNumber || '',
      storageCapacity: product.storageCapacity || '',
      ram: product.ram || '',
      warrantyMonths: product.warrantyMonths ?? 0,
      isImeiRequired: !!product.isImeiRequired,
      requiresSerialTracking: !!product.requiresSerialTracking,

      genericName: product.genericName || '',
      activeIngredient: product.activeIngredient || '',
      controlledSubstanceSchedule: product.controlledSubstanceSchedule || '',
      isPrescriptionRequired: !!product.isPrescriptionRequired,
      requiresBatchTracking: !!product.requiresBatchTracking,

      fiberComposition: product.fiberComposition || '',
      isUnderwear: !!product.isUnderwear,
      lotNumber: product.lotNumber || '',
      expiryDate: product.expiryDate || '',

      // Channels
      isProductDisplayPosApp: product.isProductDisplayPosApp !== false,
      isProductDisplayWebsiteApp: !!product.isProductDisplayWebsiteApp,
      isProductDisplayRackLabel: !!product.isProductDisplayRackLabel,
      returnDays: product.returnDays ?? 7,
      exchangeDays: product.exchangeDays ?? 30,
    };

    this.activeFormTab.set('general');
    this.ensureActiveFormTabVisible();
    this.showProductFormModal.set(true);
  }

  closeProductFormModal(): void {
    this.showProductFormModal.set(false);
    this.editingProduct.set(null);
  }

  saveProduct(): void {
    if (!this.productForm.name || this.productForm.name.trim().length === 0) {
      this.showToast('Product name is required', 'error');
      return;
    }

    if (this.productForm.price <= 0) {
      this.showToast('Selling price must be greater than zero', 'error');
      return;
    }

    this.isSubmitting.set(true);

    const payload: Partial<ProductItem> = {
      name: this.productForm.name,
      productName: this.productForm.name,
      sku: this.productForm.sku || this.productForm.barcode || this.generateSku(),
      barcode: this.productForm.barcode || this.productForm.sku,
      description: this.productForm.description,
      categoryId: this.productForm.categoryId || null,
      subCategoryId: this.productForm.subCategoryId || null,
      brandId: this.productForm.brandId || null,
      unitId: this.productForm.unitId || null,
      isActive: this.productForm.isActive,

      costPrice: this.productForm.costPrice.toString(),
      marginPercentage: this.productForm.marginPercentage,
      price: this.productForm.price,
      baseSellingPrice: this.productForm.price,
      isTaxExempt: this.productForm.isTaxExempt,
      isDiscountable: this.productForm.isDiscountable,
      isExcizable: this.productForm.isExcizable,
      taxRate: this.productForm.taxRate,
      retailPrice: this.productForm.retailPrice,
      distributorPrice: this.productForm.distributorPrice,
      specialPrice: this.productForm.specialPrice,
      discountedPrice: this.productForm.discountedPrice || null,

      stockQuantity: this.productForm.stockQuantity,
      stockInHand: this.productForm.stockQuantity,
      minStockLevel: this.productForm.minStockLevel,
      minOrderQty: this.productForm.minOrderQty,
      weight: this.productForm.weight,
      packetSize: this.productForm.packetSize,
      isWeightBased: this.productForm.isWeightBased,
      isPacketOfPieces: this.productForm.isPacketOfPieces,

      isElectronics: this.productForm.productType === 'Electronics',
      modelNumber: this.productForm.modelNumber,
      storageCapacity: this.productForm.storageCapacity,
      ram: this.productForm.ram,
      warrantyMonths: this.productForm.warrantyMonths,
      isImeiRequired: this.productForm.isImeiRequired,
      requiresSerialTracking: this.productForm.requiresSerialTracking,

      isMedicine: this.productForm.productType === 'Pharmacy',
      isPharmacy: this.productForm.productType === 'Pharmacy',
      genericName: this.productForm.genericName,
      activeIngredient: this.productForm.activeIngredient,
      controlledSubstanceSchedule: this.productForm.controlledSubstanceSchedule,
      isPrescriptionRequired: this.productForm.isPrescriptionRequired,
      requiresBatchTracking: this.productForm.requiresBatchTracking,
      lotNumber: this.productForm.lotNumber || null,
      expiryDate: this.productForm.expiryDate || null,

      isApparel: this.productForm.productType === 'Apparel',
      fiberComposition: this.productForm.fiberComposition,
      isUnderwear: this.productForm.isUnderwear,

      isProductDisplayPosApp: this.productForm.isProductDisplayPosApp,
      isProductDisplayWebsiteApp: this.productForm.isProductDisplayWebsiteApp,
      isProductDisplayRackLabel: this.productForm.isProductDisplayRackLabel,
      returnDays: this.productForm.returnDays,
      exchangeDays: this.productForm.exchangeDays
    };

    const currentEdit = this.editingProduct();

    if (currentEdit) {
      this.productsService.updateProduct(currentEdit.id, payload).subscribe({
        next: (updated) => {
          this.isSubmitting.set(false);
          this.closeProductFormModal();
          this.showToast('Product updated successfully', 'success');
          this.fetchProducts();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.showToast(err.error?.error || 'Failed to update product', 'error');
        }
      });
    } else {
      this.productsService.createProduct(payload).subscribe({
        next: (created) => {
          this.isSubmitting.set(false);
          this.closeProductFormModal();
          this.showToast('Product added to Master Catalog', 'success');
          this.fetchProducts();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.showToast(err.error?.error || 'Failed to create product', 'error');
        }
      });
    }
  }

  // --- Pricing Calculation Logic ---
  calculatePricesFromCost(): void {
    const cost = Number(this.productForm.costPrice) || 0;
    const margin = Number(this.productForm.marginPercentage) || 0;
    const taxRate = Number(this.productForm.taxRate) || 15;

    let baseSelling = cost * (1 + (margin / 100.0));
    let finalSellingPrice = baseSelling;

    if (!this.productForm.isTaxExempt && this.productForm.taxType === 'Exclusive') {
      finalSellingPrice = baseSelling * (1 + (taxRate / 100.0));
    }

    finalSellingPrice = Number(finalSellingPrice.toFixed(2));
    this.productForm.price = finalSellingPrice;

    // Retail = Selling * 1.40
    this.productForm.retailPrice = Number((finalSellingPrice * 1.4).toFixed(2));
    // Distributor = Retail * 0.70
    this.productForm.distributorPrice = Number((this.productForm.retailPrice * 0.7).toFixed(2));
    this.productForm.specialPrice = finalSellingPrice;
  }

  onSellingPriceManualChange(): void {
    const selling = Number(this.productForm.price) || 0;
    this.productForm.retailPrice = Number((selling * 1.4).toFixed(2));
    this.productForm.distributorPrice = Number((this.productForm.retailPrice * 0.7).toFixed(2));
  }

  // --- Code Auto-generation ---
  generateSku(): string {
    const prefix = 'SKU';
    const rand = Math.floor(100000 + Math.random() * 900000);
    const sku = `${prefix}-${rand}`;
    this.productForm.sku = sku;
    return sku;
  }

  generateBarcode(): string {
    const barcode = '628' + Math.floor(100000000 + Math.random() * 900000000);
    this.productForm.barcode = barcode;
    return barcode;
  }

  // --- Product Details Drawer ---
  openDetailsModal(product: ProductItem): void {
    this.selectedProductForDetails.set(product);
    this.showDetailsModal.set(true);
  }

  closeDetailsModal(): void {
    this.showDetailsModal.set(false);
    this.selectedProductForDetails.set(null);
  }

  // --- Delete Product ---
  openDeleteModal(product: ProductItem): void {
    this.productToDelete.set(product);
    this.showDeleteConfirmModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteConfirmModal.set(false);
    this.productToDelete.set(null);
  }

  confirmDelete(): void {
    const p = this.productToDelete();
    if (!p) return;

    this.isSubmitting.set(true);
    this.productsService.deleteProduct(p.id).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeDeleteModal();
        this.showToast('Product deleted from catalog', 'info');
        this.fetchProducts();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showToast(err.error?.error || 'Failed to delete product', 'error');
      }
    });
  }

  // --- CSV Export & Import ---
  exportCsv(): void {
    const list = this.filteredProducts();
    if (list.length === 0) {
      this.showToast('No products to export', 'info');
      return;
    }

    const headers = ['Product Name', 'SKU', 'Barcode', 'Cost Price', 'Selling Price', 'Stock', 'Min Stock', 'Category', 'Brand', 'Status'];
    const rows = list.map(p => [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.sku || ''}"`,
      `"${p.barcode || ''}"`,
      p.costPrice || 0,
      p.price || 0,
      p.stockQuantity || 0,
      p.minStockLevel || 0,
      `"${this.getCategoryName(p.categoryId)}"`,
      `"${p.brandId || ''}"`,
      p.isActive ? 'Active' : 'Inactive'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `catalog_products_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('CSV export downloaded', 'success');
  }

  openImportCsvModal(): void {
    this.csvImportText.set('');
    this.showImportCsvModal.set(true);
  }

  closeImportCsvModal(): void {
    this.showImportCsvModal.set(false);
  }

  handleCsvFileUpload(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.csvImportText.set(e.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  }

  submitCsvImport(): void {
    const raw = this.csvImportText().trim();
    if (!raw) {
      this.showToast('Please provide CSV content or select a CSV file', 'error');
      return;
    }

    const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length <= 1) {
      this.showToast('CSV file is empty or only contains header', 'error');
      return;
    }

    const dataLines = lines.slice(1);
    let imported = 0;
    this.isSubmitting.set(true);

    const importNext = (index: number) => {
      if (index >= dataLines.length) {
        this.isSubmitting.set(false);
        this.closeImportCsvModal();
        this.showToast(`Imported ${imported} products successfully`, 'success');
        this.fetchProducts();
        return;
      }

      const parts = dataLines[index].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      if (parts.length >= 2 && parts[0]) {
        const item: Partial<ProductItem> = {
          name: parts[0],
          productName: parts[0],
          price: parseFloat(parts[1]) || 10,
          baseSellingPrice: parseFloat(parts[1]) || 10,
          sku: parts[2] || this.generateSku(),
          barcode: parts[3] || parts[2] || this.generateBarcode(),
          costPrice: parts[4] || '0',
          stockQuantity: parseInt(parts[5], 10) || 0,
          isActive: true
        };

        this.productsService.createProduct(item).subscribe({
          next: () => {
            imported++;
            importNext(index + 1);
          },
          error: () => importNext(index + 1)
        });
      } else {
        importNext(index + 1);
      }
    };

    importNext(0);
  }

  // --- Helper Getters ---
  getCategoryName(catId?: string | null): string {
    if (!catId) return 'Uncategorized';
    const found = this.categories().find(c => c.id === catId);
    return found ? found.name : 'General';
  }

  isLowStock(product: ProductItem): boolean {
    const stock = product.stockQuantity || 0;
    const min = product.minStockLevel || 5;
    return stock <= min;
  }

  getProductTypeLabel(p: ProductItem): string {
    if (p.isElectronics) return 'Electronics';
    if (p.isMedicine || p.isPharmacy) return 'Pharmacy';
    if (p.isApparel) return 'Apparel';
    return 'Standard';
  }

  determineProductType(p: ProductItem): string {
    if (p.isElectronics) return 'Electronics';
    if (p.isMedicine || p.isPharmacy) return 'Pharmacy';
    if (p.isApparel) return 'Apparel';
    return 'Standard';
  }

  showToast(text: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage.set({ text, type });
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }

  private getDefaultProductForm() {
    return {
      name: '',
      sku: '',
      barcode: '',
      description: '',
      categoryId: '',
      subCategoryId: '',
      brandId: '',
      unitId: '',
      isActive: true,

      costPrice: 0,
      marginPercentage: 20,
      price: 0,
      taxRate: 15,
      taxType: 'Exclusive',
      isTaxExempt: false,
      isDiscountable: true,
      isExcizable: false,
      retailPrice: 0,
      distributorPrice: 0,
      specialPrice: 0,
      discountedPrice: 0,

      stockQuantity: 10,
      minStockLevel: 5,
      minOrderQty: 1,
      weight: 1.0,
      packetSize: 1,
      isWeightBased: false,
      isPacketOfPieces: false,

      productType: 'Standard',
      modelNumber: '',
      storageCapacity: '',
      ram: '',
      warrantyMonths: 0,
      isImeiRequired: false,
      requiresSerialTracking: false,

      genericName: '',
      activeIngredient: '',
      controlledSubstanceSchedule: '',
      isPrescriptionRequired: false,
      requiresBatchTracking: false,

      fiberComposition: '',
      isUnderwear: false,
      lotNumber: '',
      expiryDate: '',

      isProductDisplayPosApp: true,
      isProductDisplayWebsiteApp: false,
      isProductDisplayRackLabel: false,
      returnDays: 7,
      exchangeDays: 30
    };
  }
}
