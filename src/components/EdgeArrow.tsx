import { useEffect, useState } from 'react';
import type L from 'leaflet';
import type { IssSample } from '../state';

type EdgeArrowProps = {
  current: IssSample;
  map: L.Map | null;
  nowMs: number;
};

const INSET = 28;

export default function EdgeArrow({ current, map, nowMs }: EdgeArrowProps) {
  const [pos, setPos] = useState<{ x: number; y: number; rotation: number } | null>(null);

  useEffect(() => {
    if (!map) return;

    const recompute = () => {
      const size = map.getSize();
      const cx = size.x / 2;
      const cy = size.y / 2;
      const issPoint = map.latLngToContainerPoint([current.lat, current.lon]);
      const dx = issPoint.x - cx;
      const dy = issPoint.y - cy;
      if (dx === 0 && dy === 0) {
        setPos(null);
        return;
      }
      const tx = (size.x / 2) - INSET;
      const ty = (size.y / 2) - INSET;
      const scale = Math.min(tx / Math.max(1, Math.abs(dx)), ty / Math.max(1, Math.abs(dy)));
      const ex = cx + dx * scale;
      const ey = cy + dy * scale;
      const rotation = (Math.atan2(dy, dx) * 180) / Math.PI;
      setPos({ x: ex, y: ey, rotation });
    };

    recompute();
    map.on('move', recompute);
    map.on('zoom', recompute);
    return () => {
      map.off('move', recompute);
      map.off('zoom', recompute);
    };
  }, [current.lat, current.lon, map, nowMs]);

  if (!pos) return null;

  return (
    <div
      className="edge-arrow absolute pointer-events-none z-[550] flex items-center justify-center rounded-full"
      style={{
        left: pos.x,
        top: pos.y,
        width: 36,
        height: 36,
        transform: `translate(-50%, -50%)`,
        background: 'rgba(22,27,34,0.78)',
        border: '1px solid rgba(34,211,238,0.4)',
        boxShadow: '0 0 14px rgba(34,211,238,0.35)',
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transform: `rotate(${pos.rotation}deg)` }}
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </div>
  );
}
