"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import GrowerDashboardLayout from "@/components/dashboard/GrowerDashboardLayout";

interface Product {
  id: string;
  name: string;
  strain_slug: string;
  category: string;
  batch_number: string;
  barcode: string;
  thc: number | null;
  cbd: number | null;
  weight_grams: number | null;
  units_available: number | null;
  price: number | null;
  images: string[];
  status: string;
}

export default function EditProductPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [preview, setPreview] = useState<string[]>([]);

  // --------------------
  // Load Product Data
  // --------------------
  useEffect(() => {
    async function loadProduct() {
      try {
        const res = await fetch(`/api/inventory/${id}`);
        if (!res.ok) {
          throw new Error("Failed to load product");
        }
        const data = await res.json();
        setProduct(data);
        setPreview(data.images || []);
      } catch (error) {
        console.error("Error loading product:", error);
        alert("Failed to load product");
      } finally {
        setLoading(false);
      }
    }
    
    if (id) {
      loadProduct();
    }
  }, [id]);

  // --------------------
  // Handle Form Changes
  // --------------------
  function updateField(name: string, value: string | number) {
    if (!product) return;
    setProduct({ ...product, [name]: value });
  }

  function handleNewImages(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    
    const files = Array.from(e.target.files);
    setImages(files);

    const previews = files.map((f) => URL.createObjectURL(f));
    setPreview([...preview, ...previews]);
  }

  // --------------------
  // Save Changes
  // --------------------
  async function saveChanges() {
    if (!product) return;
    
    setSaving(true);

    try {
      const body: any = {
        ...product,
        thc: product.thc ? parseFloat(String(product.thc)) : null,
        cbd: product.cbd ? parseFloat(String(product.cbd)) : null,
        weight_grams: product.weight_grams ? parseFloat(String(product.weight_grams)) : null,
        units_available: product.units_available ? parseInt(String(product.units_available)) : null,
        price: product.price ? parseFloat(String(product.price)) : null,
      };

      const res = await fetch(`/api/inventory/${id}/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Inventory updated!");
      } else {
        alert(`Error: ${data.error || "Failed to update product"}`);
      }
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Failed to update product. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <GrowerDashboardLayout>
        <div className="text-white p-8">Loading product…</div>
      </GrowerDashboardLayout>
    );
  }

  if (!product) {
    return (
      <GrowerDashboardLayout>
        <div className="text-white p-8">Product not found</div>
      </GrowerDashboardLayout>
    );
  }

  return (
    <GrowerDashboardLayout>
      <div className="text-white max-w-xl mx-auto py-6">
        <h1 className="text-3xl font-bold text-green-400 mb-8">
          Edit Inventory Item
        </h1>

        <div className="space-y-6">
          {/* NAME */}
          <div>
            <label className="text-green-300 block mb-1">Name</label>
            <input
              className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
              value={product.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </div>

          {/* STRAIN */}
          <div>
            <label className="text-green-300 block mb-1">Strain Link</label>
            <input
              className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
              value={product.strain_slug || ""}
              onChange={(e) => updateField("strain_slug", e.target.value)}
            />
          </div>

          {/* CATEGORY */}
          <div>
            <label className="text-green-300 block mb-1">Category</label>
            <select
              className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
              value={product.category}
              onChange={(e) => updateField("category", e.target.value)}
            >
              <option value="flower">Flower</option>
              <option value="pre-roll">Pre-roll</option>
              <option value="edible">Edible</option>
              <option value="concentrate">Concentrate</option>
              <option value="cartridge">Cartridge</option>
              <option value="clone">Clone</option>
              <option value="seed">Seed</option>
            </select>
          </div>

          {/* THC / CBD */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-green-300 block mb-1">THC %</label>
              <input
                type="number"
                step="0.1"
                className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
                value={product.thc || ""}
                onChange={(e) => updateField("thc", e.target.value)}
              />
            </div>
            <div>
              <label className="text-green-300 block mb-1">CBD %</label>
              <input
                type="number"
                step="0.1"
                className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
                value={product.cbd || ""}
                onChange={(e) => updateField("cbd", e.target.value)}
              />
            </div>
          </div>

          {/* PRICE / STOCK */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-green-300 block mb-1">Price ($)</label>
              <input
                type="number"
                step="0.01"
                className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
                value={product.price || ""}
                onChange={(e) => updateField("price", e.target.value)}
              />
            </div>

            <div>
              <label className="text-green-300 block mb-1">Units Available</label>
              <input
                type="number"
                className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
                value={product.units_available || ""}
                onChange={(e) => updateField("units_available", e.target.value)}
              />
            </div>
          </div>

          {/* BATCH / BARCODE */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-green-300 block mb-1">Batch Number</label>
              <input
                className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
                value={product.batch_number || ""}
                onChange={(e) => updateField("batch_number", e.target.value)}
              />
            </div>
            <div>
              <label className="text-green-300 block mb-1">Barcode</label>
              <input
                className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
                value={product.barcode || ""}
                onChange={(e) => updateField("barcode", e.target.value)}
              />
            </div>
          </div>

          {/* WEIGHT */}
          <div>
            <label className="text-green-300 block mb-1">Weight (grams)</label>
            <input
              type="number"
              step="0.1"
              className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
              value={product.weight_grams || ""}
              onChange={(e) => updateField("weight_grams", e.target.value)}
            />
          </div>

          {/* STATUS */}
          <div>
            <label className="text-green-300 block mb-1">Status</label>
            <select
              className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
              value={product.status}
              onChange={(e) => updateField("status", e.target.value)}
            >
              <option value="active">Active</option>
              <option value="low">Low Stock</option>
              <option value="sold_out">Sold Out</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* IMAGES */}
          <div>
            <label className="text-green-300 block mb-1">Product Images</label>

            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleNewImages}
              className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
            />

            <div className="flex flex-wrap gap-3 mt-4">
              {preview.map((src, idx) => (
                <Image
                  key={idx}
                  src={src}
                  width={90}
                  height={90}
                  alt="Preview"
                  className="rounded-lg border border-green-500/40 object-cover"
                />
              ))}
            </div>
          </div>

          {/* SAVE BUTTON */}
          <button
            disabled={saving}
            onClick={saveChanges}
            className="w-full py-4 rounded-lg bg-green-500/30 border border-green-400 hover:bg-green-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </GrowerDashboardLayout>
  );
}
