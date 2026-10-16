async function check() {
  const res = await fetch("http://localhost:3000/api/v1/procurement/cs?tenantId=336eaf82-a524-4b0a-9326-7197b1e5459e");
  const json = await res.json();
  const cs = json.data?.[0];
  console.log("Latest CS:", {
    csNumber: cs?.csNumber,
    itemsCount: cs?.items?.length,
    hasLineItemMatrix: !!cs?.lineItemMatrix,
    matrixRows: cs?.lineItemMatrix?.rows?.length,
    summary: cs?.lineItemMatrix?.summary,
  });

  if (cs?.lineItemMatrix?.rows?.length > 0) {
    console.log("First matrix row:", cs.lineItemMatrix.rows[0]);
  }
}

check().catch(console.error);
