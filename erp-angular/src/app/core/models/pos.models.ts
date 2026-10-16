export interface PosProduct {
  id: string;
  name: string;
  productName?: string;
  price: number;
  baseSellingPrice?: number;
  sku?: string;
  barcode?: string;
  category?: string;
  stockQuantity?: number;
  stockInHand?: number;
  description?: string;
  imageUrl?: string;
  imageUrls?: string[];
  images?: { imageUrl: string; isPrimary?: boolean }[];
}

export interface CartItem {
  product: PosProduct;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CheckoutPayload {
  items: {
    productId: string;
    quantity: number;
  }[];
  buyerName?: string;
  buyerPhone?: string;
  clientId?: string | null;
  paymentMethod?: string;
  totalDiscount?: number;
  deliveryType?: 'take_away' | 'delivery' | 'dine_in';
  deliveryDetails?: {
    tableNumber?: string | null;
    deliveryAddress?: string | null;
    deliveryFee?: number;
    note?: string | null;
  } | null;
}

export interface CheckoutResponse {
  success: boolean;
  invoiceId: string;
  invoiceNumber: string;
  qrCodeBase64?: string;
  totalAmount: number;
  deliveryOrder?: any;
}

export interface HeldCart {
  id: string;
  buyerName: string;
  buyerPhone?: string;
  clientId?: string | null;
  clientVat?: string | null;
  items: CartItem[];
  orderType: 'take_away' | 'delivery' | 'dine_in';
  tableNumber?: string;
  discountAmount: number;
  totalAmount: number;
  heldAt: Date;
}

