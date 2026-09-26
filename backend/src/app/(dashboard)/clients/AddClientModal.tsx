"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AddClientModal({ 
  isOpen, 
  onClose,
  availablePackages 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  availablePackages: any[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    vatNumber: "",
    email: "",
    packageId: availablePackages[0]?.id || "",
    password: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create client");
      }

      onClose();
      router.refresh(); // Refresh the clients table
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Client</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Company Name
            </label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2 border dark:border-gray-600 rounded-md text-sm bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Acme Corp"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              VAT Number
            </label>
            <input 
              type="text" 
              required
              pattern="^3[0-9]{13}3$"
              title="Must start and end with 3 and be 15 digits long"
              value={formData.vatNumber}
              onChange={(e) => setFormData({...formData, vatNumber: e.target.value})}
              className="w-full px-4 py-2 border dark:border-gray-600 rounded-md text-sm bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="310000000000003"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Admin Email
            </label>
            <input 
              type="email" 
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-2 border dark:border-gray-600 rounded-md text-sm bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="admin@acmecorp.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Temporary Password
            </label>
            <input 
              type="password" 
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-4 py-2 border dark:border-gray-600 rounded-md text-sm bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Minimum 8 characters"
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ZATCA Package
            </label>
            <select
              required
              value={formData.packageId}
              onChange={(e) => setFormData({...formData, packageId: e.target.value})}
              className="w-full px-4 py-2 border dark:border-gray-600 rounded-md text-sm bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="" disabled>Select a package</option>
              {availablePackages.map(pkg => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} - {pkg.price} SAR / {pkg.billingCycle.toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Creating..." : "Create Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
