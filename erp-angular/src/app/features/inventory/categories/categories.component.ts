import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductsService, ProductCategory, ProductSubCategory, ProductItem } from '../../../core/services/products.service';

interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info';
}

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss']
})
export class CategoriesComponent implements OnInit {
  private productsService = inject(ProductsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Active Tab: 'categories' | 'subcategories'
  activeTab = signal<'categories' | 'subcategories'>('categories');

  // Core Data
  categories = signal<ProductCategory[]>([]);
  subCategories = signal<ProductSubCategory[]>([]);
  products = signal<ProductItem[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Filters & View state
  searchQuery = signal<string>('');
  selectedParentFilter = signal<string>('ALL');
  isGridView = signal<boolean>(true);

  // Toast Notifications
  toast = signal<ToastMessage | null>(null);

  // Modals state
  showCategoryModal = signal<boolean>(false);
  editingCategory = signal<ProductCategory | null>(null);
  categoryForm = {
    name: '',
    description: ''
  };

  showBatchCategoryModal = signal<boolean>(false);
  batchCategoryRows = signal<Array<{ name: string; description: string }>>([
    { name: '', description: '' }
  ]);

  showSubCategoryModal = signal<boolean>(false);
  editingSubCategory = signal<ProductSubCategory | null>(null);
  subCategoryForm = {
    name: '',
    categoryId: '',
    description: ''
  };

  showBatchSubCategoryModal = signal<boolean>(false);
  batchSubCategoryParentId = signal<string>('');
  batchSubCategoryRows = signal<Array<{ name: string; description: string }>>([
    { name: '', description: '' }
  ]);

  showDeleteModal = signal<boolean>(false);
  deleteTarget = signal<{
    type: 'category' | 'subcategory';
    id: string;
    name: string;
    subCount?: number;
    productCount?: number;
  } | null>(null);

  showCsvImportModal = signal<boolean>(false);
  csvRowsToImport = signal<Array<{ name: string; description: string }>>([]);
  csvFileName = signal<string>('');
  isImporting = signal<boolean>(false);

  // Computed KPIs
  totalCategories = computed(() => this.categories().length);
  totalSubCategories = computed(() => this.subCategories().length);
  
  categorySubCategoryCounts = computed(() => {
    const map: Record<string, number> = {};
    for (const sub of this.subCategories()) {
      if (sub.categoryId) {
        map[sub.categoryId] = (map[sub.categoryId] || 0) + 1;
      }
    }
    return map;
  });

  categoryProductCounts = computed(() => {
    const map: Record<string, number> = {};
    for (const p of this.products()) {
      if (p.categoryId) {
        map[p.categoryId] = (map[p.categoryId] || 0) + 1;
      }
    }
    return map;
  });

  subCategoryProductCounts = computed(() => {
    const map: Record<string, number> = {};
    for (const p of this.products()) {
      if (p.subCategoryId) {
        map[p.subCategoryId] = (map[p.subCategoryId] || 0) + 1;
      }
    }
    return map;
  });

  totalProductsMapped = computed(() => {
    return this.products().filter(p => !!p.categoryId).length;
  });

  activeCategoriesCount = computed(() => {
    const counts = this.categoryProductCounts();
    return Object.keys(counts).filter(id => (counts[id] || 0) > 0).length;
  });

  coveragePercentage = computed(() => {
    const total = this.totalCategories();
    if (!total) return 0;
    return Math.round((this.activeCategoriesCount() / total) * 100);
  });

  protected readonly Math = Math;

  // Filtered Lists
  filteredCategories = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.categories();
    return this.categories().filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  filteredSubCategories = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const parentFilter = this.selectedParentFilter();

    let list = this.subCategories();
    if (parentFilter !== 'ALL') {
      list = list.filter(s => s.categoryId === parentFilter);
    }

    if (!q) return list;

    const catMap = this.categoryMap();
    return list.filter(s => {
      const parentName = catMap[s.categoryId]?.name || '';
      return s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        parentName.toLowerCase().includes(q);
    });
  });

  categoryMap = computed(() => {
    const map: Record<string, ProductCategory> = {};
    for (const c of this.categories()) {
      map[c.id] = c;
    }
    return map;
  });

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      if (data && data['activeTab'] === 'subcategories') {
        this.activeTab.set('subcategories');
      }
    });

    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'subcategories') {
        this.activeTab.set('subcategories');
      } else if (params['tab'] === 'categories') {
        this.activeTab.set('categories');
      }
      if (params['categoryId']) {
        this.selectedParentFilter.set(params['categoryId']);
      }
    });

    this.loadData();
  }

  switchTab(tab: 'categories' | 'subcategories'): void {
    this.activeTab.set(tab);
    const targetUrl = tab === 'subcategories' ? '/inventory/sub-categories' : '/inventory/categories';
    this.router.navigate([targetUrl], { replaceUrl: true });
  }

  loadData(): void {
    this.isLoading.set(true);
    let loaded = 0;
    const checkDone = () => {
      loaded++;
      if (loaded >= 3) {
        this.isLoading.set(false);
      }
    };

    this.productsService.getCategories().subscribe({
      next: (data) => {
        this.categories.set(data || []);
        checkDone();
      },
      error: (err) => {
        console.error('Failed to load categories', err);
        this.showToast('Failed to load categories', 'error');
        checkDone();
      }
    });

    this.productsService.getSubCategories().subscribe({
      next: (data) => {
        this.subCategories.set(data || []);
        checkDone();
      },
      error: (err) => {
        console.error('Failed to load sub-categories', err);
        checkDone();
      }
    });

    this.productsService.getProducts().subscribe({
      next: (data) => {
        this.products.set(data || []);
        checkDone();
      },
      error: (err) => {
        console.error('Failed to load products', err);
        checkDone();
      }
    });
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this.toast.set({ message, type });
    setTimeout(() => {
      if (this.toast()?.message === message) {
        this.toast.set(null);
      }
    }, 4000);
  }

  // --- Category Actions ---
  openAddCategory(): void {
    this.editingCategory.set(null);
    this.categoryForm = { name: '', description: '' };
    this.showCategoryModal.set(true);
  }

  openEditCategory(cat: ProductCategory): void {
    this.editingCategory.set(cat);
    this.categoryForm = {
      name: cat.name,
      description: cat.description || ''
    };
    this.showCategoryModal.set(true);
  }

  saveCategory(): void {
    const name = this.categoryForm.name.trim();
    if (!name) {
      this.showToast('Category name is required', 'error');
      return;
    }

    this.isSubmitting.set(true);
    const editing = this.editingCategory();

    if (editing) {
      this.productsService.updateCategory(editing.id, {
        name,
        description: this.categoryForm.description.trim() || undefined
      }).subscribe({
        next: (updated) => {
          this.categories.update(list => list.map(c => c.id === updated.id ? updated : c));
          this.showCategoryModal.set(false);
          this.isSubmitting.set(false);
          this.showToast(`Category "${updated.name}" updated successfully!`, 'success');
        },
        error: (err) => {
          console.error(err);
          this.isSubmitting.set(false);
          this.showToast('Failed to update category.', 'error');
        }
      });
    } else {
      this.productsService.createCategory({
        name,
        description: this.categoryForm.description.trim() || undefined
      }).subscribe({
        next: (created) => {
          this.categories.update(list => [created, ...list]);
          this.showCategoryModal.set(false);
          this.isSubmitting.set(false);
          this.showToast(`Category "${created.name}" created successfully!`, 'success');
        },
        error: (err) => {
          console.error(err);
          this.isSubmitting.set(false);
          this.showToast('Failed to create category.', 'error');
        }
      });
    }
  }

  // --- Batch Category Actions (Flutter Mirror) ---
  openBatchAddCategory(): void {
    this.batchCategoryRows.set([
      { name: '', description: '' },
      { name: '', description: '' },
      { name: '', description: '' }
    ]);
    this.showBatchCategoryModal.set(true);
  }

  addBatchCategoryRow(): void {
    this.batchCategoryRows.update(rows => [...rows, { name: '', description: '' }]);
  }

  removeBatchCategoryRow(index: number): void {
    this.batchCategoryRows.update(rows => rows.filter((_, i) => i !== index));
  }

  async saveBatchCategories(): Promise<void> {
    const validRows = this.batchCategoryRows()
      .map(r => ({ name: r.name.trim(), description: r.description.trim() }))
      .filter(r => r.name.length > 0);

    if (validRows.length === 0) {
      this.showToast('Please provide at least one category name.', 'error');
      return;
    }

    this.isSubmitting.set(true);
    let successCount = 0;
    const createdList: ProductCategory[] = [];

    for (const row of validRows) {
      try {
        const created = await this.productsService.createCategory({
          name: row.name,
          description: row.description || undefined
        }).toPromise();
        if (created) {
          createdList.push(created);
          successCount++;
        }
      } catch (err) {
        console.error('Failed to create category in batch:', row.name, err);
      }
    }

    if (createdList.length > 0) {
      this.categories.update(list => [...createdList, ...list]);
    }

    this.isSubmitting.set(false);
    this.showBatchCategoryModal.set(false);
    this.showToast(`Successfully created ${successCount} of ${validRows.length} categories!`, 'success');
  }

  // --- Sub-Category Actions ---
  openAddSubCategory(preferredParentId?: string): void {
    this.editingSubCategory.set(null);
    const parentId = preferredParentId || (this.categories().length > 0 ? this.categories()[0].id : '');
    this.subCategoryForm = {
      name: '',
      categoryId: parentId,
      description: ''
    };
    this.showSubCategoryModal.set(true);
  }

  openEditSubCategory(sub: ProductSubCategory): void {
    this.editingSubCategory.set(sub);
    this.subCategoryForm = {
      name: sub.name,
      categoryId: sub.categoryId,
      description: sub.description || ''
    };
    this.showSubCategoryModal.set(true);
  }

  saveSubCategory(): void {
    const name = this.subCategoryForm.name.trim();
    const categoryId = this.subCategoryForm.categoryId;

    if (!name) {
      this.showToast('Sub-category name is required', 'error');
      return;
    }
    if (!categoryId) {
      this.showToast('Please select a parent category', 'error');
      return;
    }

    this.isSubmitting.set(true);
    const editing = this.editingSubCategory();

    if (editing) {
      this.productsService.updateSubCategory(editing.id, {
        name,
        categoryId,
        description: this.subCategoryForm.description.trim() || undefined
      }).subscribe({
        next: (updated) => {
          this.subCategories.update(list => list.map(s => s.id === updated.id ? updated : s));
          this.showSubCategoryModal.set(false);
          this.isSubmitting.set(false);
          this.showToast(`Sub-category "${updated.name}" updated successfully!`, 'success');
        },
        error: (err) => {
          console.error(err);
          this.isSubmitting.set(false);
          this.showToast('Failed to update sub-category.', 'error');
        }
      });
    } else {
      this.productsService.createSubCategory({
        name,
        categoryId,
        description: this.subCategoryForm.description.trim() || undefined
      }).subscribe({
        next: (created) => {
          this.subCategories.update(list => [created, ...list]);
          this.showSubCategoryModal.set(false);
          this.isSubmitting.set(false);
          this.showToast(`Sub-category "${created.name}" created successfully!`, 'success');
        },
        error: (err) => {
          console.error(err);
          this.isSubmitting.set(false);
          this.showToast('Failed to create sub-category.', 'error');
        }
      });
    }
  }

  // --- Batch Sub-Category Actions ---
  openBatchAddSubCategory(preferredParentId?: string): void {
    const parentId = preferredParentId || (this.categories().length > 0 ? this.categories()[0].id : '');
    this.batchSubCategoryParentId.set(parentId);
    this.batchSubCategoryRows.set([
      { name: '', description: '' },
      { name: '', description: '' },
      { name: '', description: '' }
    ]);
    this.showBatchSubCategoryModal.set(true);
  }

  addBatchSubCategoryRow(): void {
    this.batchSubCategoryRows.update(rows => [...rows, { name: '', description: '' }]);
  }

  removeBatchSubCategoryRow(index: number): void {
    this.batchSubCategoryRows.update(rows => rows.filter((_, i) => i !== index));
  }

  async saveBatchSubCategories(): Promise<void> {
    const categoryId = this.batchSubCategoryParentId();
    if (!categoryId) {
      this.showToast('Please select a parent category.', 'error');
      return;
    }

    const validRows = this.batchSubCategoryRows()
      .map(r => ({ name: r.name.trim(), description: r.description.trim() }))
      .filter(r => r.name.length > 0);

    if (validRows.length === 0) {
      this.showToast('Please provide at least one sub-category name.', 'error');
      return;
    }

    this.isSubmitting.set(true);
    let successCount = 0;
    const createdList: ProductSubCategory[] = [];

    for (const row of validRows) {
      try {
        const created = await this.productsService.createSubCategory({
          name: row.name,
          categoryId,
          description: row.description || undefined
        }).toPromise();
        if (created) {
          createdList.push(created);
          successCount++;
        }
      } catch (err) {
        console.error('Failed to create sub-category in batch:', row.name, err);
      }
    }

    if (createdList.length > 0) {
      this.subCategories.update(list => [...createdList, ...list]);
    }

    this.isSubmitting.set(false);
    this.showBatchSubCategoryModal.set(false);
    this.showToast(`Successfully created ${successCount} sub-categories!`, 'success');
  }

  // Drill-down from category card to sub-categories
  viewSubCategoriesOf(catId: string): void {
    this.selectedParentFilter.set(catId);
    this.activeTab.set('subcategories');
    this.searchQuery.set('');
    this.router.navigate(['/inventory/sub-categories'], { queryParams: { categoryId: catId }, replaceUrl: true });
  }

  // --- Delete Modal & Execution ---
  confirmDeleteCategory(cat: ProductCategory): void {
    const subCount = this.categorySubCategoryCounts()[cat.id] || 0;
    const productCount = this.categoryProductCounts()[cat.id] || 0;
    this.deleteTarget.set({
      type: 'category',
      id: cat.id,
      name: cat.name,
      subCount,
      productCount
    });
    this.showDeleteModal.set(true);
  }

  confirmDeleteSubCategory(sub: ProductSubCategory): void {
    const productCount = this.subCategoryProductCounts()[sub.id] || 0;
    this.deleteTarget.set({
      type: 'subcategory',
      id: sub.id,
      name: sub.name,
      productCount
    });
    this.showDeleteModal.set(true);
  }

  executeDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.isSubmitting.set(true);
    if (target.type === 'category') {
      this.productsService.deleteCategory(target.id).subscribe({
        next: () => {
          this.categories.update(list => list.filter(c => c.id !== target.id));
          // Also remove orphan subcategories in memory
          this.subCategories.update(list => list.filter(s => s.categoryId !== target.id));
          this.showDeleteModal.set(false);
          this.isSubmitting.set(false);
          this.deleteTarget.set(null);
          this.showToast(`Category "${target.name}" deleted.`, 'info');
        },
        error: (err) => {
          console.error(err);
          this.isSubmitting.set(false);
          this.showToast('Failed to delete category. Ensure no dependent records block deletion.', 'error');
        }
      });
    } else {
      this.productsService.deleteSubCategory(target.id).subscribe({
        next: () => {
          this.subCategories.update(list => list.filter(s => s.id !== target.id));
          this.showDeleteModal.set(false);
          this.isSubmitting.set(false);
          this.deleteTarget.set(null);
          this.showToast(`Sub-category "${target.name}" deleted.`, 'info');
        },
        error: (err) => {
          console.error(err);
          this.isSubmitting.set(false);
          this.showToast('Failed to delete sub-category.', 'error');
        }
      });
    }
  }

  // --- CSV Import / Export (Flutter Feature Mirror) ---
  downloadTemplate(): void {
    const csvContent = '\uFEFFName,Description\nBeverages,Hot and cold drinks\nBakery,Fresh breads and pastries\nDairy & Eggs,Milk butter and farm eggs\nSnacks,Chips crackers and nuts';
    this.triggerCsvDownload(csvContent, 'categories_template.csv');
    this.showToast('CSV Template downloaded.', 'info');
  }

  exportToCsv(): void {
    if (this.activeTab() === 'categories') {
      const headers = ['Category ID', 'Category Name', 'Description', 'Sub-Categories Count', 'Products Count'];
      const rows = this.categories().map(c => [
        `"${c.id}"`,
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${(c.description || '').replace(/"/g, '""')}"`,
        this.categorySubCategoryCounts()[c.id] || 0,
        this.categoryProductCounts()[c.id] || 0
      ]);
      const csvString = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      this.triggerCsvDownload(csvString, `categories_export_${new Date().toISOString().slice(0, 10)}.csv`);
      this.showToast(`Exported ${rows.length} categories to CSV.`, 'success');
    } else {
      const headers = ['Sub-Category ID', 'Sub-Category Name', 'Parent Category', 'Description', 'Products Count'];
      const catMap = this.categoryMap();
      const rows = this.subCategories().map(s => [
        `"${s.id}"`,
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${(catMap[s.categoryId]?.name || '').replace(/"/g, '""')}"`,
        `"${(s.description || '').replace(/"/g, '""')}"`,
        this.subCategoryProductCounts()[s.id] || 0
      ]);
      const csvString = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      this.triggerCsvDownload(csvString, `sub_categories_export_${new Date().toISOString().slice(0, 10)}.csv`);
      this.showToast(`Exported ${rows.length} sub-categories to CSV.`, 'success');
    }
  }

  private triggerCsvDownload(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  openImportCsvModal(): void {
    this.csvRowsToImport.set([]);
    this.csvFileName.set('');
    this.showCsvImportModal.set(true);
  }

  onCsvFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.csvFileName.set(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (lines.length <= 1) {
          this.showToast('CSV file is empty or contains only header.', 'error');
          return;
        }

        // skip header row
        const dataRows = lines.slice(1);
        const parsed: Array<{ name: string; description: string }> = [];

        for (const line of dataRows) {
          // simple CSV parse supporting quotes
          const match = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
          if (match && match.length > 0) {
            const rawCol0 = match[0].replace(/^,/, '').trim();
            const col0 = rawCol0.startsWith('"') && rawCol0.endsWith('"')
              ? rawCol0.slice(1, -1).replace(/""/g, '"').trim()
              : rawCol0;

            let col1 = '';
            if (match.length > 1) {
              const rawCol1 = match[1].replace(/^,/, '').trim();
              col1 = rawCol1.startsWith('"') && rawCol1.endsWith('"')
                ? rawCol1.slice(1, -1).replace(/""/g, '"').trim()
                : rawCol1;
            }

            if (col0) {
              parsed.push({ name: col0, description: col1 });
            }
          }
        }

        this.csvRowsToImport.set(parsed);
      } catch (err) {
        console.error(err);
        this.showToast('Failed to parse CSV file.', 'error');
      }
    };
    reader.readAsText(file);
  }

  async executeCsvImport(): Promise<void> {
    const rows = this.csvRowsToImport();
    if (rows.length === 0) {
      this.showToast('No valid rows found to import.', 'error');
      return;
    }

    this.isImporting.set(true);
    let count = 0;
    const createdList: ProductCategory[] = [];

    for (const r of rows) {
      try {
        const created = await this.productsService.createCategory({
          name: r.name,
          description: r.description || undefined
        }).toPromise();
        if (created) {
          createdList.push(created);
          count++;
        }
      } catch (err) {
        console.error('Import row failed:', r.name, err);
      }
    }

    if (createdList.length > 0) {
      this.categories.update(list => [...createdList, ...list]);
    }

    this.isImporting.set(false);
    this.showCsvImportModal.set(false);
    this.showToast(`Imported ${count} of ${rows.length} categories!`, 'success');
  }

  getCategoryTheme(name: string): string {
    const hash = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const themes = ['emerald', 'blue', 'amber', 'purple', 'rose', 'cyan', 'indigo'];
    return themes[hash % themes.length];
  }
}
