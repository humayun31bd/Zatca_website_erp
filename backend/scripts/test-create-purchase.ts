async function testCreatePurchase() {
  const payload = {
    supplierId: '8a9597f6-e831-4d4b-814f-764a756945da',
    invoiceNumber: 'PINV-TEST-' + Date.now().toString().slice(-4),
    issueDate: new Date().toISOString(),
    subtotalAmount: '100.00',
    totalVatAmount: '15.00',
    totalAmount: '115.00',
    paymentStatus: 'UNPAID',
    lineItems: [
      {
        description: 'Test Item',
        quantity: '1',
        unitPrice: '100.00',
        vatRate: '15',
        subtotalAmount: '100.00',
        vatAmount: '15.00',
        totalAmount: '115.00'
      }
    ]
  };
  const res = await fetch('http://localhost:3000/api/purchases?tenantId=336eaf82-a524-4b0a-9326-7197b1e5459e', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  console.log('Create purchase result:', res.status, data.id || data.invoiceNumber || data);
}

testCreatePurchase().catch(console.error);
