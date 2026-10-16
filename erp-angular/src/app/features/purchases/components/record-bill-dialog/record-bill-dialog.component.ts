import { Component, EventEmitter, Input, Output, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { PurchasesService } from '../../../../core/services/purchases.service';
import { Supplier } from '../../../../core/models/purchases.models';

@Component({
  selector: 'app-record-bill-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TextareaModule,
    TableModule
  ],
  templateUrl: './record-bill-dialog.component.html',
  styleUrls: ['./record-bill-dialog.component.scss']
})
export class RecordBillDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private purchasesService = inject(PurchasesService);

  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() billSaved = new EventEmitter<void>();

  suppliers = signal<Supplier[]>([]);
  isSubmitting = signal(false);

  billForm = this.fb.group({
    supplierId: ['', Validators.required],
    billNumber: [`BILL-${Date.now().toString().slice(-6)}`, Validators.required],
    issueDate: [new Date().toISOString().substring(0, 10), Validators.required],
    dueDate: [
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      Validators.required
    ],
    discountAmount: [0, [Validators.min(0)]],
    remarks: [''],
    items: this.fb.array([])
  });

  get items(): FormArray {
    return this.billForm.get('items') as FormArray;
  }

  ngOnInit() {
    this.loadSuppliers();
    this.addItem(); // Start with at least 1 line item
  }

  loadSuppliers() {
    this.purchasesService.getSuppliers().subscribe({
      next: (data) => this.suppliers.set(data),
      error: () => this.suppliers.set([])
    });
  }

  addItem() {
    const itemGroup = this.fb.group({
      description: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      vatRate: [15]
    });
    this.items.push(itemGroup);
  }

  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  getItemTotal(index: number): number {
    const item = this.items.at(index).value;
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return qty * price;
  }

  getItemVat(index: number): number {
    const item = this.items.at(index).value;
    const subtotal = this.getItemTotal(index);
    const rate = Number(item.vatRate) || 15;
    return (subtotal * rate) / 100;
  }

  get subtotal(): number {
    let sum = 0;
    for (let i = 0; i < this.items.length; i++) {
      sum += this.getItemTotal(i);
    }
    return sum;
  }

  get totalVat(): number {
    let sum = 0;
    for (let i = 0; i < this.items.length; i++) {
      sum += this.getItemVat(i);
    }
    return sum;
  }

  get grandTotal(): number {
    const discount = Number(this.billForm.get('discountAmount')?.value) || 0;
    return Math.max(0, this.subtotal + this.totalVat - discount);
  }

  close() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onSubmit() {
    if (this.billForm.invalid) {
      this.billForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.billForm.value;

    const payload = {
      supplierId: formVal.supplierId!,
      billNumber: formVal.billNumber!,
      issueDate: formVal.issueDate!,
      dueDate: formVal.dueDate || undefined,
      subtotalAmount: this.subtotal,
      discountAmount: Number(formVal.discountAmount) || 0,
      vatAmount: this.totalVat,
      totalAmount: this.grandTotal,
      paidAmount: 0,
      paymentStatus: 'UNPAID',
      remarks: formVal.remarks || '',
      items: formVal.items?.map((it: any) => ({
        description: it.description,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        vatRate: Number(it.vatRate),
        subtotal: Number(it.quantity) * Number(it.unitPrice),
        vatAmount: (Number(it.quantity) * Number(it.unitPrice) * Number(it.vatRate)) / 100,
        total: (Number(it.quantity) * Number(it.unitPrice)) * (1 + Number(it.vatRate) / 100)
      }))
    };

    this.purchasesService.createBill(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.billSaved.emit();
        this.close();
      },
      error: (err) => {
        console.error('Error recording bill', err);
        this.isSubmitting.set(false);
      }
    });
  }
}
