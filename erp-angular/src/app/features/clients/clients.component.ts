import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ClientsService } from '../../core/services/clients.service';
import { Client, ClientPayload } from '../../core/models/parties.models';
import { CustomerDetailDialogComponent } from './customer-detail-dialog/customer-detail-dialog.component';

export type QuickFilterKey = 'ALL' | 'BUSINESS' | 'INDIVIDUAL' | 'GOVERNMENT' | 'WITH_DUES' | 'CREDIT';

@Component({
  selector: 'app-clients',
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
    ToggleSwitchModule,
    TooltipModule,
    ProgressBarModule,
    CustomerDetailDialogComponent
  ],
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss']
})
export class ClientsComponent implements OnInit {
  private clientsService = inject(ClientsService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  clients = signal<Client[]>([]);
  isLoading = signal(false);
  isSubmitting = signal(false);

  // View Mode: Table vs Grid/Card
  viewMode = signal<'table' | 'grid'>('table');

  // Modal Dialogs
  isDialogOpen = signal(false);
  editingClientId = signal<string | null>(null);

  // Profile Detail / Ledger Dialog
  selectedClientForDetail = signal<Client | null>(null);
  isDetailDialogOpen = signal(false);

  // Filter State
  searchQuery = signal('');
  activeQuickFilter = signal<QuickFilterKey>('ALL');

  readonly formCustomerTypes = [
    { label: 'Business (B2B)', value: 'BUSINESS' },
    { label: 'Individual (B2C)', value: 'INDIVIDUAL' },
    { label: 'Government (B2G)', value: 'GOVERNMENT' }
  ];

  clientForm = this.fb.group({
    name: ['', Validators.required],
    nameAr: [''],
    customerType: ['BUSINESS'],
    vatNumber: ['', [Validators.pattern('^[0-9]{15}$')]],
    crNumber: [''],
    email: ['', [Validators.email]],
    phoneNumber: [''],
    address: [''],
    city: ['Riyadh'],
    state: ['Riyadh Province'],
    country: ['Saudi Arabia'],
    creditLimit: [0],
    permitCredit: [false]
  });

  // Filtered Clients computation
  filteredClients = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.activeQuickFilter();

    return this.clients().filter(c => {
      const matchesSearch =
        !query ||
        c.name.toLowerCase().includes(query) ||
        (c.nameAr && c.nameAr.toLowerCase().includes(query)) ||
        (c.phoneNumber && c.phoneNumber.toLowerCase().includes(query)) ||
        (c.vatNumber && c.vatNumber.toLowerCase().includes(query)) ||
        (c.crNumber && c.crNumber.toLowerCase().includes(query)) ||
        (c.city && c.city.toLowerCase().includes(query));

      let matchesFilter = true;
      if (filter === 'BUSINESS') matchesFilter = c.customerType === 'BUSINESS';
      else if (filter === 'INDIVIDUAL') matchesFilter = c.customerType === 'INDIVIDUAL';
      else if (filter === 'GOVERNMENT') matchesFilter = c.customerType === 'GOVERNMENT';
      else if (filter === 'WITH_DUES') matchesFilter = (Number(c.dues) || 0) > 0;
      else if (filter === 'CREDIT') matchesFilter = !!c.permitCredit;

      return matchesSearch && matchesFilter;
    });
  });

  // KPI Computations
  totalClientsCount = computed(() => this.clients().length);
  
  businessClientsCount = computed(() => {
    return this.clients().filter(c => c.customerType === 'BUSINESS').length;
  });

  totalOutstandingDues = computed(() => {
    return this.clients().reduce((sum, c) => sum + (Number(c.dues) || 0), 0);
  });

  creditEnabledCount = computed(() => {
    return this.clients().filter(c => c.permitCredit).length;
  });

  ngOnInit() {
    this.loadClients();
  }

  loadClients() {
    this.isLoading.set(true);
    this.clientsService.getClients().subscribe({
      next: (data) => {
        this.clients.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading clients', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load customers from server'
        });
        this.isLoading.set(false);
      }
    });
  }

  openCreateDialog() {
    this.editingClientId.set(null);
    this.clientForm.reset({
      name: '',
      nameAr: '',
      customerType: 'BUSINESS',
      vatNumber: '',
      crNumber: '',
      email: '',
      phoneNumber: '',
      address: '',
      city: 'Riyadh',
      state: 'Riyadh Province',
      country: 'Saudi Arabia',
      creditLimit: 0,
      permitCredit: false
    });
    this.isDialogOpen.set(true);
  }

  openEditDialog(client: Client) {
    this.editingClientId.set(client.id);
    this.clientForm.patchValue({
      name: client.name,
      nameAr: client.nameAr || '',
      customerType: client.customerType || 'BUSINESS',
      vatNumber: client.vatNumber || '',
      crNumber: client.crNumber || '',
      email: client.email || '',
      phoneNumber: client.phoneNumber || '',
      address: client.address || '',
      city: client.city || 'Riyadh',
      state: client.state || 'Riyadh Province',
      country: client.country || 'Saudi Arabia',
      creditLimit: client.creditLimit || 0,
      permitCredit: client.permitCredit ?? false
    });
    this.isDialogOpen.set(true);
  }

  openDetailDialog(client: Client) {
    this.selectedClientForDetail.set(client);
    this.isDetailDialogOpen.set(true);
  }

  saveClient() {
    if (this.clientForm.invalid) {
      this.clientForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Alert',
        detail: 'Please fill all required fields correctly (15-digit VAT if provided).'
      });
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.clientForm.value;
    const payload: ClientPayload = {
      name: formVal.name!,
      nameAr: formVal.nameAr || null,
      customerType: formVal.customerType || 'BUSINESS',
      vatNumber: formVal.vatNumber || null,
      crNumber: formVal.crNumber || null,
      email: formVal.email || null,
      phoneNumber: formVal.phoneNumber || null,
      address: formVal.address || null,
      city: formVal.city || null,
      state: formVal.state || null,
      country: formVal.country || null,
      creditLimit: Number(formVal.creditLimit) || 0,
      permitCredit: formVal.permitCredit ?? false
    };

    const editId = this.editingClientId();
    const req$ = editId
      ? this.clientsService.updateClient(editId, payload)
      : this.clientsService.createClient(payload);

    req$.subscribe({
      next: (savedClient) => {
        this.isSubmitting.set(false);
        this.isDialogOpen.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: editId ? `Customer "${payload.name}" updated successfully` : `Customer "${payload.name}" added successfully`
        });
        this.loadClients();

        // Update active detail dialog if currently viewing this client
        if (this.selectedClientForDetail()?.id === editId) {
          this.selectedClientForDetail.set({
            ...this.selectedClientForDetail()!,
            ...payload
          });
        }
      },
      error: (err) => {
        console.error('Error saving client', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Save Failed',
          detail: 'Unable to save customer information.'
        });
        this.isSubmitting.set(false);
      }
    });
  }

  deleteClient(client: Client) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete customer "${client.name}"? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-outlined p-button-sm',
      accept: () => {
        this.clientsService.deleteClient(client.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: `Customer "${client.name}" has been removed.`
            });
            this.loadClients();
            if (this.selectedClientForDetail()?.id === client.id) {
              this.isDetailDialogOpen.set(false);
            }
          },
          error: (err) => {
            console.error('Error deleting client', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Delete Failed',
              detail: 'Could not delete customer. Check if outstanding invoices exist.'
            });
          }
        });
      }
    });
  }

  exportCsv() {
    const data = this.filteredClients().map(c => ({
      Name: c.name,
      ArabicName: c.nameAr || '',
      CustomerType: c.customerType || 'BUSINESS',
      VAT_TIN: c.vatNumber || '',
      CR_Number: c.crNumber || '',
      Phone: c.phoneNumber || '',
      Email: c.email || '',
      City: c.city || '',
      CreditLimit: c.creditLimit || 0,
      OutstandingDues: c.dues || 0
    }));

    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customers_directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.messageService.add({
      severity: 'info',
      summary: 'Export Complete',
      detail: `${data.length} customer records exported to CSV`
    });
  }

  printDirectory() {
    window.print();
  }

  getTypeSeverity(type?: string | null): 'success' | 'info' | 'warn' | 'secondary' {
    switch (type) {
      case 'BUSINESS': return 'info';
      case 'INDIVIDUAL': return 'success';
      case 'GOVERNMENT': return 'warn';
      default: return 'secondary';
    }
  }
}
