import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

function parseJsonSafe(val: any, fallback: any = []) {
  if (val === null || val === undefined) return fallback;
  if (Array.isArray(val) || (typeof val === "object" && val !== null)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifySession(request);
    if (!session || !session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = session.tenantId as string;

    const allProducts = await db.select().from(products)
      .where(eq(products.tenantId, tenantId))
      .orderBy(desc(products.createdAt));

    // Map for frontend compatibility while exposing all product fields
    const mapped = allProducts.map(p => ({
      ...p,
      productName: p.productName || p.name,
      name: p.name || p.productName,
      baseSellingPrice: p.baseSellingPrice ?? p.price,
      price: p.price ?? p.baseSellingPrice,
      sku: p.sku || p.barcode,
      stockQuantity: p.stockQuantity ?? p.stockInHand,
      stockInHand: p.stockInHand ?? p.stockQuantity,
      minStockLevel: p.minStockLevel ?? p.minOrderQty,
      minOrderQty: p.minOrderQty ?? p.minStockLevel,
      sizeVariantIds: parseJsonSafe(p.sizeVariantIds, []),
      imageUrls: parseJsonSafe((p as any).imageUrls, []),
      units: parseJsonSafe((p as any).units, []),
      branchInventory: parseJsonSafe((p as any).branchInventory, []),
      images: parseJsonSafe((p as any).images, []),
    }));

    return NextResponse.json(mapped);
  } catch (error: any) {
    console.error("GET Products error:", error);
    return NextResponse.json({ error: "Failed to fetch products", details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession(request);
    if (!session || !session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = session.tenantId as string;

    const body = await request.json();
    const productName = body.productName || body.name || "Untitled Product";
    const price = body.baseSellingPrice ?? body.price ?? 0;
    
    const [newProduct] = await db.insert(products).values({
      tenantId,
      name: productName,
      productName: productName,
      price: price,
      baseSellingPrice: price,
      costPrice: body.costPrice,
      sku: body.sku || body.barcode,
      barcode: body.barcode || body.sku,
      description: body.description,
      categoryId: body.categoryId,
      brandId: body.brandId,
      productTypeId: body.productTypeId,
      unitId: body.unitId,
      sizeId: body.sizeId,
      colorId: body.colorId,
      taxCategoryId: body.taxCategoryId,
      isCategoryWiseStock: body.isCategoryWiseStock ?? false,
      isProductWiseStock: body.isProductWiseStock ?? false,
      isParentProduct: body.isParentProduct ?? false,
      parentProductId: body.parentProductId,
      isPacketOfPieces: body.isPacketOfPieces ?? false,
      packetSize: body.packetSize ?? 1,
      isWeightBased: body.isWeightBased ?? false,
      weight: body.weight ?? 1,
      marginPercentage: body.marginPercentage ?? 20,
      retailPrice: body.retailPrice ?? price,
      distributorPrice: body.distributorPrice ?? price,
      specialPrice: body.specialPrice ?? price,
      discountAmount: body.discountAmount ?? 0,
      discountedPrice: body.discountedPrice,
      stockQuantity: body.stockQuantity ?? body.stockInHand ?? 0,
      stockInHand: body.stockInHand ?? body.stockQuantity ?? 0,
      minStockLevel: body.minStockLevel ?? body.minOrderQty ?? 5,
      minOrderQty: body.minOrderQty ?? body.minStockLevel ?? 0,
      isWholesaler: body.isWholesaler ?? false,
      isDistributor: body.isDistributor ?? false,
      isPharmacy: body.isPharmacy ?? false,
      isElectronics: body.isElectronics ?? false,
      isModelNumber: body.isModelNumber ?? false,
      modelNumber: body.modelNumber,
      isColorApplicable: body.isColorApplicable ?? false,
      isStorageCapacityApplicable: body.isStorageCapacityApplicable ?? false,
      storageCapacity: body.storageCapacity,
      storageCapacityId: body.storageCapacityId,
      isRamApplicable: body.isRamApplicable ?? false,
      ram: body.ram,
      ramId: body.ramId,
      isWarrantyApplicable: body.isWarrantyApplicable ?? false,
      warrantyMonths: body.warrantyMonths ?? 0,
      warrantyPeriodsDays: body.warrantyPeriodsDays ?? 0,
      warrantyProviderId: body.warrantyProviderId,
      isImeiRequired: body.isImeiRequired ?? false,
      requiresSerialTracking: body.requiresSerialTracking ?? false,
      isColorVariant: body.isColorVariant ?? false,
      colorVariantId: body.colorVariantId,
      isSizeVariant: body.isSizeVariant ?? false,
      sizeVariantId: body.sizeVariantId,
      sizeVariantIds: body.sizeVariantIds ?? [],
      isMedicine: body.isMedicine ?? false,
      isGenericNameApplicable: body.isGenericNameApplicable ?? false,
      genericName: body.genericName,
      isActiveIngredientApplicable: body.isActiveIngredientApplicable ?? false,
      activeIngredient: body.activeIngredient,
      isStrengthApplicable: body.isStrengthApplicable ?? false,
      strengthId: body.strengthId,
      isDosageFormApplicable: body.isDosageFormApplicable ?? false,
      dosageFormId: body.dosageFormId,
      isManufacturerApplicable: body.isManufacturerApplicable ?? false,
      manufacturerId: body.manufacturerId,
      isMarketingAuthHolderApplicable: body.isMarketingAuthHolderApplicable ?? false,
      marketingAuthHolderId: body.marketingAuthHolderId,
      isPrescriptionRequired: body.isPrescriptionRequired ?? false,
      controlledSubstanceSchedule: body.controlledSubstanceSchedule,
      storageConditionId: body.storageConditionId,
      requiresBatchTracking: body.requiresBatchTracking ?? false,
      isApparel: body.isApparel ?? false,
      apparelProductTypeId: body.apparelProductTypeId,
      fiberComposition: body.fiberComposition,
      genderId: body.genderId,
      ageGroupId: body.ageGroupId,
      isUnderwear: body.isUnderwear ?? false,
      isTaxExempt: body.isTaxExempt ?? false,
      isPointsApplicable: body.isPointsApplicable ?? false,
      pointsPerProduct: body.pointsPerProduct ?? 0,
      isProductDisplayPosApp: body.isProductDisplayPosApp ?? true,
      isProductDisplayWebsiteApp: body.isProductDisplayWebsiteApp ?? false,
      isProductDisplayRackLabel: body.isProductDisplayRackLabel ?? false,
      isProductDisplayTag: body.isProductDisplayTag ?? false,
      isProductDisplayPriceTag: body.isProductDisplayPriceTag ?? false,
      isProductDisplayHangingTag: body.isProductDisplayHangingTag ?? false,
      isProductDisplayElectronicScale: body.isProductDisplayElectronicScale ?? false,
      isProductDisplayWeighingScale: body.isProductDisplayWeighingScale ?? false,
      isVerifiedByBuyer: body.isVerifiedByBuyer ?? false,
      isVerifiedBySupplier: body.isVerifiedBySupplier ?? false,
      isOffers: body.isOffers ?? false,
      returnDays: body.returnDays ?? 7,
      exchangeDays: body.exchangeDays ?? 30,
      promisedDeliveryDays: body.promisedDeliveryDays ?? 2,
      isPaymentAvailableCod: body.isPaymentAvailableCod ?? true,
      isAcceleratedCheckoutAvailable: body.isAcceleratedCheckoutAvailable ?? false,
      isSubscriptionAvailable: body.isSubscriptionAvailable ?? false,
      isActive: body.isActive ?? true,
    }).returning();

    // Insert associated images
    let insertedImages: any[] = [];
    if (Array.isArray(body.images) && body.images.length > 0) {
      const { productImages } = await import("@/lib/db/product_schema");
      for (const img of body.images) {
        if (!img.imageUrl) continue;
        const [savedImg] = await db.insert(productImages).values({
          tenantId,
          productId: newProduct.id,
          colorId: img.colorId || null,
          sizeId: img.sizeId || null,
          imageUrl: img.imageUrl,
          isPrimary: img.isPrimary ?? false,
          displayOrder: img.displayOrder ?? 0,
        }).returning();
        insertedImages.push(savedImg);
      }
    }

    return NextResponse.json({
      ...newProduct,
      productName: newProduct.productName || newProduct.name,
      baseSellingPrice: newProduct.baseSellingPrice ?? newProduct.price,
      sku: newProduct.sku || newProduct.barcode,
      images: insertedImages,
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST Product error:", error);
    return NextResponse.json({ error: "Failed to create product", details: error.message }, { status: 500 });
  }
}
