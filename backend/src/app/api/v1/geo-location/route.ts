import { NextRequest, NextResponse } from "next/server";

const GCC_COUNTRIES = ["SA", "AE", "KW", "QA", "OM", "BH"];

export async function GET(req: NextRequest) {
  try {
    // 1. Check Cloudflare header (if proxied through Cloudflare)
    let countryCode = req.headers.get("cf-ipcountry")?.toUpperCase() || "";

    // 2. Extract Client IP
    const forwardedFor = req.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1";

    // 3. Fallback IP Geolocation lookup if Cloudflare header is missing
    if (!countryCode || countryCode === "XX" || countryCode === "T1") {
      try {
        if (clientIp !== "127.0.0.1" && clientIp !== "::1") {
          const geoRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=countryCode`, {
            next: { revalidate: 3600 },
          });
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            countryCode = geoData.countryCode || "SA";
          }
        }
      } catch (err) {
        countryCode = "SA"; // Default fallback
      }
    }

    if (!countryCode) countryCode = "SA";

    const isBangladesh = countryCode === "BD";
    const isGCC = GCC_COUNTRIES.includes(countryCode);

    // 4. Build Recommended Payment Gateways & Currency
    let currency = "SAR";
    let gateways = [];

    if (isBangladesh) {
      currency = "BDT";
      gateways = [
        { id: "bkash", name: "bKash MFS", type: "mfs", icon: "📱" },
        { id: "sslcommerz", name: "SSLCommerz (Cards / Mobile Banking)", type: "gateway", icon: "💳" },
        { id: "bank_bd", name: "BD Bank Transfer (BEFTN / NPSB)", type: "bank", icon: "🏦" },
      ];
    } else if (isGCC) {
      currency = "SAR";
      gateways = [
        { id: "tap_mada", name: "Mada Debit Card", type: "mada", icon: "💳" },
        { id: "tap_applepay", name: "Apple Pay", type: "applepay", icon: "🍎" },
        { id: "tap_card", name: "Credit Card (Visa / Mastercard)", type: "card", icon: "💳" },
      ];
    } else {
      currency = "USD";
      gateways = [
        { id: "stripe", name: "Credit / Debit Card", type: "card", icon: "💳" },
        { id: "tap_card", name: "Tap International", type: "card", icon: "💳" },
      ];
    }

    return NextResponse.json({
      success: true,
      clientIp,
      countryCode,
      region: isBangladesh ? "Bangladesh" : isGCC ? "GCC" : "International",
      isBangladesh,
      isGCC,
      currency,
      gateways,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        countryCode: "SA",
        region: "GCC",
        isBangladesh: false,
        isGCC: true,
        currency: "SAR",
        gateways: [
          { id: "tap_mada", name: "Mada Debit Card", type: "mada", icon: "💳" },
          { id: "tap_card", name: "Credit Card", type: "card", icon: "💳" },
        ],
      },
      { status: 200 }
    );
  }
}
