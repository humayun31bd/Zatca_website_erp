const API_URL = 'http://localhost:3000/api/v1';
const API_KEY = 'zatca_test_key_123';

async function runTests() {
  console.log('Running API Tests...');
  
  const res = await fetch(`${API_URL}/health`);
  const health = await res.json();
  console.log('1. Health Check:', health.status === 'ok' ? 'PASS' : 'FAIL');

  // Test B2B Standard Invoice
  const b2bRes = await fetch(`${API_URL}/invoices/zatca-whatsapp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      invoiceType: 'STANDARD',
      invoiceNumber: `INV-${Date.now()}`,
      issueDate: new Date().toISOString(),
      seller: { name: 'Seller', vatNumber: '312345678900003', address: 'Riyadh' },
      buyer: { name: 'Buyer', address: 'Jeddah' },
      lineItems: [{ lineNumber: 1, description: 'Item', quantity: 1, unitCode: 'EA', unitPrice: 100, taxPercent: 15, taxAmount: 15, lineTotal: 115 }],
      subtotalAmount: 100,
      totalVatAmount: 15,
      totalAmount: 115,
      currencyCode: 'SAR',
      typeCode: '388'
    })
  });
  
  console.log('2. B2B Invoice Submit:', b2bRes.status === 200 ? 'PASS' : 'FAIL', await b2bRes.text());
}

runTests().catch(console.error);
