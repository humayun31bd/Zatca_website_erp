"use client";

import { X, FileCode2, MessageCircle, QrCode } from "lucide-react";

interface InvoiceDetailModalProps {
  invoice: any;
  onClose: () => void;
}

export default function InvoiceDetailModal({ invoice, onClose }: InvoiceDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl overflow-hidden border dark:border-gray-700 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Invoice Details</h2>
            <p className="text-sm text-gray-500 mt-1">{invoice.id} • {invoice.customer}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-1 border dark:border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/50">
              <QrCode className="h-32 w-32 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-xs text-gray-500 text-center">ZATCA TLV Base64 QR Code Placeholder</p>
            </div>
            
            <div className="col-span-2 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border dark:border-gray-700">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-3">
                  <FileCode2 className="h-4 w-4" />
                  UBL XML Preview
                </h3>
                <pre className="text-xs text-gray-500 font-mono overflow-x-auto whitespace-pre-wrap">
{`<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ID>${invoice.id}</ID>
  <IssueDate>${invoice.date}</IssueDate>
  <InvoiceTypeCode>388</InvoiceTypeCode>
  ...
</Invoice>`}
                </pre>
              </div>

              <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-100 dark:border-green-900/30">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-green-800 dark:text-green-400 mb-2">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Status
                </h3>
                <p className="text-sm text-green-700 dark:text-green-500">
                  Message successfully delivered to customer.
                  <br />
                  <span className="text-xs opacity-75 mt-1 block">Message ID: wamid.HBgLM...</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
