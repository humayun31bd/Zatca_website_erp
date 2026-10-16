import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(request);
    if (!session || !session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = session.tenantId as string;

    const product = await db.query.products.findFirst({
      where: and(eq(products.id, params.id), eq(products.tenantId, tenantId))
    });

    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const { productImages } = await import("@/lib/db/product_schema");
    const images = await db.select().from(productImages)
      .where(and(eq(productImages.productId, params.id), eq(productImages.tenantId, tenantId)));

    return NextResponse.json({
      ...product,
      productName: product.productName || product.name,
      name: product.name || product.productName,
      baseSellingPrice: product.baseSellingPrice ?? product.price,
      price: product.price ?? product.baseSellingPrice,
      sku: product.sku || product.barcode,
      stockQuantity: product.stockQuantity ?? product.stockInHand,
      stockInHand: product.stockInHand ?? product.stockQuantity,
      minStockLevel: product.minStockLevel ?? product.minOrderQty,
      minOrderQty: product.minOrderQty ?? product.minStockLevel,
      sizeVariantIds: parseJsonSafe(product.sizeVariantIds, []),
      imageUrls: parseJsonSafe((product as any).imageUrls, []),
      units: parseJsonSafe((product as any).units, []),
      branchInventory: parseJsonSafe((product as any).branchInventory, []),
      images: images || [],
    });
  } catch (error) {
    console.error("GET Product error:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(request);
    if (!session || !session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = session.tenantId as string;

    const body = await request.json();
    const updateData: any = { updatedAt: new Date() };

    if (body.productName !== undefined || body.name !== undefined) {
      const nameVal = body.productName || body.name;
      updateData.name = nameVal;
      updateData.productName = nameVal;
    }
    if (body.baseSellingPrice !== undefined || body.price !== undefined) {
      const priceVal = body.baseSellingPrice ?? body.price;
      updateData.price = priceVal;
      updateData.baseSellingPrice = priceVal;
    }
    if (body.costPrice !== undefined) updateData.costPrice = body.costPrice;
    if (body.sku !== undefined || body.barcode !== undefined) {
      const codeVal = body.sku || body.barcode;
      updateData.sku = codeVal;
      updateData.barcode = codeVal;
    }
    if (body.description !== undefined) updateData.description = body.description;
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
    if (body.brandId !== undefined) updateData.brandId = body.brandId;
    if (body.productTypeId !== undefined) updateData.productTypeId = body.productTypeId;
    if (body.unitId !== undefined) updateData.unitId = body.unitId;
    if (body.sizeId !== undefined) updateData.sizeId = body.sizeId;
    if (body.colorId !== undefined) updateData.colorId = body.colorId;
    if (body.taxCategoryId !== undefined) updateData.taxCategoryId = body.taxCategoryId;

    if (body.stockQuantity !== undefined || body.stockInHand !== undefined) {
      const stockVal = body.stockQuantity ?? body.stockInHand;
      updateData.stockQuantity = stockVal;
      updateData.stockInHand = stockVal;
    }
    if (body.minStockLevel !== undefined || body.minOrderQty !== undefined) {
      const minVal = body.minStockLevel ?? body.minOrderQty;
      updateData.minStockLevel = minVal;
      updateData.minOrderQty = minVal;
    }

    // Toggle and Boolean Flags
    const fieldsToSet = [
      'isCategoryWiseStock', 'isProductWiseStock', 'isParentProduct', 'parentProductId',
      'isPacketOfPieces', 'packetSize', 'isWeightBased', 'weight', 'marginPercentage',
      'retailPrice', 'distributorPrice', 'specialPrice', 'discountAmount', 'discountedPrice',
      'isWholesaler', 'isDistributor', 'isPharmacy', 'isElectronics', 'isModelNumber',
      'modelNumber', 'isColorApplicable', 'isStorageCapacityApplicable', 'storageCapacity', 'storageCapacityId',
      'isRamApplicable', 'ram', 'ramId', 'isWarrantyApplicable', 'warrantyMonths', 'warrantyPeriodsDays',
      'warrantyProviderId', 'isImeiRequired', 'requiresSerialTracking', 'isColorVariant', 'colorVariantId',
      'isSizeVariant', 'sizeVariantId', 'sizeVariantIds', 'isMedicine', 'isGenericNameApplicable', 'genericName',
      'isActiveIngredientApplicable', 'activeIngredient', 'isStrengthApplicable', 'strengthId',
      'isDosageFormApplicable', 'dosageFormId', 'isManufacturerApplicable', 'manufacturerId',
      'isMarketingAuthHolderApplicable', 'marketingAuthHolderId', 'isPrescriptionRequired',
      'controlledSubstanceSchedule', 'storageConditionId', 'requiresBatchTracking',
      'isApparel', 'apparelProductTypeId', 'fiberComposition', 'genderId', 'ageGroupId',
      'isUnderwear', 'isTaxExempt', 'isPointsApplicable', 'pointsPerProduct',
      'isProductDisplayPosApp', 'isProductDisplayWebsiteApp', 'isProductDisplayRackLabel',
      'isProductDisplayTag', 'isProductDisplayPriceTag', 'isProductDisplayHangingTag',
      'isProductDisplayElectronicScale', 'isProductDisplayWeighingScale', 'isVerifiedByBuyer',
      'isVerifiedBySupplier', 'isOffers', 'returnDays', 'exchangeDays', 'promisedDeliveryDays',
      'isPaymentAvailableCod', 'isAcceleratedCheckoutAvailable', 'isSubscriptionAvailable', 'isActive'
    ];

    for (const field of fieldsToSet) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const [updatedProduct] = await db.update(products)
      .set(updateData)
      .where(and(eq(products.id, params.id), eq(products.tenantId, tenantId)))
      .returning();

    if (!updatedProduct) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    return NextResponse.json({
      ...updatedProduct,
      productName: updatedProduct.productName || updatedProduct.name,
      baseSellingPrice: updatedProduct.baseSellingPrice ?? updatedProduct.price,
      sku: updatedProduct.sku || updatedProduct.barcode,
    });
  } catch (error) {
    console.error("PUT Product error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await verifySession(request);
    if (!session || !session.tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const tenantId = session.tenantId as string;

    const [deletedProduct] = await db.delete(products)
      .where(and(eq(products.id, params.id), eq(products.tenantId, tenantId)))
      .returning();

    if (!deletedProduct) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("DELETE Product error:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
