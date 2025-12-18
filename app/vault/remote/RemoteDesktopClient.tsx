'use client';

import { useState, useRef, useEffect } from 'react';
import { vaultTheme } from '../vaultTheme';
import { Monitor, Play, Square, RotateCcw, Settings } from 'lucide-react';

export default function RemoteDesktopClient() {
  const [connected, setConnected] = useState(false);
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('medium');
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const startSession = async () => {
    try {
      // Create WebRTC peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      peerConnectionRef.current = pc;

      // Handle incoming stream
      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
        }
      };

      // Connect to signaling server
      const ws = new WebSocket('ws://localhost:9000');
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'start', quality }));
      };

      ws.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(message.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: 'answer', answer }));
        } else if (message.type === 'ice-candidate') {
          await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
      };

      // Start session via API
      const res = await fetch('/api/vault/remote/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quality })
      });

      if (res.ok) {
        setConnected(true);
      }
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start remote desktop session');
    }
  };

  const stopSession = async () => {
    try {
      await fetch('/api/vault/remote/stop', { method: 'POST' });
      
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setConnected(false);
    } catch (error) {
      console.error('Failed to stop session:', error);
    }
  };

  const sendKey = async (key: string) => {
    if (!connected) return;
    
    try {
      await fetch('/api/vault/remote/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
    } catch (error) {
      console.error('Failed to send key:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Remote Desktop</h1>
        <div className="flex gap-2">
          <button
            onClick={startSession}
            disabled={connected}
            className="px-4 py-2 rounded flex items-center gap-2 hover:opacity-80 disabled:opacity-50"
            style={{
              backgroundColor: vaultTheme.colors.accent,
              color: 'white'
            }}
          >
            <Play className="h-4 w-4" />
            Start Session
          </button>
          <button
            onClick={stopSession}
            disabled={!connected}
            className="px-4 py-2 rounded flex items-center gap-2 hover:opacity-80 disabled:opacity-50"
            style={{
              backgroundColor: vaultTheme.colors.error,
              color: 'white'
            }}
          >
            <Square className="h-4 w-4" />
            Stop Session
          </button>
        </div>
      </div>

      <div
        className="flex-1 rounded-[var(--radius-md)] border overflow-hidden relative"
        style={{
          backgroundColor: vaultTheme.colors.panelDark,
          borderColor: vaultTheme.colors.border
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />
        
        {!connected && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Monitor className="h-16 w-16 mx-auto mb-4" style={{ color: vaultTheme.colors.textSecondary }} />
              <p style={{ color: vaultTheme.colors.textSecondary }}>
                Click "Start Session" to begin remote desktop streaming
              </p>
            </div>
          </div>
        )}

        {/* Control Bar */}
        {connected && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 rounded-[var(--radius-md)]"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <button
              onClick={() => sendKey('Ctrl+C')}
              className="px-3 py-1 rounded text-sm hover:opacity-80"
              style={{
                backgroundColor: vaultTheme.colors.panelMid,
                color: vaultTheme.colors.textPrimary
              }}
            >
              Send Ctrl+C
            </button>
            <button
              onClick={() => setQuality(quality === 'high' ? 'medium' : quality === 'medium' ? 'low' : 'high')}
              className="px-3 py-1 rounded text-sm hover:opacity-80"
              style={{
                backgroundColor: vaultTheme.colors.panelMid,
                color: vaultTheme.colors.textPrimary
              }}
            >
              Quality: {quality}
            </button>
            <button
              onClick={startSession}
              className="px-3 py-1 rounded text-sm hover:opacity-80"
              style={{
                backgroundColor: vaultTheme.colors.panelMid,
                color: vaultTheme.colors.textPrimary
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
