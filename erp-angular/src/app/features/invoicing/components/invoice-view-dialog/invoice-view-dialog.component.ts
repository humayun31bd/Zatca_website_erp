import { Component, EventEmitter, Input, Output, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InvoicesService } from '../../../../core/services/invoices.service';
import { Invoice } from '../../../../core/models/invoice.models';
import { getZatcaQrDataUrl } from '../../../../core/utils/zatca-qr.util';

@Component({
  selector: 'app-invoice-view-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, TagModule],
  templateUrl: './invoice-view-dialog.component.html',
  styleUrls: ['./invoice-view-dialog.component.scss']
})
export class InvoiceViewDialogComponent implements OnChanges {
  private invoicesService = inject(InvoicesService);

  @Input() visible = false;
  @Input() invoiceId: string | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();

  invoice = signal<Invoice | null>(null);
  qrCodeUrl = signal<string>('');
  isLoading = signal(false);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['invoiceId'] && this.invoiceId && this.visible) {
      this.loadInvoice(this.invoiceId);
    }
  }

  loadInvoice(id: string) {
    this.isLoading.set(true);
    this.qrCodeUrl.set('');
    this.invoicesService.getInvoiceById(id).subscribe({
      next: async (data) => {
        this.invoice.set(data);
        if (data) {
          const qr = await getZatcaQrDataUrl(data.qrCodeBase64, {
            sellerName: data.sellerName || 'ZATCA CLOUD ERP',
            vatNumber: data.sellerVat || '310123456700003',
            issueDate: data.issueDatetime || data.createdAt,
            totalAmount: data.totalAmount,
            totalVatAmount: data.totalVatAmount
          });
          this.qrCodeUrl.set(qr);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load invoice details', err);
        this.isLoading.set(false);
      }
    });
  }

  close() {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  printInvoice() {
    window.print();
  }
}
