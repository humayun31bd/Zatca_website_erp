import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { SuppliersService } from '../../core/services/suppliers.service';
import { Supplier, SupplierPayload } from '../../core/models/parties.models';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    TagModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    DialogModule,
    TextareaModule,
    TooltipModule
  ],
  templateUrl: './suppliers.component.html',
  styleUrls: ['./suppliers.component.scss']
})
export class SuppliersComponent implements OnInit {
  private suppliersService = inject(SuppliersService);
  private fb = inject(FormBuilder);

  suppliers = signal<Supplier[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);

  // Dialog State
  isDialogOpen = signal(false);
  editingSupplierId = signal<string | null>(null);

  // Filter State
  searchQuery = signal('');
  selectedCategory = signal('ALL');

  readonly categoryOptions = [
    { label: 'All Categories', value: 'ALL' },
    { label: 'Merchandise', value: 'MERCHANDISE' },
    { label: 'Services', value: 'SERVICES' },
    { label: 'Equipment', value: 'EQUIPMENT' },
    { label: 'Raw Materials', value: 'RAW_MATERIALS' }
  ];

  readonly formCategories = [
    { label: 'Merchandise', value: 'MERCHANDISE' },
    { label: 'Services', value: 'SERVICES' },
    { label: 'Equipment', value: 'EQUIPMENT' },
    { label: 'Raw Materials', value: 'RAW_MATERIALS' }
  ];

  readonly formTiers = [
    { label: 'Tier 1 - Strategic Partner', value: 'TIER_1_STRATEGIC' },
    { label: 'Tier 2 - Standard Supplier', value: 'TIER_2_STANDARD' },
    { label: 'Tier 3 - Secondary Supplier', value: 'TIER_3_SECONDARY' }
  ];

  readonly formTerms = [
    { label: 'Immediate / Cash', value: 'IMMEDIATE' },
    { label: 'Net 15 Days', value: 'NET_15' },
    { label: 'Net 30 Days', value: 'NET_30' },
    { label: 'Net 60 Days', value: 'NET_60' },
    { label: 'Net 90 Days', value: 'NET_90' }
  ];

  supplierForm = this.fb.group({
    name: ['', Validators.required],
    category: ['MERCHANDISE'],
    supplierTier: ['TIER_2_STANDARD'],
    paymentTerms: ['NET_30'],
    vatNumber: [''],
    crNumber: [''],
    email: ['', [Validators.email]],
    phoneNumber: [''],
    address: [''],
    bankDetails: ['']
  });

  // Filtered Suppliers computation
  filteredSuppliers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const cat = this.selectedCategory();

    return this.suppliers().filter(s => {
      const matchesSearch =
        !query ||
        s.name.toLowerCase().includes(query) ||
        (s.phoneNumber && s.phoneNumber.toLowerCase().includes(query)) ||
        (s.vatNumber && s.vatNumber.toLowerCase().includes(query)) ||
        (s.crNumber && s.crNumber.toLowerCase().includes(query));

      const matchesCat = cat === 'ALL' || s.category === cat;

      return matchesSearch && matchesCat;
    });
  });

  // KPI Computations
  totalSuppliersCount = computed(() => this.suppliers().length);

  merchandiseCount = computed(() => {
    return this.suppliers().filter(s => s.category === 'MERCHANDISE').length;
  });

  strategicTiersCount = computed(() => {
    return this.suppliers().filter(s => s.supplierTier === 'TIER_1_STRATEGIC').length;
  });

  netTermsCount = computed(() => {
    return this.suppliers().filter(s => s.paymentTerms?.startsWith('NET_')).length;
  });

  ngOnInit() {
    this.loadSuppliers();
  }

  loadSuppliers() {
    this.isLoading.set(true);
    this.suppliersService.getSuppliers().subscribe({
      next: (data) => {
        this.suppliers.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading suppliers', err);
        this.isLoading.set(false);
      }
    });
  }

  openCreateDialog() {
    this.editingSupplierId.set(null);
    this.supplierForm.reset({
      name: '',
      category: 'MERCHANDISE',
      supplierTier: 'TIER_2_STANDARD',
      paymentTerms: 'NET_30',
      vatNumber: '',
      crNumber: '',
      email: '',
      phoneNumber: '',
      address: '',
      bankDetails: ''
    });
    this.isDialogOpen.set(true);
  }

  openEditDialog(supplier: Supplier) {
    this.editingSupplierId.set(supplier.id);
    this.supplierForm.patchValue({
      name: supplier.name,
      category: supplier.category || 'MERCHANDISE',
      supplierTier: supplier.supplierTier || 'TIER_2_STANDARD',
      paymentTerms: supplier.paymentTerms || 'NET_30',
      vatNumber: supplier.vatNumber || '',
      crNumber: supplier.crNumber || '',
      email: supplier.email || '',
      phoneNumber: supplier.phoneNumber || '',
      address: supplier.address || '',
      bankDetails: supplier.bankDetails || ''
    });
    this.isDialogOpen.set(true);
  }

  saveSupplier() {
    if (this.supplierForm.invalid) {
      this.supplierForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.supplierForm.value;
    const payload: SupplierPayload = {
      name: formVal.name!,
      category: formVal.category || 'MERCHANDISE',
      supplierTier: formVal.supplierTier || 'TIER_2_STANDARD',
      paymentTerms: formVal.paymentTerms || 'NET_30',
      vatNumber: formVal.vatNumber || null,
      crNumber: formVal.crNumber || null,
      email: formVal.email || null,
      phoneNumber: formVal.phoneNumber || null,
      address: formVal.address || null,
      bankDetails: formVal.bankDetails || null
    };

    const editId = this.editingSupplierId();
    const req$ = editId
      ? this.suppliersService.updateSupplier(editId, payload)
      : this.suppliersService.createSupplier(payload);

    req$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isDialogOpen.set(false);
        this.loadSuppliers();
      },
      error: (err) => {
        console.error('Error saving supplier', err);
        this.isSubmitting.set(false);
      }
    });
  }

  deleteSupplier(supplier: Supplier) {
    if (confirm(`Are you sure you want to delete supplier "${supplier.name}"?`)) {
      this.suppliersService.deleteSupplier(supplier.id).subscribe({
        next: () => this.loadSuppliers(),
        error: (err) => console.error('Error deleting supplier', err)
      });
    }
  }

  getTierSeverity(tier?: string | null): 'success' | 'info' | 'warn' | 'secondary' {
    switch (tier) {
      case 'TIER_1_STRATEGIC':
        return 'success';
      case 'TIER_2_STANDARD':
        return 'info';
      case 'TIER_3_SECONDARY':
        return 'secondary';
      default:
        return 'info';
    }
  }
}
