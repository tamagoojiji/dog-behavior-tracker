import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { BehaviorEvent, GeoPoint } from '../types';

export const BEHAVIOR_COLORS: Record<string, string> = {
  '吠え': '#e53935',
  '突進': '#ff5722',
  '固まる': '#ff9800',
  '回避': '#9c27b0',
  '引張り': '#795548',
  'アイコンタクト': '#4caf50',
};

interface EventMapProps {
  events: BehaviorEvent[];
  routePoints?: GeoPoint[];
}

export default function EventMap({ events, routePoints }: EventMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  const locatedEvents = events.filter(e => e.location !== null);
  const hasData = locatedEvents.length > 0 || (routePoints && routePoints.length > 0);

  useEffect(() => {
    if (!hasData || !mapRef.current) return;

    const allPoints: L.LatLng[] = [
      ...locatedEvents.map(e => L.latLng(e.location!.lat, e.location!.lng)),
      ...(routePoints || []).map(p => L.latLng(p.lat, p.lng)),
    ];

    const map = L.map(mapRef.current).fitBounds(L.latLngBounds(allPoints), { padding: [30, 30] });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    // 動線
    if (routePoints && routePoints.length > 1) {
      L.polyline(routePoints.map(p => L.latLng(p.lat, p.lng)), {
        color: '#4a90d9', weight: 3, opacity: 0.7,
      }).addTo(map);
    }

    // イベントピン
    for (const ev of locatedEvents) {
      const color = ev.behavior ? (BEHAVIOR_COLORS[ev.behavior] || '#757575') : '#bdbdbd';
      const behaviorLabel = ev.behavior ?? '未入力';
      const distLabel = ev.distance !== null ? `${ev.distance}m` : '未入力';
      const latLabel = ev.latency === null ? '未入力' : ev.latency === -1 ? 'なし' : `${ev.latency}s`;
      L.circleMarker([ev.location!.lat, ev.location!.lng], {
        radius: 10,
        color: 'white',
        weight: 3,
        fillColor: color,
        fillOpacity: 0.9,
      })
        .bindPopup(`<b>${ev.stimulus} → ${behaviorLabel}</b><br>距離: ${distLabel} / 潜時: ${latLabel}`)
        .addTo(map);
    }

    return () => { map.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasData) {
    return (
      <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 24 }}>
        位置情報がありません
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div ref={mapRef} style={{ height: 300, width: '100%', background: '#e0e0e0' }} />
    </div>
  );
}
