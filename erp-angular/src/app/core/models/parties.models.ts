export interface Client {
  id: string;
  tenantId?: string;
  name: string;
  nameAr?: string | null;
  vatNumber?: string | null;
  crNumber?: string | null;
  address?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  customerType?: 'INDIVIDUAL' | 'BUSINESS' | 'GOVERNMENT' | string | null;
  funds?: number | null;
  dues?: number | null;
  permitCredit?: boolean;
  creditLimit?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type ClientPayload = Omit<Client, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>;

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  vatNumber?: string | null;
  crNumber?: string | null;
  address?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  bankDetails?: string | null;
  category?: 'MERCHANDISE' | 'SERVICES' | 'EQUIPMENT' | 'RAW_MATERIALS' | string;
  supplierTier?: 'TIER_1_STRATEGIC' | 'TIER_2_STANDARD' | 'TIER_3_SECONDARY' | string;
  paymentTerms?: 'IMMEDIATE' | 'NET_15' | 'NET_30' | 'NET_60' | 'NET_90' | string;
  createdAt?: string;
  updatedAt?: string;
}

export type SupplierPayload = Omit<Supplier, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>;
