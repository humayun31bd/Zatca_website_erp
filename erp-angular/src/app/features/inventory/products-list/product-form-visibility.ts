export type ProductPolicyFlags = Record<string, boolean | undefined>;

export const DEFAULT_PRODUCT_POLICY: Record<string, boolean> = {
  enableVariableProduct: true,
  enableStockManagement: true,
  enableBranches: true,
  enableCategories: true,
  enableSubCategories: true,
  enableUnits: true,
  enableTaxRates: true,
  enableGroupTax: false,
  enableLowStockAlert: true,
  enableBarcodePrinting: true,
  enableSellingPriceGroup: false,
  enableDiscountable: true,
  enableExcise: false,
  enableTaxFree: true,
  enablePublishEcommerce: false,
  enableProductExpiry: false,
  enableLowStockExpiryAlert: false,
  enableLotNumber: false,
  enableImeiSerial: false,
  enableWarrantyTracking: false,
  enableWeightScale: false,
  enablePriceEmbeddedBarcode: false,
  enablePrescription: false,
  enableServiceItems: false,
  enableStaffCommission: false,
  enableAppointments: false,
  enablePackageBundles: false,
  enableKds: false,
  enableRecipeBom: false,
  enableModifiers: false,
  enableGarmentTagging: false,
  enablePickupDelivery: false,
  enableMatrixVariants: false
};

export interface ProductFormVisibility {
  alwaysOn: {
    name: true;
    skuBarcode: true;
    sellingPrice: true;
    vat: true;
  };
  stock: boolean;
  lowStockAlert: boolean;
  categories: boolean;
  subCategories: boolean;
  units: boolean;
  taxRates: boolean;
  sellingPriceGroup: boolean;
  discountable: boolean;
  excise: boolean;
  taxFree: boolean;
  publishEcommerce: boolean;
  barcodePrinting: boolean;
  variableProduct: boolean;
  imeiSerial: boolean;
  warranty: boolean;
  productExpiry: boolean;
  lotNumber: boolean;
  prescription: boolean;
  weightScale: boolean;
  priceEmbeddedBarcode: boolean;
  serviceItems: boolean;
  matrixVariants: boolean;
  showStockTab: boolean;
  showVerticalsTab: boolean;
  showElectronics: boolean;
  showPharmacy: boolean;
  showApparel: boolean;
}

function flag(policy: ProductPolicyFlags, key: string): boolean {
  if (typeof policy[key] === 'boolean') return policy[key] as boolean;
  return DEFAULT_PRODUCT_POLICY[key] ?? false;
}

export function resolveProductFormVisibility(
  raw: ProductPolicyFlags | null | undefined
): ProductFormVisibility {
  const policy = raw || {};
  const stock = flag(policy, 'enableStockManagement');
  const categories = flag(policy, 'enableCategories');
  const imeiSerial = flag(policy, 'enableImeiSerial');
  const warranty = flag(policy, 'enableWarrantyTracking') && imeiSerial;
  const productExpiry = flag(policy, 'enableProductExpiry');
  const lotNumber = flag(policy, 'enableLotNumber');
  const prescription = flag(policy, 'enablePrescription');
  const variableProduct = flag(policy, 'enableVariableProduct');
  const matrixVariants = flag(policy, 'enableMatrixVariants');
  const serviceItems = flag(policy, 'enableServiceItems');
  const weightScale = flag(policy, 'enableWeightScale');

  const showElectronics = imeiSerial || warranty;
  const showPharmacy = productExpiry || lotNumber || prescription;
  const showApparel = matrixVariants;
  const showVerticalsTab = showElectronics || showPharmacy || showApparel || serviceItems;

  return {
    alwaysOn: {
      name: true,
      skuBarcode: true,
      sellingPrice: true,
      vat: true
    },
    stock,
    lowStockAlert: stock && flag(policy, 'enableLowStockAlert'),
    categories,
    subCategories: categories && flag(policy, 'enableSubCategories'),
    units: flag(policy, 'enableUnits'),
    taxRates: flag(policy, 'enableTaxRates'),
    sellingPriceGroup: flag(policy, 'enableSellingPriceGroup'),
    discountable: flag(policy, 'enableDiscountable'),
    excise: flag(policy, 'enableExcise'),
    taxFree: flag(policy, 'enableTaxFree'),
    publishEcommerce: flag(policy, 'enablePublishEcommerce'),
    barcodePrinting: flag(policy, 'enableBarcodePrinting'),
    variableProduct,
    imeiSerial,
    warranty,
    productExpiry,
    lotNumber,
    prescription,
    weightScale,
    priceEmbeddedBarcode: flag(policy, 'enablePriceEmbeddedBarcode'),
    serviceItems,
    matrixVariants,
    showStockTab: stock || productExpiry || lotNumber || weightScale,
    showVerticalsTab,
    showElectronics,
    showPharmacy,
    showApparel
  };
}

export function mergeProductPolicy(
  raw: Record<string, unknown> | null | undefined
): Record<string, boolean> {
  const merged = { ...DEFAULT_PRODUCT_POLICY };
  if (!raw) return merged;
  Object.keys(merged).forEach(key => {
    if (typeof raw[key] === 'boolean') merged[key] = raw[key] as boolean;
  });
  return merged;
}
