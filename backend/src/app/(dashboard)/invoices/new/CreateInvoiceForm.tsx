"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";

export default function CreateInvoiceForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [invoiceType, setInvoiceType] = useState<"STANDARD" | "SIMPLIFIED">("SIMPLIFIED");
  const [buyerName, setBuyerName] = useState("");
  const [buyerVat, setBuyerVat] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");

  const [lineItems, setLineItems] = useState([
    { description: "", quantity: 1, unitPrice: 0, taxPercent: 15 }
  ]);

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0, taxPercent: 15 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, value: string | number) => {
    const newItems = [...lineItems];
    (newItems[index] as any)[field] = value;
    setLineItems(newItems);
  };

  // Calculate Totals
  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxTotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.taxPercent / 100)), 0);
  const grandTotal = subtotal + taxTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    // Format Line Items for API
    const formattedLineItems = lineItems.map((item, index) => {
      const lineTotalExcl = item.quantity * item.unitPrice;
      const taxAmount = lineTotalExcl * (item.taxPercent / 100);
      return {
        lineNumber: index + 1,
        description: item.description,
        quantity: item.quantity,
        unitCode: "PCE",
        unitPrice: item.unitPrice,
        taxPercent: item.taxPercent,
        taxAmount: taxAmount,
        lineTotal: lineTotalExcl + taxAmount,
      };
    });

    const payload = {
      invoiceType,
      issueDate: new Date().toISOString(),
      seller: { name: "", vatNumber: "", address: "" }, // Server sets this
      buyer: {
        name: buyerName,
        vatNumber: buyerVat,
        address: buyerAddress,
        phone: buyerPhone,
      },
      lineItems: formattedLineItems,
      subtotalAmount: subtotal,
      totalVatAmount: taxTotal,
      totalAmount: grandTotal,
    };

    try {
      const res = await fetch("/api/v1/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create invoice");

      // Redirect back to invoices list
      router.push("/invoices");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice Type</label>
          <select 
            value={invoiceType} 
            onChange={(e) => setInvoiceType(e.target.value as any)}
            className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-600"
          >
            <option value="SIMPLIFIED">B2C Simplified Invoice</option>
            <option value="STANDARD">B2B Standard Tax Invoice</option>
          </select>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Buyer Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buyer Name *</label>
            <input required type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)} className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buyer VAT Number</label>
            <input 
              type="text" 
              value={buyerVat} 
              onChange={e => setBuyerVat(e.target.value)} 
              placeholder="15 digits starting/ending with 3"
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-600" 
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buyer Address *</label>
            <input required type="text" value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-600" />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">WhatsApp Number</label>
            <input type="text" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="e.g. 966500000000" className="w-full px-3 py-2 border rounded-md dark:bg-gray-900 dark:border-gray-600" />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Line Items</h3>
          <button type="button" onClick={addLineItem} className="flex items-center text-sm text-primary-600 hover:text-primary-700">
            <Plus className="w-4 h-4 mr-1" /> Add Item
          </button>
        </div>

        <div className="space-y-4">
          {lineItems.map((item, index) => (
            <div key={index} className="flex gap-4 items-start bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <input required type="text" value={item.description} onChange={e => updateLineItem(index, 'description', e.target.value)} className="w-full px-2 py-1 border rounded" />
              </div>
              <div className="w-24">
                <label className="block text-xs text-gray-500 mb-1">Qty</label>
                <input required type="number" min="1" value={item.quantity} onChange={e => updateLineItem(index, 'quantity', parseInt(e.target.value))} className="w-full px-2 py-1 border rounded" />
              </div>
              <div className="w-32">
                <label className="block text-xs text-gray-500 mb-1">Unit Price (SAR)</label>
                <input required type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => updateLineItem(index, 'unitPrice', parseFloat(e.target.value))} className="w-full px-2 py-1 border rounded" />
              </div>
              <div className="w-24">
                <label className="block text-xs text-gray-500 mb-1">Tax (%)</label>
                <input type="number" readOnly value={item.taxPercent} className="w-full px-2 py-1 border rounded bg-gray-100 text-gray-500" />
              </div>
              <button type="button" onClick={() => removeLineItem(index)} className="mt-6 text-red-500 hover:text-red-700" disabled={lineItems.length === 1}>
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Subtotal:</span>
            <span>{subtotal.toFixed(2)} SAR</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Total VAT (15%):</span>
            <span>{taxTotal.toFixed(2)} SAR</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
            <span>Grand Total:</span>
            <span>{grandTotal.toFixed(2)} SAR</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-6">
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save & Generate ZATCA XML
        </button>
      </div>
    </form>
  );
}
