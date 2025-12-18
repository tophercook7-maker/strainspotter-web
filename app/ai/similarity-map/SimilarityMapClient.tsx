'use client';

import { useState, useEffect, useRef } from 'react';

interface StrainPoint {
  strain: string;
  x: number;
  y: number;
  cluster: number;
}

export default function SimilarityMapClient() {
  const [mapData, setMapData] = useState<StrainPoint[]>([]);
  const [selectedStrain, setSelectedStrain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadMapData();
  }, []);

  useEffect(() => {
    if (mapData.length > 0 && canvasRef.current) {
      drawMap();
    }
  }, [mapData, selectedStrain]);

  const loadMapData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ai/similarity-map');
      if (!res.ok) throw new Error('Failed to load map');
      const data = await res.json();
      setMapData(data);
    } catch (error) {
      console.error('Failed to load map:', error);
    } finally {
      setLoading(false);
    }
  };

  const drawMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Normalize coordinates to canvas size
    const padding = 50;
    const minX = Math.min(...mapData.map(p => p.x));
    const maxX = Math.max(...mapData.map(p => p.x));
    const minY = Math.min(...mapData.map(p => p.y));
    const maxY = Math.max(...mapData.map(p => p.y));

    const scaleX = (canvas.width - padding * 2) / (maxX - minX || 1);
    const scaleY = (canvas.height - padding * 2) / (maxY - minY || 1);

    const clusterColors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];

    // Draw points
    mapData.forEach(point => {
      const x = (point.x - minX) * scaleX + padding;
      const y = (point.y - minY) * scaleY + padding;
      const color = clusterColors[point.cluster % clusterColors.length];

      ctx.fillStyle = selectedStrain === point.strain ? '#FF0000' : color;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Draw label on hover (simplified - would need mouse tracking)
      if (selectedStrain === point.strain) {
        ctx.fillStyle = '#000';
        ctx.font = '12px sans-serif';
        ctx.fillText(point.strain, x + 10, y);
      }
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">Strain Similarity Map</h1>
        <p>Loading map data...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Strain Similarity Map</h1>
      <p className="text-gray-600 mb-6">
        Interactive visualization of strain relationships based on visual embeddings
      </p>

      <div className="bg-white rounded-lg shadow p-6">
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          className="w-full border rounded cursor-pointer"
          onClick={(e) => {
            // Simple click detection (would need proper coordinate mapping)
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            // Find nearest point (simplified)
            // In production, use proper hit testing
          }}
        />
      </div>

      <div className="mt-4">
        <h2 className="text-lg font-semibold mb-2">Strains ({mapData.length})</h2>
        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
          {mapData.map((point) => (
            <button
              key={point.strain}
              onClick={() => setSelectedStrain(point.strain)}
              className={`text-left px-2 py-1 rounded text-sm ${
                selectedStrain === point.strain
                  ? 'bg-blue-100 font-semibold'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              {point.strain}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
