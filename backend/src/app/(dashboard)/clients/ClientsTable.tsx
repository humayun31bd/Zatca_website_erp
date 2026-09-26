"use client";

import { useState } from "react";
import { Search, MoreVertical, Edit, Trash, Activity } from "lucide-react";

export default function ClientsTable({ clients }: { clients: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.vatNumber.includes(searchTerm)
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search clients..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 border dark:border-gray-600 rounded-md text-sm bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 font-medium border-b dark:border-gray-700">
            <tr>
              <th className="px-6 py-4">Client Name</th>
              <th className="px-6 py-4">VAT Number</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No clients found.
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => (
                <tr key={client.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {client.name}
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-500">{client.vatNumber}</td>
                  <td className="px-6 py-4 text-gray-500">{client.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      client.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      client.status === 'SUSPENDED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                       <button className="p-2 text-gray-400 hover:text-primary-600 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Activity className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-primary-600 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
