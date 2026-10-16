import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProductItem {
  id: string;
  tenantId?: string;
  name: string;
  productName?: string;
  sku?: string | null;
  barcode?: string | null;
  description?: string | null;
  price: string | number;
  baseSellingPrice?: string | number;
  costPrice?: string | null;
  marginPercentage?: number;
  retailPrice?: string | number | null;
  distributorPrice?: string | number | null;
  specialPrice?: string | number | null;
  discountAmount?: number;
  discountedPrice?: string | number | null;
  stockQuantity: number;
  stockInHand?: number;
  minStockLevel: number;
  minOrderQty?: number;
  categoryId?: string | null;
  subCategoryId?: string | null;
  brandId?: string | null;
  productTypeId?: string | null;
  unitId?: string | null;
  taxCategoryId?: string | null;
  isTaxExempt?: boolean;
  taxRate?: number;
  isActive: boolean;

  // Weight & Packaging
  isWeightBased?: boolean;
  weight?: number;
  isPacketOfPieces?: boolean;
  packetSize?: number;

  // Industry verticals
  isElectronics?: boolean;
  modelNumber?: string | null;
  storageCapacity?: string | null;
  ram?: string | null;
  warrantyMonths?: number;
  isImeiRequired?: boolean;
  requiresSerialTracking?: boolean;

  isMedicine?: boolean;
  isPharmacy?: boolean;
  genericName?: string | null;
  activeIngredient?: string | null;
  controlledSubstanceSchedule?: string | null;
  isPrescriptionRequired?: boolean;
  requiresBatchTracking?: boolean;

  isApparel?: boolean;
  fiberComposition?: string | null;
  isUnderwear?: boolean;

  // Channels
  isProductDisplayPosApp?: boolean;
  isProductDisplayWebsiteApp?: boolean;
  isProductDisplayRackLabel?: boolean;
  returnDays?: number;
  exchangeDays?: number;

  imageUrls?: string[];
  images?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductCategory {
  id: string;
  tenantId?: string;
  name: string;
  description?: string | null;
  createdAt?: string;
}

export interface ProductSubCategory {
  id: string;
  tenantId?: string;
  categoryId: string;
  name: string;
  description?: string | null;
}

export interface ProductUnit {
  id: string;
  tenantId?: string;
  name: string;
  shortName: string;
  baseUnit?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private http = inject(HttpClient);
  private productsUrl = '/api/v1/inventory/products';
  private categoriesUrl = '/api/v1/inventory/categories';
  private subCategoriesUrl = '/api/v1/inventory/sub-categories';
  private unitsUrl = '/api/v1/inventory/units';

  getProducts(): Observable<ProductItem[]> {
    return this.http.get<ProductItem[]>(this.productsUrl);
  }

  getProduct(id: string): Observable<ProductItem> {
    return this.http.get<ProductItem>(`${this.productsUrl}/${id}`);
  }

  createProduct(product: Partial<ProductItem>): Observable<ProductItem> {
    return this.http.post<ProductItem>(this.productsUrl, product);
  }

  updateProduct(id: string, product: Partial<ProductItem>): Observable<ProductItem> {
    return this.http.put<ProductItem>(`${this.productsUrl}/${id}`, product);
  }

  deleteProduct(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.productsUrl}/${id}`);
  }

  getCategories(): Observable<ProductCategory[]> {
    return this.http.get<ProductCategory[]>(this.categoriesUrl);
  }

  createCategory(category: { name: string; description?: string }): Observable<ProductCategory> {
    return this.http.post<ProductCategory>(this.categoriesUrl, category);
  }

  updateCategory(id: string, category: { name: string; description?: string }): Observable<ProductCategory> {
    return this.http.put<ProductCategory>(`${this.categoriesUrl}/${id}`, category);
  }

  deleteCategory(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.categoriesUrl}/${id}`);
  }

  getSubCategories(categoryId?: string): Observable<ProductSubCategory[]> {
    const url = categoryId ? `${this.subCategoriesUrl}?categoryId=${categoryId}` : this.subCategoriesUrl;
    return this.http.get<ProductSubCategory[]>(url);
  }

  createSubCategory(subCategory: { name: string; categoryId: string; description?: string }): Observable<ProductSubCategory> {
    return this.http.post<ProductSubCategory>(this.subCategoriesUrl, subCategory);
  }

  updateSubCategory(id: string, subCategory: { name: string; categoryId: string; description?: string }): Observable<ProductSubCategory> {
    return this.http.put<ProductSubCategory>(`${this.subCategoriesUrl}/${id}`, subCategory);
  }

  deleteSubCategory(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.subCategoriesUrl}/${id}`);
  }

  getUnits(): Observable<ProductUnit[]> {
    return this.http.get<ProductUnit[]>(this.unitsUrl);
  }
}
