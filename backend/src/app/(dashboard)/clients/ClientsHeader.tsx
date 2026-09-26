"use client";

import { useState } from "react";
import AddClientModal from "./AddClientModal";

export default function ClientsHeader({ availablePackages }: { availablePackages: any[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clients</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Add New Client
        </button>
      </div>

      <AddClientModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        availablePackages={availablePackages}
      />
    </>
  );
}
