'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email?: string;
}

export default function TrainStrainClient({ user }: { user: User }) {
  const router = useRouter();
  const [strainName, setStrainName] = useState('');
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [training, setTraining] = useState(false);
  const [status, setStatus] = useState<string>('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedImages([...uploadedImages, ...files]);
  };

  const handleUpload = async () => {
    if (!strainName || uploadedImages.length < 20) {
      alert('Please provide a strain name and upload at least 20 images');
      return;
    }

    setUploading(true);
    setStatus('Uploading images...');

    try {
      const formData = new FormData();
      formData.append('strain_name', strainName);
      uploadedImages.forEach((file, idx) => {
        formData.append(`images`, file);
      });

      const res = await fetch('/api/pro/strain-train/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      setStatus('Images uploaded. Starting training...');

      // Start training
      setTraining(true);
      const trainRes = await fetch('/api/pro/strain-train/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strain_name: strainName })
      });

      if (!trainRes.ok) throw new Error('Training failed');

      setStatus('Training complete!');
      router.push(`/pro/train-strain/${strainName}`);
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    } finally {
      setUploading(false);
      setTraining(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Train Private Strain</h1>
      <p className="text-gray-600 mb-6">
        Upload 20-50 images of your custom strain to create a private matching model.
      </p>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium mb-2">Strain Name</label>
        <input
          type="text"
          value={strainName}
          onChange={(e) => setStrainName(e.target.value)}
          placeholder="e.g., My Custom Hybrid"
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium mb-2">
          Upload Images ({uploadedImages.length}/50)
        </label>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="mb-4"
        />
        <div className="grid grid-cols-4 gap-2">
          {uploadedImages.map((file, idx) => (
            <div key={idx} className="relative">
              <img
                src={URL.createObjectURL(file)}
                alt={`Preview ${idx + 1}`}
                className="w-full h-24 object-cover rounded"
              />
              <button
                onClick={() => setUploadedImages(uploadedImages.filter((_, i) => i !== idx))}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleUpload}
        disabled={uploading || training || uploadedImages.length < 20}
        className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : training ? 'Training...' : 'Start Training'}
      </button>

      {status && (
        <div className="mt-4 p-4 bg-blue-50 rounded">{status}</div>
      )}
    </div>
  );
}
