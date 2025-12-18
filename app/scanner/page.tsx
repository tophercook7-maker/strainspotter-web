// app/scanner/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ScanResultPanel from '@/components/ScanResultPanel';
import PaywallManager from '@/components/paywalls/PaywallManager';
import { useScanGate } from '@/lib/hooks/useScanGate';

type ScanMode = 'strain' | 'doctor';

export default function ScannerPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('strain');
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  
  // Paywall state
  const [showRegularPaywall, setShowRegularPaywall] = useState(false);
  const [showDoctorPaywall, setShowDoctorPaywall] = useState(false);
  const [canScan, setCanScan] = useState(false);
  const [canDoctorScan, setCanDoctorScan] = useState(false);
  const { checkScanAccess, deductScan } = useScanGate();
  const [scanAnimation, setScanAnimation] = useState<string | null>(null);

  // Start camera on mount
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function initCamera() {
      try {
        setError(null);
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (err) {
        console.error(err);
        setError('Unable to access camera. Check permissions in your browser settings.');
      }
    }

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function handleNormalScan() {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera not ready yet.');
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
    setProcessingStep('Capturing image...');
    setScanMode('strain');

    try {
      // Capture frame
      const video = videoRef.current;
      const canvas = canvasRef.current;
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
      const base64 = await new Promise<string>((resolve, reject) => {
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

      // STEP 2: POST /api/uploads
      setProcessingStep('Uploading...');
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
      });

      if (!uploadResponse.ok) {
        const text = await uploadResponse.text();
        const error = text ? JSON.parse(text) : null;
        throw new Error(error?.error || 'Upload failed');
      }

      const text = await uploadResponse.text();
      const uploadData = text ? JSON.parse(text) : null;
      const scanId = uploadData.scan_id;

      // STEP 3: POST /api/scans/${scan_id}/process
      setProcessingStep('Analyzing image...');
      const processResponse = await fetch(`/api/scans/${scanId}/process`, {
        method: 'POST',
      });

      if (!processResponse.ok) {
        const text = await processResponse.text();
        const error = text ? JSON.parse(text) : null;
        throw new Error(error?.error || 'Processing failed');
      }

      // STEP 4: POST /api/visual-match
      setProcessingStep('Matching strain...');
      const matchResponse = await fetch('/api/visual-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scan_id: scanId }),
      });

      if (!matchResponse.ok) {
        const text = await matchResponse.text();
        const error = text ? JSON.parse(text) : null;
        // Still redirect even if match fails - result page will show "Strain Unknown"
        console.warn('Visual matching failed:', error);
      }

      // STEP 5: Redirect to /scan/${scan_id}
      setProcessingStep('Complete!');
      router.push(`/scan/${scanId}`);
    } catch (err: any) {
      console.error('[scanner] Scan error:', err);
      setError(err.message || 'Scan failed. Please try again.');
      setProcessingStep(null);
    } finally {
      setIsScanning(false);
    }
  }

  async function handleDoctorScan() {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera not ready yet.');
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
      // Capture frame
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      const width = video.videoWidth || 720;
      const height = video.videoHeight || 720;

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(video, 0, 0, width, height);

      // Process doctor scan via API
      const imageData = canvas.toDataURL('image/jpeg');
      const response = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          scan_type: 'doctor',
        }),
      });
      
      if (response.ok) {
        const { scan_id } = await response.json();
        router.push(`/scan/${scan_id}`);
      } else {
        setError('Failed to process doctor scan');
        setIsScanning(false);
      }
    } catch (err) {
      console.error(err);
      setError('Scan failed. Please try again.');
    } finally {
      setIsScanning(false);
      setScanAnimation(null);
    }
  }

  return (
    <div className="relative min-h-screen text-[var(--botanical-text-primary)] overflow-hidden bg-[var(--botanical-bg-deep)] pb-20 md:pb-0">
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

        {/* Camera + holo frame */}
        <section className="mt-8">
          <div
            className="relative mx-auto max-w-[360px] aspect-[3/4]
              rounded-[32px] border border-green-400/40 bg-black/50
              shadow-[0_0_35px_rgba(16,255,180,0.45)]
              overflow-hidden backdrop-blur-xl"
          >
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

            {/* Mode indicator tag */}
            <div className="absolute left-3 bottom-3 text-xs bg-[var(--botanical-blur)] border border-[var(--botanical-accent)]/40 rounded-full px-3 py-1 text-[var(--botanical-text-primary)]">
              {scanMode === 'strain' ? 'Strain Identification' : 'Grow Doctor Mode'}
            </div>
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </section>

        {/* Scan buttons - Mobile-first: larger touch targets */}
        <section className="mt-6 flex flex-col gap-4 items-center">
          <div className="scan-buttons w-full max-w-xs flex flex-col gap-3">
            {/* Normal Scan Button - Primary action */}
            <button
              onClick={handleNormalScan}
              disabled={isScanning || !cameraReady}
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
              disabled={isScanning || !cameraReady}
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

          {/* Upload fallback */}
          <Link
            href="/scanner/upload"
            className="text-xs text-[var(--botanical-text-secondary)] underline-offset-4 hover:underline hover:text-[var(--botanical-accent)]"
          >
            or upload a photo instead →
          </Link>
        </section>

        {/* Processing Status */}
        {isScanning && processingStep && (
          <div className="mt-4 text-sm text-[var(--botanical-accent)] bg-[var(--botanical-bg-surface)] border border-[var(--botanical-accent)]/40 rounded-[var(--radius-md)] px-4 py-3 flex items-center gap-3">
            <span className="w-4 h-4 rounded-full border-2 border-[var(--botanical-accent)]/40 border-t-[var(--botanical-accent)] animate-spin" />
            {processingStep}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 text-xs text-[#FF6B6B] bg-[var(--botanical-bg-surface)] border border-[#FF6B6B]/40 rounded-[var(--radius-md)] px-3 py-2">
            {error}
            <button
              onClick={() => {
                setError(null);
                if (scanMode === 'strain') {
                  handleNormalScan();
                } else {
                  handleDoctorScan();
                }
              }}
              className="ml-2 underline hover:no-underline"
            >
              Retry
            </button>
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
