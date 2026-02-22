import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { getSessions, getEvents } from '../store/localStorage';

export default function MapTestPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [debugInfo, setDebugInfo] = useState('読み込み中...');

  useEffect(() => {
    // データ確認
    const sessions = getSessions();
    const events = getEvents();
    const withRoute = sessions.filter(s => s.routePoints && s.routePoints.length > 0);
    const withLocation = events.filter(e => e.location !== null);

    let info = `セッション: ${sessions.length}件\n`;
    info += `ルート付き: ${withRoute.length}件\n`;
    info += `イベント: ${events.length}件\n`;
    info += `位置付き: ${withLocation.length}件\n`;

    if (withRoute.length > 0) {
      const s = withRoute[0];
      info += `\n最初のルート: ${s.routePoints.length}ポイント\n`;
      info += `先頭: lat=${s.routePoints[0].lat}, lng=${s.routePoints[0].lng}\n`;
    }

    setDebugInfo(info);

    // マップ描画テスト
    if (!mapRef.current) return;

    try {
      // 固定座標でマップ描画（大阪城）
      const testLat = 34.6873;
      const testLng = 135.5262;

      const map = L.map(mapRef.current).setView([testLat, testLng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      // テストマーカー
      L.marker([testLat, testLng]).addTo(map).bindPopup('テストピン（大阪城）');

      // 実データがあれば追加
      if (withRoute.length > 0) {
        const route = withRoute[0].routePoints;
        const line = route.map(p => L.latLng(p.lat, p.lng));
        L.polyline(line, { color: 'red', weight: 3 }).addTo(map);
        map.fitBounds(L.latLngBounds(line), { padding: [20, 20] });
      }

      if (withLocation.length > 0) {
        for (const ev of withLocation.slice(0, 10)) {
          L.circleMarker([ev.location!.lat, ev.location!.lng], {
            radius: 8,
            color: '#e53935',
            fillColor: '#e53935',
            fillOpacity: 0.8,
          }).addTo(map).bindPopup(`${ev.stimulus} → ${ev.behavior}`);
        }
      }

      return () => { map.remove(); };
    } catch (err) {
      setDebugInfo(prev => prev + '\n\nLeafletエラー: ' + String(err));
    }
  }, []);

  return (
    <div className="page" style={{ paddingBottom: 16 }}>
      <h1 className="page-title">マップテスト</h1>
      <pre className="card" style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{debugInfo}</pre>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div ref={mapRef} style={{ height: 400, width: '100%', background: '#ddd' }} />
      </div>
    </div>
  );
}
