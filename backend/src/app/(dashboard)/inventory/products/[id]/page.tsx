"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Save, Plus, X, Layers } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dimensions state
  const [isSaving, setIsSaving] = useState(false);
  const [dimensions, setDimensions] = useState({
    weightKg: "",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
  });

  // Variant Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Mock Lookups for the UI (Normally fetched from API)
  const mockColors = [
    { id: "c1", name: "Red" },
    { id: "c2", name: "Blue" },
    { id: "c3", name: "Black" },
    { id: "c4", name: "White" },
  ];
  
  const mockSizes = [
    { id: "s1", name: "Small" },
    { id: "s2", name: "Medium" },
    { id: "s3", name: "Large" },
    { id: "s4", name: "XL" },
  ];

  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  useEffect(() => {
    fetchProductAndVariants();
  }, [params.id]);

  const fetchProductAndVariants = async () => {
    try {
      const pRes = await fetch(`/api/v1/inventory/products/${params.id}`);
      const vRes = await fetch(`/api/v1/inventory/products/${params.id}/variants`);
      
      if (pRes.ok) {
        const pData = await pRes.json();
        setProduct(pData);
        setDimensions({
          weightKg: pData.weightKg || "",
          lengthCm: pData.lengthCm || "",
          widthCm: pData.widthCm || "",
          heightCm: pData.heightCm || "",
        });
      }
      if (vRes.ok) {
        setVariants(await vRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDimensions = async () => {
    setIsSaving(true);
    try {
      await fetch(`/api/v1/inventory/products/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightKg: parseFloat(dimensions.weightKg) || null,
          lengthCm: parseFloat(dimensions.lengthCm) || null,
          widthCm: parseFloat(dimensions.widthCm) || null,
          heightCm: parseFloat(dimensions.heightCm) || null,
        }),
      });
      alert("Dimensions saved!");
    } catch (e) {
      console.error(e);
      alert("Failed to save dimensions");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateVariants = async () => {
    if (selectedColors.length === 0 && selectedSizes.length === 0) {
      alert("Please select at least one color or size");
      return;
    }
    
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/v1/inventory/products/${params.id}/variants/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colorIds: selectedColors,
          sizeIds: selectedSizes,
        }),
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setSelectedColors([]);
        setSelectedSizes([]);
        fetchProductAndVariants();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to generate variants");
      }
    } catch (e) {
      console.error(e);
      alert("Error generating variants");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelection = (id: string, list: string[], setList: (val: string[]) => void) => {
    if (list.includes(id)) {
      setList(list.filter(x => x !== id));
    } else {
      setList([...list, id]);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading product details...</div>;
  if (!product) return <div className="p-8 text-red-500">Product not found</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/inventory/products" className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{product.productName}</h1>
            <p className="text-gray-500 text-sm">SKU: {product.sku}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Dimensions & Compliance */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Shipping Dimensions</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Weight (kg)</label>
                <input 
                  type="number" step="0.01" 
                  value={dimensions.weightKg} onChange={(e) => setDimensions({...dimensions, weightKg: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500" 
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">L (cm)</label>
                  <input type="number" value={dimensions.lengthCm} onChange={(e) => setDimensions({...dimensions, lengthCm: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">W (cm)</label>
                  <input type="number" value={dimensions.widthCm} onChange={(e) => setDimensions({...dimensions, widthCm: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">H (cm)</label>
                  <input type="number" value={dimensions.heightCm} onChange={(e) => setDimensions({...dimensions, heightCm: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
              <button 
                onClick={handleSaveDimensions} disabled={isSaving}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 rounded-lg text-sm font-medium flex justify-center items-center"
              >
                <Save className="w-4 h-4 mr-2" /> {isSaving ? "Saving..." : "Save Dimensions"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Variants */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800 flex items-center">
                <Layers className="w-5 h-5 mr-2 text-blue-500" />
                Product Variants
              </h2>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Generate Variants</span>
              </button>
            </div>
            
            <div className="p-0">
              {variants.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No variants generated yet. Click 'Generate Variants' to create combinations of sizes and colors.
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-white border-b border-gray-100 text-gray-600">
                      <th className="p-4 font-medium">SKU</th>
                      <th className="p-4 font-medium">Size</th>
                      <th className="p-4 font-medium">Color</th>
                      <th className="p-4 font-medium text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map(v => (
                      <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="p-4 font-medium">{v.sku}</td>
                        <td className="p-4">{mockSizes.find(s => s.id === v.sizeId)?.name || '-'}</td>
                        <td className="p-4">{mockColors.find(c => c.id === v.colorId)?.name || '-'}</td>
                        <td className="p-4 text-right">SAR {Number(v.baseSellingPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Variant Generator Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Generate SKUs</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-1.5 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Colors</h3>
                <div className="flex flex-wrap gap-2">
                  {mockColors.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleSelection(c.id, selectedColors, setSelectedColors)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        selectedColors.includes(c.id) 
                          ? 'border-blue-600 bg-blue-50 text-blue-700' 
                          : 'border-gray-200 text-gray-600 hover:border-blue-300'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Select Sizes</h3>
                <div className="flex flex-wrap gap-2">
                  {mockSizes.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSelection(s.id, selectedSizes, setSelectedSizes)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        selectedSizes.includes(s.id) 
                          ? 'border-blue-600 bg-blue-50 text-blue-700' 
                          : 'border-gray-200 text-gray-600 hover:border-blue-300'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 flex items-start">
                <div className="mr-3 mt-0.5">ℹ️</div>
                <p>
                  This will generate <strong>{Math.max(1, selectedColors.length) * Math.max(1, selectedSizes.length)}</strong> unique SKUs based on the Cartesian product of your selections.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button 
                onClick={handleGenerateVariants} disabled={isGenerating}
                className="px-5 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : "Generate SKUs"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
