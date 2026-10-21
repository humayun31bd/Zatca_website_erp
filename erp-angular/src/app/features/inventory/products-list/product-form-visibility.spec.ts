import { DEFAULT_PRODUCT_POLICY, resolveProductFormVisibility } from './product-form-visibility';

describe('resolveProductFormVisibility', () => {
  it('keeps name, sku, selling price, and VAT always visible', () => {
    const vis = resolveProductFormVisibility({
      enableStockManagement: false,
      enableTaxRates: false,
      enableCategories: false
    });

    expect(vis.alwaysOn.name).toBe(true);
    expect(vis.alwaysOn.skuBarcode).toBe(true);
    expect(vis.alwaysOn.sellingPrice).toBe(true);
    expect(vis.alwaysOn.vat).toBe(true);
  });

  it('hides stock tab and low-stock field when stock management is off', () => {
    const vis = resolveProductFormVisibility({
      enableStockManagement: false,
      enableLowStockAlert: true
    });

    expect(vis.stock).toBe(false);
    expect(vis.lowStockAlert).toBe(false);
    expect(vis.showStockTab).toBe(false);
  });

  it('shows low-stock only when stock management and the alert flag are on', () => {
    const vis = resolveProductFormVisibility({
      enableStockManagement: true,
      enableLowStockAlert: true
    });

    expect(vis.stock).toBe(true);
    expect(vis.lowStockAlert).toBe(true);
    expect(vis.showStockTab).toBe(true);
  });

  it('gates catalog fields from core product-settings flags', () => {
    const vis = resolveProductFormVisibility({
      enableCategories: false,
      enableSubCategories: true,
      enableUnits: false,
      enableSellingPriceGroup: true,
      enableBarcodePrinting: false
    });

    expect(vis.categories).toBe(false);
    expect(vis.subCategories).toBe(false);
    expect(vis.units).toBe(false);
    expect(vis.sellingPriceGroup).toBe(true);
    expect(vis.barcodePrinting).toBe(false);
  });

  it('gates pricing policy flags for discount, excise, tax-free, and publish', () => {
    const vis = resolveProductFormVisibility({
      enableDiscountable: false,
      enableExcise: true,
      enableTaxFree: false,
      enablePublishEcommerce: true,
      enableTaxRates: false
    });

    expect(vis.discountable).toBe(false);
    expect(vis.excise).toBe(true);
    expect(vis.taxFree).toBe(false);
    expect(vis.publishEcommerce).toBe(true);
    expect(vis.taxRates).toBe(false);
  });

  it('gates vertical fields and hides the verticals tab when none apply', () => {
    const vis = resolveProductFormVisibility({
      enableImeiSerial: false,
      enableWarrantyTracking: false,
      enableProductExpiry: false,
      enableLotNumber: false,
      enablePrescription: false,
      enableVariableProduct: false,
      enableMatrixVariants: false,
      enableServiceItems: false,
      enableWeightScale: false
    });

    expect(vis.imeiSerial).toBe(false);
    expect(vis.warranty).toBe(false);
    expect(vis.productExpiry).toBe(false);
    expect(vis.lotNumber).toBe(false);
    expect(vis.prescription).toBe(false);
    expect(vis.showVerticalsTab).toBe(false);
  });

  it('shows verticals tab when any serial, expiry, lot, or prescription flag is on', () => {
    const vis = resolveProductFormVisibility({
      ...DEFAULT_PRODUCT_POLICY,
      enableImeiSerial: true
    });

    expect(vis.imeiSerial).toBe(true);
    expect(vis.showVerticalsTab).toBe(true);
    expect(vis.showElectronics).toBe(true);
  });

  it('shows pharmacy fields when expiry, lot, or prescription is enabled', () => {
    const vis = resolveProductFormVisibility({
      enableProductExpiry: true,
      enableLotNumber: true,
      enablePrescription: false
    });

    expect(vis.productExpiry).toBe(true);
    expect(vis.lotNumber).toBe(true);
    expect(vis.showPharmacy).toBe(true);
  });

  it('falls back to default catalog flags when policy is empty', () => {
    const vis = resolveProductFormVisibility(null);

    expect(vis.stock).toBe(true);
    expect(vis.categories).toBe(true);
    expect(vis.units).toBe(true);
    expect(vis.imeiSerial).toBe(false);
    expect(vis.productExpiry).toBe(false);
  });

  it('keeps stock tab when expiry or lot is on even if stock tracking is off', () => {
    const vis = resolveProductFormVisibility({
      enableStockManagement: false,
      enableProductExpiry: true,
      enableLotNumber: true
    });

    expect(vis.stock).toBe(false);
    expect(vis.showStockTab).toBe(true);
    expect(vis.productExpiry).toBe(true);
    expect(vis.lotNumber).toBe(true);
  });

  it('does not show verticals tab for variable products alone', () => {
    const vis = resolveProductFormVisibility({
      enableVariableProduct: true,
      enableImeiSerial: false,
      enableWarrantyTracking: false,
      enableProductExpiry: false,
      enableLotNumber: false,
      enablePrescription: false,
      enableMatrixVariants: false,
      enableServiceItems: false,
      enableWeightScale: false
    });

    expect(vis.variableProduct).toBe(true);
    expect(vis.showVerticalsTab).toBe(false);
  });
});
