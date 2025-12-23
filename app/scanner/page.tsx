// app/scanner/page.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ScanResultPanel from '@/components/ScanResultPanel';
import PaywallManager from '@/components/paywalls/PaywallManager';
import { useScanGate } from '@/lib/hooks/useScanGate';
import { setupAndroidBackHandler } from '@/lib/navigation/androidBack';

type ScanMode = 'strain' | 'doctor';

export default function ScannerPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('strain');
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  
  // Image upload state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageFile, setUploadedImageFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Paywall state
  const [showRegularPaywall, setShowRegularPaywall] = useState(false);
  const [showDoctorPaywall, setShowDoctorPaywall] = useState(false);
  const [canScan, setCanScan] = useState(false);
  const [canDoctorScan, setCanDoctorScan] = useState(false);
  const { checkScanAccess, deductScan } = useScanGate();
  const [scanAnimation, setScanAnimation] = useState<string | null>(null);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
  const [cameraRetryCount, setCameraRetryCount] = useState(0);

  // Setup Android back button handler
  useEffect(() => {
    const cleanup = setupAndroidBackHandler(router, '/');
    return cleanup;
  }, [router]);

  // Start camera on mount with comprehensive error handling
  useEffect(() => {
    let stream: MediaStream | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    async function initCamera() {
      try {
        setError(null);
        
        // Check if mediaDevices is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('Camera not supported on this device. Use the upload option instead.');
          return;
        }

        // Set timeout for camera initialization (10 seconds)
        timeoutId = setTimeout(() => {
          if (!cameraReady) {
            setError('Camera is taking too long to initialize. Try refreshing or use upload instead.');
          }
        }, 10000);

        // Try to get camera with fallback options
        let constraints: MediaStreamConstraints = {
          video: { facingMode: 'environment' },
          audio: false,
        };

        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err: any) {
          // If environment camera fails, try any camera
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setError('Camera permission denied. Please allow camera access in your browser settings, or use the upload option.');
            setCameraPermissionDenied(true);
            return;
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            setError('No camera found. Use the upload option to scan from a photo.');
            return;
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            setError('Camera is already in use by another app. Close other apps and try again, or use upload.');
            return;
          } else if (err.name === 'OverconstrainedError') {
            // Fallback to any camera
            constraints = { video: true, audio: false };
            try {
              stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (fallbackErr) {
              setError('Unable to access camera. Use the upload option instead.');
              return;
            }
          } else {
            throw err;
          }
        }

        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
            setCameraReady(true);
          } catch (playErr) {
            console.error('Video play error:', playErr);
            setError('Camera initialized but failed to display. Try refreshing.');
            // Clean up stream if play fails
            stream.getTracks().forEach((t) => t.stop());
          }
        }
      } catch (err: any) {
        console.error('Camera initialization error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera permission denied. Please allow camera access, or use the upload option.');
          setCameraPermissionDenied(true);
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Use the upload option to scan from a photo.');
        } else if (err.name === 'NotReadableError') {
          setError('Camera is in use. Close other apps and try again, or use upload.');
        } else {
          setError('Unable to access camera. Use the upload option instead.');
        }
      }
    }

    initCamera();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Handle file upload
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setUploadedImage(reader.result);
        setUploadedImageFile(file);
        setError(null);
      }
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const clearUploadedImage = useCallback(() => {
    setUploadedImage(null);
    setUploadedImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleNormalScan = useCallback(async () => {
    // Check if we have an uploaded image or camera
    if (!uploadedImage && (!videoRef.current || !canvasRef.current)) {
      setError('Please select an image or wait for camera to be ready.');
      return;
    }

    // Check scan access before proceeding
    const access = await checkScanAccess('regular');
    if (!access.hasAccess) {
      setShowRegularPaywall(true);
      return;
    }

    // Deduct scan
    const deductResult = await deductScan('regular');
    if (!deductResult.success) {
      setError(deductResult.error || 'Failed to deduct scan');
      return;
    }

    setIsScanning(true);
    setError(null);
    setProcessingStep(uploadedImage ? 'Processing image...' : 'Capturing image...');
    setScanMode('strain');

    try {
      let base64: string;

      if (uploadedImage) {
        // Use uploaded image
        base64 = uploadedImage;
      } else {
        // Capture frame from camera
        const video = videoRef.current;
        if (!video) throw new Error('Video not available');
        const canvas = canvasRef.current;
        if (!canvas) throw new Error('Canvas not available');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');

        const width = video.videoWidth || 720;
        const height = video.videoHeight || 720;

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(video, 0, 0, width, height);

        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          }, 'image/jpeg', 0.9);
        });

        // Convert blob to base64 for upload
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              resolve(reader.result);
            } else {
              reject(new Error('Failed to read blob as base64'));
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      // STEP 2: POST /api/uploads (with timeout)
      setProcessingStep('Uploading...');
      const uploadController = new AbortController();
      const uploadTimeout = setTimeout(() => uploadController.abort(), 30000); // 30 second timeout
      
      const uploadResponse = await fetch('/api/uploads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64,
          filename: `scan-${Date.now()}.jpg`,
          mimeType: 'image/jpeg',
        }),
        signal: uploadController.signal,
      });
      
      clearTimeout(uploadTimeout);

      if (!uploadResponse.ok) {
        const text = await uploadResponse.text();
        const error = text ? JSON.parse(text) : null;
        
        // Handle limit_reached response gracefully
        if (error?.status === 'limit_reached' || error?.error === 'limit_reached') {
          const limitMsg = error.type === 'doctor_scan'
            ? 'Doctor scans are not available for your membership tier.'
            : `You've reached your monthly scan limit (${error.used}/${error.limit || 'unlimited'}).`;
          
          setError(`${limitMsg} ${error.reset_date ? `Resets on ${new Date(error.reset_date).toLocaleDateString()}.` : ''} Upgrade to continue scanning.`);
          setIsScanning(false);
          setProcessingStep(null);
          // Show paywall for upgrade option
          if (error.type === 'doctor_scan') {
            setShowDoctorPaywall(true);
          } else {
            setShowRegularPaywall(true);
          }
          return; // Exit gracefully, don't throw
        }
        
        throw new Error(error?.error || error?.message || 'Upload failed');
      }

      const text = await uploadResponse.text();
      const uploadData = text ? JSON.parse(text) : null;
      const scanId = uploadData.scan_id;

      // STEP 3: POST /api/scans/${scan_id}/process (with timeout)
      setProcessingStep('Analyzing image...');
      const processController = new AbortController();
      const processTimeout = setTimeout(() => processController.abort(), 60000); // 60 second timeout for processing
      
      const processResponse = await fetch(`/api/scans/${scanId}/process`, {
        method: 'POST',
        signal: processController.signal,
      });
      
      clearTimeout(processTimeout);

      if (!processResponse.ok) {
        const text = await processResponse.text();
        const error = text ? JSON.parse(text) : null;
        
        // Handle limit_reached response gracefully
        if (error?.status === 'limit_reached' || error?.error === 'limit_reached') {
          const limitMsg = error.type === 'doctor_scan'
            ? 'Doctor scans are not available for your membership tier.'
            : `You've reached your monthly scan limit (${error.used}/${error.limit || 'unlimited'}).`;
          
          setError(`${limitMsg} ${error.reset_date ? `Resets on ${new Date(error.reset_date).toLocaleDateString()}.` : ''} Upgrade to continue scanning.`);
          setIsScanning(false);
          setProcessingStep(null);
          // Show paywall for upgrade option
          if (error.type === 'doctor_scan') {
            setShowDoctorPaywall(true);
          } else {
            setShowRegularPaywall(true);
          }
          return; // Exit gracefully, don't throw
        }
        
        throw new Error(error?.error || error?.message || 'Processing failed');
      }

      // STEP 4: POST /api/visual-match (with timeout)
      setProcessingStep('Matching strain...');
      const matchController = new AbortController();
      const matchTimeout = setTimeout(() => matchController.abort(), 30000); // 30 second timeout
      
      const matchResponse = await fetch('/api/visual-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scan_id: scanId }),
        signal: matchController.signal,
      });
      
      clearTimeout(matchTimeout);

      if (!matchResponse.ok) {
        const text = await matchResponse.text();
        const error = text ? JSON.parse(text) : null;
        // Still redirect even if match fails - result page will show "Strain Unknown"
        console.warn('Visual matching failed:', error);
      }

      // STEP 5: Redirect to /scan/${scan_id}
      setProcessingStep('Complete!');
      // Clear uploaded image after successful scan
      clearUploadedImage();
      router.push(`/scan/${scanId}`);
    } catch (err: any) {
      console.error('[scanner] Scan error:', err);
      if (err.name === 'AbortError') {
        setError('Request timed out. Please try again or use upload instead.');
      } else {
        setError(err.message || 'Scan failed. Please try again.');
      }
      setProcessingStep(null);
    } finally {
      setIsScanning(false);
    }
  }, [checkScanAccess, deductScan, router, uploadedImage, clearUploadedImage]);

  const handleDoctorScan = useCallback(async () => {
    // Check if we have an uploaded image or camera
    if (!uploadedImage && (!videoRef.current || !canvasRef.current)) {
      setError('Please select an image or wait for camera to be ready.');
      return;
    }

    // Check doctor scan access before proceeding
    const access = await checkScanAccess('doctor');
    if (!access.hasAccess) {
      setShowDoctorPaywall(true);
      return;
    }

    // Deduct doctor scan
    const deductResult = await deductScan('doctor');
    if (!deductResult.success) {
      setError(deductResult.error || 'Failed to deduct doctor scan');
      return;
    }

    // Trigger animation
    setScanAnimation("doctor-scan");
    setIsScanning(true);
    setError(null);
    setScanMode('doctor');

    try {
      let imageData: string;

      if (uploadedImage) {
        // Use uploaded image
        imageData = uploadedImage;
      } else {
        // Capture frame from camera
        const video = videoRef.current;
        if (!video) throw new Error('Video not available');
        const canvas = canvasRef.current;
        if (!canvas) throw new Error('Canvas not available');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas not supported');

        const width = video.videoWidth || 720;
        const height = video.videoHeight || 720;

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(video, 0, 0, width, height);

        imageData = canvas.toDataURL('image/jpeg');
      }

      // Process doctor scan via API (with timeout)
      const doctorController = new AbortController();
      const doctorTimeout = setTimeout(() => doctorController.abort(), 30000); // 30 second timeout
      
      const response = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          scan_type: 'doctor',
        }),
        signal: doctorController.signal,
      });
      
      clearTimeout(doctorTimeout);
      
      if (response.ok) {
        const { scan_id } = await response.json();
        // Clear uploaded image after successful scan
        clearUploadedImage();
        router.push(`/scan/${scan_id}`);
      } else {
        const text = await response.text();
        const error = text ? JSON.parse(text) : null;
        
        // Handle limit_reached response gracefully
        if (error?.status === 'limit_reached' || error?.error === 'limit_reached') {
          const limitMsg = error.type === 'doctor_scan'
            ? 'Doctor scans are not available for your membership tier.'
            : `You've reached your monthly scan limit (${error.used}/${error.limit || 'unlimited'}).`;
          
          setError(`${limitMsg} ${error.reset_date ? `Resets on ${new Date(error.reset_date).toLocaleDateString()}.` : ''} Upgrade to continue scanning.`);
          setShowDoctorPaywall(true);
        } else {
          setError(error?.error || error?.message || 'Failed to process doctor scan');
        }
        setIsScanning(false);
      }
    } catch (err: any) {
      console.error(err);
      if (err.name === 'AbortError') {
        setError('Request timed out. Please try again or use upload instead.');
      } else {
        setError('Scan failed. Please try again.');
      }
    } finally {
      setIsScanning(false);
      setScanAnimation(null);
    }
  }, [checkScanAccess, deductScan, router, uploadedImage, clearUploadedImage]);

  // Retry camera initialization
  const retryCamera = useCallback(async () => {
    setCameraRetryCount(prev => prev + 1);
    setError(null);
    setCameraPermissionDenied(false);
    setCameraReady(false);
    
    // Re-run camera initialization
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false,
    }).catch(() => {
      return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    });
    
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraReady(true);
    }
  }, []);

  return (
    <div className="relative min-h-screen text-[var(--botanical-text-primary)] overflow-hidden bg-[var(--botanical-bg-deep)] pb-20 md:pb-0 safe-area-bottom">
      {/* Fixed Background */}
      <div className="fixed inset-0 -z-20">
        <Image
          src="/backgrounds/garden-field.jpg"
          alt="Background"
          fill
          priority
          className="object-cover opacity-[0.32]"
        />
      </div>

      {/* Optional aurora / particles if you have those components */}
      <div className="aurora-wrapper -z-10">
        <div className="aurora-layer" />
        <div className="particle-field particle-pulse" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-6 max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-sm text-[var(--botanical-text-secondary)] hover:text-[var(--botanical-accent)] transition-all duration-[var(--motion-fast)]"
        >
          ← Back to StrainSpotter
        </Link>
        <span className="text-xs text-[var(--botanical-text-secondary)] uppercase tracking-[0.2em]">
          LIVE SCANNER
        </span>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 pb-16">
        {/* Hero / Emblem + title */}
        <section className="mt-4 text-center">
          <div className="hero-3d-container">
            <div className="hero-3d-wrapper">
              <div className="holo-pulse" />
              <Image
                src="/emblem/StrainSpotterEmblem.png"
                alt="StrainSpotter Emblem"
                fill
                className="hero-3d-image object-contain"
              />
            </div>

            {/* Metadata chips around hero */}
            <div className="trait-constellation" />
            <div className="meta-chip top">AI-Powered Scan</div>
            <div className="meta-chip bottom">Grow Doctor Ready</div>
            <div className="meta-chip left">Strain ID</div>
            <div className="meta-chip right">Plant Health</div>
          </div>

          <h1 className="mt-4 text-2xl font-semibold text-[var(--botanical-text-primary)]">
            StrainSpotter Scanner
          </h1>
          <p className="mt-1 text-sm text-[var(--botanical-text-secondary)]">
            Point. Capture. Let the garden brain do the rest.
          </p>
        </section>

        {/* Camera + holo frame / Image preview */}
        <section className="mt-8">
          <div
            className={`relative mx-auto max-w-[360px] aspect-[3/4]
              rounded-[32px] border border-green-400/40 bg-black/50
              shadow-[0_0_35px_rgba(16,255,180,0.45)]
              overflow-hidden backdrop-blur-xl
              ${isDragging ? 'border-green-400/80 bg-green-400/10' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Image preview (when uploaded) */}
            {uploadedImage ? (
              <>
                <img
                  src={uploadedImage}
                  alt="Uploaded preview"
                  className="w-full h-full object-cover"
                />
                {/* Clear image button */}
                <button
                  onClick={clearUploadedImage}
                  className="absolute top-3 right-3 bg-red-600/80 hover:bg-red-600 text-white rounded-full p-2 text-xs font-semibold backdrop-blur-sm transition"
                  title="Remove image"
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                {/* Camera preview */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover opacity-80"
                  playsInline
                  muted
                />

                {/* Holographic overlay */}
                <div className="absolute inset-0 pointer-events-none mix-blend-screen">
                  <div
                    className="absolute inset-[18px] rounded-[28px]
                    border border-green-400/40"
                  />
                  <div className="absolute left-1/2 -translate-x-1/2 top-4 text-[10px] tracking-[0.22em] uppercase text-[var(--botanical-text-secondary)]">
                    ALIGN LABEL OR LEAF
                  </div>
                  <div className="absolute inset-x-1/4 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-[var(--botanical-accent)]/70 to-transparent opacity-80" />
                  <div className="absolute inset-x-1/3 top-1/3 h-[1px] bg-gradient-to-r from-transparent via-[var(--botanical-accent)]/60 to-transparent opacity-60" />
                  <div className="absolute inset-x-1/3 bottom-1/3 h-[1px] bg-gradient-to-r from-transparent via-[var(--botanical-accent)]/60 to-transparent opacity-60" />
                </div>
              </>
            )}

            {/* Mode indicator tag */}
            <div className="absolute left-3 bottom-3 text-xs bg-[var(--botanical-blur)] border border-[var(--botanical-accent)]/40 rounded-full px-3 py-1 text-[var(--botanical-text-primary)]">
              {scanMode === 'strain' ? 'Strain Identification' : 'Grow Doctor Mode'}
            </div>

            {/* Drag overlay hint */}
            {isDragging && !uploadedImage && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-400/20 backdrop-blur-sm">
                <div className="text-center text-green-300 font-semibold">
                  <div className="text-2xl mb-2">📷</div>
                  <div>Drop image here</div>
                </div>
              </div>
            )}
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* File input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </section>

        {/* Upload button */}
        <section className="mt-4 flex justify-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-sm text-[var(--botanical-text-secondary)] hover:text-[var(--botanical-accent)] underline-offset-4 hover:underline transition"
          >
            {uploadedImage ? 'Change image' : 'Upload photo instead'}
          </button>
        </section>

        {/* Scan buttons - Mobile-first: larger touch targets */}
        <section className="mt-6 flex flex-col gap-4 items-center">
          <div className="scan-buttons w-full max-w-xs flex flex-col gap-3">
            {/* Normal Scan Button - Primary action */}
            <button
              onClick={handleNormalScan}
              disabled={isScanning || (!cameraReady && !uploadedImage)}
              className="scan-btn w-full py-4 md:py-4 rounded-full text-base md:text-lg font-semibold
                bg-gradient-to-r from-[#00ffae] to-[#16f3a8]
                text-black shadow-[0_0_35px_var(--botanical-glow)]
                flex items-center justify-center gap-2
                transition-transform active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed relative
                min-h-[56px]"
            >
              <span className="glow-ring" />
              {isScanning && scanMode === 'strain' ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-black/40 border-t-black animate-spin" />
                  Scanning…
                </>
              ) : (
                <span>ID Scan</span>
              )}
            </button>

            {/* Doctor Scan Button - Secondary action */}
            <button
              onClick={handleDoctorScan}
              disabled={isScanning || (!cameraReady && !uploadedImage)}
              className={`doctor-btn w-full py-4 md:py-4 rounded-full text-base md:text-lg font-semibold
                flex items-center justify-center gap-2
                transition-transform active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed relative
                min-h-[56px]
                ${scanAnimation === "doctor-scan" ? "doctor-scan-animation" : ""}`}
            >
              {isScanning && scanMode === 'doctor' ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Scanning…
                </>
              ) : (
                <>
                  Doctor Scan
                </>
              )}
            </button>
          </div>

        </section>

        {/* Processing Status */}
        {isScanning && processingStep && (
          <div className="mt-4 text-sm text-[var(--botanical-accent)] bg-[var(--botanical-bg-surface)] border border-[var(--botanical-accent)]/40 rounded-[var(--radius-md)] px-4 py-3 flex items-center gap-3">
            <span className="w-4 h-4 rounded-full border-2 border-[var(--botanical-accent)]/40 border-t-[var(--botanical-accent)] animate-spin" />
            {processingStep}
          </div>
        )}

        {/* Error with retry and upload fallback */}
        {error && (
          <div className="mt-4 space-y-2">
            <div className="text-xs text-[#FF6B6B] bg-[var(--botanical-bg-surface)] border border-[#FF6B6B]/40 rounded-[var(--radius-md)] px-3 py-2">
              {error}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {cameraPermissionDenied || error.includes('camera') || error.includes('Camera') ? (
                <>
                  <button
                    onClick={retryCamera}
                    className="flex-1 px-4 py-2 text-sm bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 rounded hover:bg-emerald-600/30 transition min-h-[44px]"
                  >
                    Retry Camera
                  </button>
                  <Link
                    href="/scanner/upload"
                    className="flex-1 px-4 py-2 text-sm bg-white/10 border border-white/20 text-white rounded hover:bg-white/15 transition text-center min-h-[44px] flex items-center justify-center"
                  >
                    Upload Photo Instead
                  </Link>
                </>
              ) : (
                <button
                  onClick={() => {
                    setError(null);
                    if (scanMode === 'strain') {
                      handleNormalScan();
                    } else {
                      handleDoctorScan();
                    }
                  }}
                  className="w-full px-4 py-2 text-sm bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 rounded hover:bg-emerald-600/30 transition min-h-[44px]"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}

        {/* Paywall Managers */}
        {showRegularPaywall && (
          <PaywallManager
            scanType="regular"
            onAccessGranted={() => {
              setShowRegularPaywall(false);
              setCanScan(true);
              // Retry scan after access granted
              setTimeout(() => handleNormalScan(), 100);
            }}
            onAccessDenied={() => setShowRegularPaywall(false)}
          />
        )}

        {showDoctorPaywall && (
          <PaywallManager
            scanType="doctor"
            onAccessGranted={() => {
              setShowDoctorPaywall(false);
              setCanDoctorScan(true);
              // Retry scan after access granted
              setTimeout(() => handleDoctorScan(), 100);
            }}
            onAccessDenied={() => setShowDoctorPaywall(false)}
          />
        )}

        {/* Legacy Modal (to be removed) */}
        {false && (
          <div 
            className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[var(--botanical-blur)] backdrop-blur-sm"
            onClick={() => setShowDoctorPaywall(false)}
          >
            <div 
              className="doctor-upsell-modal bg-[var(--botanical-bg-panel)] border border-[var(--botanical-accent)]/40 rounded-[var(--radius-lg)] p-8 max-w-md mx-4 backdrop-blur-xl shadow-[0_0_35px_var(--botanical-glow)]"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-green-100 mb-4">Need Doctor Credits</h2>

              <p className="text-[var(--botanical-text-primary)] mb-3">
                Doctor-level identification uses advanced AI and requires
                Doctor Scan Credits.
              </p>

              <p className="small-info text-sm text-green-200/70 mb-6">
                Members get <strong>10 doctor scans monthly</strong> — plus rollover support.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  className="join-btn w-full py-3 rounded-full bg-[var(--botanical-accent)] text-black font-semibold hover:bg-[var(--botanical-accent-alt)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-smooth)]"
                  onClick={() => router.push("/join")}
                >
                  Join the Garden
                </button>

                <button
                  className="topup-btn w-full py-3 rounded-full bg-[var(--botanical-accent-alt)]/80 text-black font-semibold hover:bg-[var(--botanical-accent-alt)] transition-all duration-[var(--motion-fast)]"
                  onClick={() => router.push("/topup")}
                >
                  Buy Doctor Credits
                </button>

                <button
                  className="text-sm text-green-300/70 hover:text-green-300 underline mt-2"
                  onClick={() => setShowDoctorPaywall(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
