'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { vaultTheme } from '../vaultTheme';
import clsx from 'clsx';

export default function VaultVoiceAssistant() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [executing, setExecuting] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Initialize Web Speech API
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setTranscript(transcript);
      };

      recognition.onend = () => {
        setListening(false);
        if (transcript) {
          executeCommand(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setListening(false);
      };

      recognitionRef.current = recognition;
    }

    // Hotkey handler
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        toggleListening();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [transcript]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not available in this browser');
      return;
    }

    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setTranscript('');
      recognitionRef.current.start();
      setListening(true);
    }
  };

  const executeCommand = async (command: string) => {
    setExecuting(true);
    setLastCommand(command);

    try {
      const res = await fetch('/api/vault/voice/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      });

      const data = await res.json();

      if (data.intent) {
        await handleIntent(data);
      } else {
        console.error('No intent returned:', data);
      }
    } catch (error) {
      console.error('Failed to execute command:', error);
    } finally {
      setExecuting(false);
      setTranscript('');
    }
  };

  const handleIntent = async (intent: any) => {
    switch (intent.intent) {
      case 'run_pipeline':
        if (intent.strain) {
          await fetch('/api/vault/pipeline/add-job', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'fullPipeline', strain: intent.strain })
          });
        }
        break;

      case 'start_scraper':
        if (intent.strain) {
          await fetch('/api/vault/scraper/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ strain: intent.strain })
          });
        }
        break;

      case 'restart_gpu':
        await fetch('/api/vault/ai/restart', { method: 'POST' });
        break;

      case 'navigate':
        if (intent.target) {
          router.push(intent.target);
        }
        break;

      case 'open_dataset':
        if (intent.strain) {
          router.push(`/vault/datasets?strain=${intent.strain}`);
        }
        break;

      default:
        console.log('Unhandled intent:', intent);
    }
  };

  return (
    <>
      {/* Floating Mic Button */}
      <button
        onClick={toggleListening}
        className={clsx(
          'fixed bottom-24 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all z-40',
          listening && 'animate-pulse'
        )}
        style={{
          backgroundColor: listening ? vaultTheme.colors.error : vaultTheme.colors.accent,
          color: 'white'
        }}
        title="Voice Assistant (⌘⇧V)"
      >
        {listening ? (
          <MicOff className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </button>

      {/* Status Indicator */}
      {(listening || executing || lastCommand) && (
        <div
          className="fixed bottom-24 right-20 w-64 rounded-[var(--radius-md)] border p-3 shadow-lg z-40"
          style={{
            backgroundColor: vaultTheme.colors.panelDark,
            borderColor: vaultTheme.colors.border
          }}
        >
          {listening && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: vaultTheme.colors.error }} />
              <span className="text-sm" style={{ color: vaultTheme.colors.textSecondary }}>
                Listening...
              </span>
            </div>
          )}
          {transcript && (
            <div className="text-sm mb-2" style={{ color: vaultTheme.colors.textPrimary }}>
              "{transcript}"
            </div>
          )}
          {executing && (
            <div className="text-sm" style={{ color: vaultTheme.colors.accent }}>
              Executing...
            </div>
          )}
          {lastCommand && !executing && (
            <div className="text-xs" style={{ color: vaultTheme.colors.textSecondary }}>
              Last: {lastCommand}
            </div>
          )}
        </div>
      )}
    </>
  );
}
