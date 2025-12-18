'use client';

import { useRef, useState } from 'react';

interface UploadButtonProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

export default function UploadButton({ onFileSelect, disabled, className }: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={className}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`
          w-full py-4 px-6 rounded-lg
          bg-gradient-to-r from-green-500 to-emerald-400
          text-black font-semibold
          hover:from-green-400 hover:to-emerald-300
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all
          ${isDragging ? 'ring-4 ring-green-300' : ''}
        `}
      >
        {isDragging ? 'Drop image here' : 'Select Image'}
      </button>
    </div>
  );
}

