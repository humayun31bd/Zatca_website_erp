import { Component, EventEmitter, Input, Output, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { InvoicesService } from '../../../../core/services/invoices.service';
import { ClientsService } from '../../../../core/services/clients.service';
import { Client } from '../../../../core/models/parties.models';
import { CreateInvoicePayload } from '../../../../core/models/invoice.models';

@Component({
  selector: 'app-create-invoice-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    SelectModule
  ],
  templateUrl: './create-invoice-dialog.component.html',
  styleUrls: ['./create-invoice-dialog.component.scss']
})
export class CreateInvoiceDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private invoicesService = inject(InvoicesService);
  private clientsService = inject(ClientsService);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() invoiceCreated = new EventEmitter<void>();

  clients = signal<Client[]>([]);
  isSubmitting = signal(false);

  readonly invoiceTypes = [
    { label: 'Standard Tax Invoice (B2B)', value: 'STANDARD' },
    { label: 'Simplified Tax Invoice (B2C)', value: 'SIMPLIFIED' }
  ];

  readonly typeCodes = [
    { label: '388 - Commercial Tax Invoice', value: '388' },
    { label: '381 - Credit Note', value: '381' },
    { label: '383 - Debit Note', value: '383' }
  ];

  readonly paymentMethods = [
    { label: 'Cash', value: 'CASH' },
    { label: 'Credit Card / Mada', value: 'CARD' },
    { label: 'Bank Transfer', value: 'BANK_TRANSFER' }
  ];

  invoiceForm = this.fb.group({
    invoiceType: ['STANDARD', Validators.required],
    typeCode: ['388', Validators.required],
    clientId: [''],
    buyerName: ['', Validators.required],
    buyerVat: [''],
    buyerPhone: [''],
    buyerAddress: [''],
    discountAmount: [0, [Validators.min(0)]],
    paymentMethod: ['CASH'],
    isPaidInFull: [true],
    items: this.fb.array([])
  });

  get items(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  ngOnInit() {
    this.loadClients();
    this.addItem(); // Start with at least 1 item
  }

  loadClients() {
    this.clientsService.getClients().subscribe({
      next: (data) => this.clients.set(data || []),
      error: () => this.clients.set([])
    });
  }

  onClientSelect(clientId: string) {
    const selected = this.clients().find(c => c.id === clientId);
    if (selected) {
      this.invoiceForm.patchValue({
        buyerName: selected.name,
        buyerVat: selected.vatNumber || '',
        buyerPhone: selected.phoneNumber || '',
        buyerAddress: selected.address || selected.city || ''
      });
    }
  }

  addItem() {
    const itemGroup = this.fb.group({
      description: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      discountAmount: [0]
    });
    this.items.push(itemGroup);
  }

  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  getItemSubtotal(index: number): number {
    const it = this.items.at(index).value;
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const disc = Number(it.discountAmount) || 0;
    return Math.max(0, (qty * price) - disc);
  }

  getItemVat(index: number): number {
    return this.getItemSubtotal(index) * 0.15; // 15% VAT
  }

  get subtotal(): number {
    let sum = 0;
    for (let i = 0; i < this.items.length; i++) {
      sum += this.getItemSubtotal(i);
    }
    return sum;
  }

  get totalVat(): number {
    return this.subtotal * 0.15;
  }

  get grandTotal(): number {
    const discount = Number(this.invoiceForm.get('discountAmount')?.value) || 0;
    return Math.max(0, this.subtotal + this.totalVat - discount);
  }

  close() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onSubmit() {
    if (this.invoiceForm.invalid) {
      this.invoiceForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.invoiceForm.value;

    const lineItemsData = formVal.items?.map((it: any, idx: number) => {
      const qty = Number(it.quantity) || 1;
      const unitPrice = Number(it.unitPrice) || 0;
      const disc = Number(it.discountAmount) || 0;
      const taxable = Math.max(0, (qty * unitPrice) - disc);
      const taxAmount = taxable * 0.15;
      return {
        lineNumber: idx + 1,
        description: it.description || 'Item',
        quantity: qty,
        unitPrice,
        discountAmount: disc,
        taxPercent: 15,
        taxAmount,
        lineTotal: taxable + taxAmount
      };
    }) || [];

    const isPaid = formVal.isPaidInFull;
    const payload: CreateInvoicePayload = {
      invoiceType: formVal.invoiceType as any || 'STANDARD',
      typeCode: formVal.typeCode || '388',
      buyer: {
        name: formVal.buyerName!,
        vatNumber: formVal.buyerVat || undefined,
        phone: formVal.buyerPhone || undefined,
        address: formVal.buyerAddress || undefined
      },
      lineItems: lineItemsData,
      subtotalAmount: this.subtotal,
      discountAmount: Number(formVal.discountAmount) || 0,
      totalVatAmount: this.totalVat,
      totalAmount: this.grandTotal,
      currencyCode: 'SAR',
      payments: [
        {
          method: formVal.paymentMethod || 'CASH',
          amount: isPaid ? this.grandTotal : 0
        }
      ]
    };

    this.invoicesService.createInvoice(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.invoiceCreated.emit();
        this.close();
      },
      error: (err) => {
        console.error('Failed to create invoice', err);
        this.isSubmitting.set(false);
      }
    });
  }
}
