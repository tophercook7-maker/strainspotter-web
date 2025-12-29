"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface MatchResult {
  match: {
    name: string;
    slug: string;
    confidence: number;
  };
}

export default function ScannerPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MatchResult[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setResults([]);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleScan = async () => {
    if (!file) {
      setError("Please select an image first");
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append("image", file);

      console.log("[SCANNER] Uploading image...", { fileName: file.name, size: file.size });

      // Call visual-match API
      const response = await fetch("/api/visual-match/v3", {
        method: "POST",
        body: formData,
      });

      console.log("[SCANNER] Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log("[SCANNER] Results received:", data);

      if (data.matches && Array.isArray(data.matches)) {
        setResults(data.matches);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err: any) {
      console.error("[SCANNER] Error:", err);
      setError(err.message || "Failed to scan image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Scanner</h1>

        {/* File Input */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-6 py-4 bg-emerald-600 text-black font-semibold rounded-lg hover:bg-emerald-500 transition"
          >
            {file ? "Select Different Image" : "Select Image"}
          </button>
        </div>

        {/* Preview */}
        {previewUrl && (
          <div className="relative w-full aspect-square max-w-md mx-auto">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-contain rounded-lg border border-neutral-700"
            />
          </div>
        )}

        {/* Scan Button */}
        {file && !loading && (
          <button
            onClick={handleScan}
            className="w-full px-6 py-4 bg-emerald-600 text-black font-semibold rounded-lg hover:bg-emerald-500 transition disabled:opacity-50"
          >
            Scan
          </button>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Scanning image...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900/40 border border-red-500/40 rounded-lg p-4">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Results</h2>
            {results.map((result, index) => (
              <div
                key={index}
                className="bg-neutral-900 rounded-lg p-4 border border-neutral-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-400">
                      {result.match.name}
                    </h3>
                    <p className="text-sm text-neutral-400">
                      Confidence: {Math.round(result.match.confidence * 100)}%
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/strain/${result.match.slug}`)}
                    className="px-4 py-2 bg-emerald-600 text-black font-semibold rounded hover:bg-emerald-500 transition"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
