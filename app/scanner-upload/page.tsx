'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import UploadButton from '@/components/UploadButton';
import ImagePreview from '@/components/ImagePreview';
import { uploadImage, processScan, getVisualMatch } from '@/lib/api';
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { checkCredits, deductCredit } from '@/lib/credits';
import { getMembership } from '@/lib/membership';
import NotEnoughCreditsModal from '@/components/NotEnoughCreditsModal';

export default function ScannerUploadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [normalCredits, setNormalCredits] = useState<number | null>(null);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'matching' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);

  // Check authentication on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setAuthenticated(true);
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select an image first');
      return;
    }

    if (!authenticated) {
      setErrorMessage('Please sign in to scan images');
      router.push('/login');
      return;
    }

    try {
      setUploadStatus('uploading');
      setErrorMessage(null);

      // Check membership and credits before scanning
      const membership = await getMembership();

      // -------- TIER 1 OR 2 ------------
      if (membership.tier >= 1) {
        if (membership.scans_left > 0) {
          // decrement monthly count
          await fetch("/api/membership/decrement", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ type: "scan" }),
          });
        } else {
          // no monthly scans left → fall back to credits
          const chk = await checkCredits();
          setNormalCredits(chk.credits);

          if (!chk.ok || chk.credits < 1) {
            setUploadStatus('idle');
            setShowCreditsModal(true);
            return;
          }

          await deductCredit(1);
          setNormalCredits((prev) => (prev ?? 0) - 1);
        }
      }
      // -------- TIER 0 (NOT A MEMBER) ----------
      else {
        const chk = await checkCredits();
        setNormalCredits(chk.credits);

        if (!chk.ok || chk.credits < 1) {
          setUploadStatus('idle');
          setShowCreditsModal(true);
          return;
        }

        await deductCredit(1);
        setNormalCredits((prev) => (prev ?? 0) - 1);
      }

      // Step 1: Upload image
      const uploadResult = await uploadImage(selectedFile);
      setScanId(uploadResult.scan_id);

      // Step 2: Process scan
      setUploadStatus('processing');
      await processScan(uploadResult.scan_id);

      // Step 3: Get visual match
      setUploadStatus('matching');
      const matchResult = await getVisualMatch(uploadResult.image_url, uploadResult.scan_id);

      // Step 4: Navigate to results
      setUploadStatus('success');
      router.push(`/scan/${uploadResult.scan_id}`);
    } catch (error: any) {
      console.error('Upload error:', error);
      setErrorMessage(error.message || 'Upload failed. Please try again.');
      setUploadStatus('error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-gray-400 mb-6">Please sign in to use the scanner</p>
          <Link
            href="/login"
            className="px-6 py-3 bg-green-500 text-black rounded-lg font-semibold hover:bg-green-400 transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Upload Image to Scan</h1>

        {/* Upload Area */}
        <div className="mb-6">
          <UploadButton
            onFileSelect={handleFileSelect}
            disabled={uploadStatus === 'uploading' || uploadStatus === 'processing' || uploadStatus === 'matching'}
            className="mb-4"
          />
        </div>

        {/* Preview */}
        {preview && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Preview</h2>
            <div className="relative w-full h-64 rounded-lg overflow-hidden">
              <ImagePreview src={preview} alt="Selected image" className="w-full h-full" />
            </div>
            {selectedFile && (
              <div className="mt-2 text-sm text-gray-400">
                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>
        )}

        {/* Upload Button */}
        {selectedFile && (
          <button
            onClick={handleUpload}
            disabled={uploadStatus === 'uploading' || uploadStatus === 'processing' || uploadStatus === 'matching'}
            className="w-full py-4 px-6 rounded-lg bg-gradient-to-r from-green-500 to-emerald-400 text-black font-semibold hover:from-green-400 hover:to-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {uploadStatus === 'uploading' && 'Uploading...'}
            {uploadStatus === 'processing' && 'Processing image...'}
            {uploadStatus === 'matching' && 'Finding match...'}
            {uploadStatus === 'success' && 'Success! Redirecting...'}
            {uploadStatus === 'idle' && 'Scan Image'}
            {uploadStatus === 'error' && 'Try Again'}
          </button>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mt-4 p-4 bg-red-900/40 border border-red-500/40 rounded-lg text-red-200">
            {errorMessage}
          </div>
        )}

        {/* Status Messages */}
        {uploadStatus === 'uploading' && (
          <div className="mt-4 text-center text-green-200">Uploading image...</div>
        )}
        {uploadStatus === 'processing' && (
          <div className="mt-4 text-center text-green-200">Analyzing image with Vision API...</div>
        )}
        {uploadStatus === 'matching' && (
          <div className="mt-4 text-center text-green-200">Matching against strain library...</div>
        )}

        {/* Not Enough Credits Modal */}
        {showCreditsModal && (
          <NotEnoughCreditsModal
            credits={normalCredits ?? 0}
            onClose={() => setShowCreditsModal(false)}
          />
        )}
      </div>
    </div>
  );
}

