"use client";

import { useState } from "react";
import { Search, Filter, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function InvoicesTable({ 
  initialInvoices, 
  currentPage, 
  totalPages 
}: { 
  initialInvoices: any[],
  currentPage: number,
  totalPages: number
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      router.push(`/invoices?page=${newPage}`);
    }
  };

  const filteredInvoices = initialInvoices.filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.paymentStatus.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search invoices..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border dark:border-gray-600 rounded-md text-sm bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border dark:border-gray-600 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
            <Filter className="h-4 w-4" />
            Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 font-medium border-b dark:border-gray-700">
              <tr>
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">ZATCA Status</th>
                <th className="px-6 py-4">WhatsApp Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No invoices found.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{inv.invoiceNumber}</td>
                    <td className="px-6 py-4 text-gray-500" suppressHydrationWarning>{new Date(inv.issueDatetime).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-mono">SAR {Number(inv.totalAmount).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        inv.zatcaStatus === 'CLEARED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        inv.zatcaStatus === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {inv.zatcaStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        inv.whatsappStatus === 'DELIVERED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        inv.whatsappStatus === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {inv.whatsappStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link 
                        href={`/invoices/${inv.id}`}
                        className="inline-block p-2 text-gray-400 hover:text-primary-600 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Page {currentPage} of {totalPages === 0 ? 1 : totalPages}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1 border dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || totalPages === 0}
              className="p-1 border dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
