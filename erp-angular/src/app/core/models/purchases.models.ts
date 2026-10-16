export interface Supplier {
  id: string;
  name: string;
  taxNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface BillLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  subtotal: number;
  vatAmount: number;
  total: number;
}

export interface SupplierBill {
  id: string;
  tenantId: string;
  billNumber: string;
  supplierId: string;
  supplierName: string;
  poId?: string | null;
  grnId?: string | null;
  issueDate: string;
  dueDate?: string | null;
  subtotalAmount: string;
  discountAmount: string;
  vatAmount: string;
  totalAmount: string;
  paidAmount: string;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  referenceDocUrl?: string | null;
  referenceDocName?: string | null;
  remarks?: string;
  createdAt: string;
}

export interface CreateBillPayload {
  supplierId: string;
  supplierName?: string;
  billNumber?: string;
  poId?: string;
  grnId?: string;
  issueDate: string;
  dueDate?: string;
  subtotalAmount: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  paidAmount?: number;
  paymentStatus?: string;
  remarks?: string;
  items?: BillLineItem[];
}
