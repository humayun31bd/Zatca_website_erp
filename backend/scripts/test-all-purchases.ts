async function testAllPurchaseEndpoints() {
  console.log("=== Comprehensive Check of Purchase & Procurement Endpoints ===");
  const tenantId = "336eaf82-a524-4b0a-9326-7197b1e5459e";
  const baseUrl = "http://localhost:3000";

  const endpoints = [
    { name: "Supplier Quotations", path: `/api/v1/procurement/quotations?tenantId=${tenantId}` },
    { name: "Comparative Statements (CS)", path: `/api/v1/procurement/cs?tenantId=${tenantId}` },
    { name: "Purchase Orders", path: `/api/v1/procurement/orders?tenantId=${tenantId}` },
    { name: "Goods Received Notes (GRN)", path: `/api/v1/procurement/grn?tenantId=${tenantId}` },
    { name: "Quality Check (QC)", path: `/api/v1/procurement/qc?tenantId=${tenantId}` },
    { name: "Received Bills / Invoices", path: `/api/v1/procurement/bills?tenantId=${tenantId}` },
    { name: "Supplier Returns", path: `/api/v1/procurement/returns?tenantId=${tenantId}` },
    { name: "Suppliers List", path: `/api/v1/suppliers?tenantId=${tenantId}` },
    { name: "Purchase Invoices (Main)", path: `/api/purchases?tenantId=${tenantId}` },
  ];

  const results: any[] = [];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        headers: { "Content-Type": "application/json" },
      });
      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = { raw: "non-json response" };
      }

      const isSuccess = res.status >= 200 && res.status < 300;
      results.push({
        name: ep.name,
        path: ep.path,
        status: res.status,
        success: isSuccess,
        itemCount: Array.isArray(json)
          ? json.length
          : Array.isArray(json?.data)
          ? json.data.length
          : Array.isArray(json?.quotations)
          ? json.quotations.length
          : Array.isArray(json?.orders)
          ? json.orders.length
          : Array.isArray(json?.grnList)
          ? json.grnList.length
          : Array.isArray(json?.qcList)
          ? json.qcList.length
          : Array.isArray(json?.bills)
          ? json.bills.length
          : Array.isArray(json?.returns)
          ? json.returns.length
          : Array.isArray(json?.purchases)
          ? json.purchases.length
          : Array.isArray(json?.suppliers)
          ? json.suppliers.length
          : "N/A",
        error: isSuccess ? null : json?.error || JSON.stringify(json),
      });
    } catch (err: any) {
      results.push({
        name: ep.name,
        path: ep.path,
        status: "NETWORK_ERROR",
        success: false,
        error: err.message,
      });
    }
  }

  console.log("\nResults Summary:");
  let hasErrors = false;
  results.forEach((r) => {
    const symbol = r.success ? "✓" : "✗";
    console.log(
      `${symbol} [${r.status}] ${r.name} (${r.path}) -> Count: ${r.itemCount}${
        r.error ? ` | Error: ${r.error}` : ""
      }`
    );
    if (!r.success) hasErrors = true;
  });

  if (hasErrors) {
    console.log("\n⚠️ Some purchase endpoints reported errors or issues!");
  } else {
    console.log("\n🎉 ALL purchase and procurement endpoints responded successfully!");
  }
}

testAllPurchaseEndpoints().catch(console.error);
