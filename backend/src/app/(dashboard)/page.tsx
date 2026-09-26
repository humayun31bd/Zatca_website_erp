"use client";


import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowUpRight, ArrowDownRight, FileText, CheckCircle, Clock } from "lucide-react";

const data = [
  { name: "Mon", invoices: 12 },
  { name: "Tue", invoices: 19 },
  { name: "Wed", invoices: 15 },
  { name: "Thu", invoices: 22 },
  { name: "Fri", invoices: 28 },
  { name: "Sat", invoices: 10 },
  { name: "Sun", invoices: 5 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Invoices</p>
              <h3 className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">1,234</h3>
            </div>
            <div className="p-3 bg-primary-50 dark:bg-primary-900/50 rounded-full">
              <FileText className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-green-500 font-medium">12%</span>
            <span className="text-gray-500 ml-2">from last month</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ZATCA Cleared</p>
              <h3 className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">1,180</h3>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/50 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">95.6% clearance rate</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Delivery</p>
              <h3 className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">54</h3>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/50 rounded-full">
              <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowDownRight className="h-4 w-4 text-orange-500 mr-1" />
            <span className="text-orange-500 font-medium">-2%</span>
            <span className="text-gray-500 ml-2">from yesterday</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 shadow-sm">
        <h3 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">Invoicing Volume</h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Line type="monotone" dataKey="invoices" stroke="#2563eb" strokeWidth={3} dot={{r: 4, fill: '#2563eb', strokeWidth: 2}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
