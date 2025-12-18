"use client";

import { useState } from "react";
import Image from "next/image";
import GrowerDashboardLayout from "@/components/dashboard/GrowerDashboardLayout";

export default function NewProductPage() {
  const [form, setForm] = useState({
    name: "",
    strain_slug: "",
    category: "flower",
    batch_number: "",
    barcode: "",
    thc: "",
    cbd: "",
    weight_grams: "",
    units_available: "",
    price: "",
    status: "active",
  });

  const [images, setImages] = useState<File[]>([]);
  const [preview, setPreview] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    
    const files = Array.from(e.target.files);
    setImages(files);

    const previews = files.map((file) => URL.createObjectURL(file));
    setPreview(previews);
  }

  async function handleSubmit() {
    setLoading(true);
    
    try {
      // Prepare JSON body (images will need separate upload handling)
      const body: any = {
        ...form,
        thc: form.thc ? parseFloat(form.thc) : null,
        cbd: form.cbd ? parseFloat(form.cbd) : null,
        weight_grams: form.weight_grams ? parseFloat(form.weight_grams) : null,
        units_available: form.units_available ? parseInt(form.units_available) : null,
        price: form.price ? parseFloat(form.price) : null,
        images: [], // Images will be uploaded separately or via FormData
      };

      const res = await fetch("/api/inventory/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Product Saved!");
        // Reset form
        setForm({
          name: "",
          strain_slug: "",
          category: "flower",
          batch_number: "",
          barcode: "",
          thc: "",
          cbd: "",
          weight_grams: "",
          units_available: "",
          price: "",
          status: "active",
        });
        setImages([]);
        setPreview([]);
      } else {
        alert(`Error: ${data.error || "Failed to save product"}`);
      }
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Failed to save product. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GrowerDashboardLayout>
      <div className="text-white max-w-xl mx-auto">
        <h1 className="text-3xl font-bold text-green-400 mb-8">
          Add Inventory Item
        </h1>

        <div className="space-y-6">
          {/* NAME */}
          <div>
            <label className="text-green-300 block mb-1">Product Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
              placeholder="Example: Gelato Flower 3.5g"
              required
            />
          </div>

          {/* STRAIN */}
          <div>
            <label className="text-green-300 block mb-1">Strain (optional)</label>
            <input
              name="strain_slug"
              value={form.strain_slug}
              onChange={handleChange}
              className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
              placeholder="strain-slug-here"
            />
          </div>

          {/* CATEGORY */}
          <div>
            <label className="text-green-300 block mb-1">Category</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
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

          {/* THC/CBD */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-green-300 block mb-1">THC %</label>
              <input
                name="thc"
                type="number"
                step="0.1"
                value={form.thc}
                onChange={handleChange}
                className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
                placeholder="20"
              />
            </div>
            <div>
              <label className="text-green-300 block mb-1">CBD %</label>
              <input
                name="cbd"
                type="number"
                step="0.1"
                value={form.cbd}
                onChange={handleChange}
                className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
                placeholder="0.5"
              />
            </div>
          </div>

          {/* PRICE / STOCK */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-green-300 block mb-1">Price ($)</label>
              <input
                name="price"
                type="number"
                step="0.01"
                value={form.price}
                onChange={handleChange}
                className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
                placeholder="35"
              />
            </div>

            <div>
              <label className="text-green-300 block mb-1">Units Available</label>
              <input
                name="units_available"
                type="number"
                value={form.units_available}
                onChange={handleChange}
                className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
                placeholder="100"
              />
            </div>
          </div>

          {/* BATCH / BARCODE */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-green-300 block mb-1">Batch Number</label>
              <input
                name="batch_number"
                value={form.batch_number}
                onChange={handleChange}
                className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
                placeholder="BATCH-001"
              />
            </div>
            <div>
              <label className="text-green-300 block mb-1">Barcode</label>
              <input
                name="barcode"
                value={form.barcode}
                onChange={handleChange}
                className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
                placeholder="123456789"
              />
            </div>
          </div>

          {/* WEIGHT */}
          <div>
            <label className="text-green-300 block mb-1">Weight (grams)</label>
            <input
              name="weight_grams"
              type="number"
              step="0.1"
              value={form.weight_grams}
              onChange={handleChange}
              className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
              placeholder="3.5"
            />
          </div>

          {/* IMAGE UPLOAD */}
          <div>
            <label className="text-green-300 block mb-1">Product Images</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full p-3 bg-black/40 border border-green-400/40 rounded-lg"
            />

            <div className="flex gap-3 mt-3 flex-wrap">
              {preview.map((src, idx) => (
                <div key={idx} className="relative">
                  <Image
                    src={src}
                    alt={`Preview ${idx + 1}`}
                    width={90}
                    height={90}
                    className="rounded-lg border border-green-500/40 object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* SAVE */}
          <button
            onClick={handleSubmit}
            disabled={loading || !form.name}
            className="w-full py-4 rounded-lg bg-green-500/30 border border-green-400 hover:bg-green-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Save Product"}
          </button>
        </div>
      </div>
    </GrowerDashboardLayout>
  );
}
