"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, ArrowLeft, CreditCard, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function InvoiceView({ invoice, lineItems }: { invoice: any, lineItems: any[] }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Bar (Hidden on Print) */}
      <div className="flex justify-between items-center print:hidden">
        <Link href="/invoices" className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Invoices
        </Link>
        <div className="flex gap-3">
          {invoice.paymentStatus !== "PAID" && (
            <a 
              href={`/api/v1/invoices/${invoice.id}/pay`}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Now (Mada / Apple Pay)
            </a>
          )}
          <button 
            onClick={handlePrint}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* A4 Document Layout */}
      <div className="bg-white text-gray-900 shadow-lg print:shadow-none print:m-0 mx-auto w-full max-w-[210mm] min-h-[297mm] p-10 md:p-16 border dark:border-gray-700 print:border-none relative">
        
        {/* Paid Watermark */}
        {invoice.paymentStatus === "PAID" && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-30deg] opacity-20 pointer-events-none flex flex-col items-center">
            <CheckCircle2 className="w-32 h-32 text-green-600 mb-4" />
            <span className="text-6xl font-black text-green-600 tracking-widest border-8 border-green-600 px-8 py-4 rounded-lg">PAID</span>
          </div>
        )}
        
        {/* Header section */}
        <div className="flex justify-between items-start border-b pb-8 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 uppercase tracking-wider mb-2">TAX INVOICE</h1>
            <p className="text-sm text-gray-500 font-semibold">{invoice.invoiceType === 'STANDARD' ? 'B2B Standard' : 'B2C Simplified'}</p>
          </div>
          
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-800">{invoice.sellerName}</h2>
            <p className="text-sm text-gray-600 mt-1">{invoice.sellerAddress}</p>
            <p className="text-sm text-gray-600 mt-1 font-medium">VAT Number: {invoice.sellerVat}</p>
          </div>
        </div>

        {/* Invoice Info & ZATCA QR */}
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-2">
            <div>
              <span className="text-gray-500 text-sm block">Invoice Number</span>
              <span className="font-bold text-lg">{invoice.invoiceNumber}</span>
            </div>
            <div>
              <span className="text-gray-500 text-sm block">Issue Date</span>
              <span className="font-medium" suppressHydrationWarning>{new Date(invoice.issueDatetime).toLocaleDateString()}</span>
            </div>
            {invoice.buyerName && (
              <div className="mt-6">
                <span className="text-gray-500 text-sm block mb-1">Bill To:</span>
                <p className="font-bold">{invoice.buyerName}</p>
                {invoice.buyerVat && <p className="text-sm text-gray-600">VAT: {invoice.buyerVat}</p>}
              </div>
            )}
          </div>
          
          <div className="border border-gray-200 p-2 rounded-lg bg-gray-50">
            {invoice.qrCodeBase64 ? (
              <QRCodeSVG 
                value={invoice.qrCodeBase64} 
                size={128} 
                level={"M"}
                includeMargin={false}
              />
            ) : (
              <div className="w-32 h-32 flex items-center justify-center text-xs text-center text-gray-400 bg-gray-100">
                QR Not<br/>Generated
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <table className="w-full text-left mb-8">
          <thead className="bg-gray-50 border-y text-gray-700 text-sm font-semibold">
            <tr>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-center">Qty</th>
              <th className="py-3 px-4 text-right">Unit Price</th>
              <th className="py-3 px-4 text-right">VAT (15%)</th>
              <th className="py-3 px-4 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 divide-y">
            {lineItems.map((item, idx) => (
              <tr key={idx}>
                <td className="py-4 px-4">{item.description}</td>
                <td className="py-4 px-4 text-center">{item.quantity}</td>
                <td className="py-4 px-4 text-right">{Number(item.unitPrice).toFixed(2)}</td>
                <td className="py-4 px-4 text-right">{Number(item.taxAmount).toFixed(2)}</td>
                <td className="py-4 px-4 text-right font-medium">{Number(item.lineTotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals section */}
        <div className="flex justify-end border-t pt-8">
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-gray-600 text-sm">
              <span>Total (Excl. VAT)</span>
              <span>SAR {Number(invoice.subtotalAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600 text-sm">
              <span>Total VAT (15%)</span>
              <span>SAR {Number(invoice.totalVatAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-900 font-bold text-lg pt-3 border-t">
              <span>Total Due</span>
              <span>SAR {Number(invoice.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-16 pt-8 border-t text-center text-gray-500 text-sm print:absolute print:bottom-0 print:left-0 print:w-full print:p-8">
          <p>Thank you for your business!</p>
          <p className="mt-1 text-xs">Generated by UAE Invoice SaaS - ZATCA Phase 2 Compliant</p>
        </div>
      </div>
      
      {/* CSS for printing adjustments */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          .bg-white.text-gray-900.shadow-lg,
          .bg-white.text-gray-900.shadow-lg * {
            visibility: visible;
          }
          .bg-white.text-gray-900.shadow-lg {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
            padding: 0;
            width: 100%;
          }
        }
      `}} />
    </div>
  );
}
