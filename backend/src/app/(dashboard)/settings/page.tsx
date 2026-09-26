export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">API Keys</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your API keys for ZATCA and WhatsApp integration.</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border dark:border-gray-700">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Production Key</p>
              <p className="text-sm font-mono text-gray-500 mt-1">sk_live_**********************</p>
            </div>
            <button className="px-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-md text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Revoke
            </button>
          </div>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700 transition-colors">
            Generate New Key
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">ZATCA Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">Configure your ZATCA credentials and CSID.</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">VAT Number</label>
              <input type="text" className="w-full px-3 py-2 border dark:border-gray-600 rounded-md dark:bg-gray-900" placeholder="3xxxxxxxxxxxx3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Environment</label>
              <select className="w-full px-3 py-2 border dark:border-gray-600 rounded-md dark:bg-gray-900">
                <option>Simulation</option>
                <option>Production</option>
              </select>
            </div>
          </div>
          <button className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-md text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors">
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
