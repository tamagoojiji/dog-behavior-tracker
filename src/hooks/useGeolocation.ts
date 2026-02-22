import { useEffect, useRef, useCallback, useState } from 'react';
import type { GeoPoint } from '../types';

export function useGeolocation(active: boolean, intervalMs = 7000) {
  const [currentPosition, setCurrentPosition] = useState<GeoPoint | null>(null);
  const pointsRef = useRef<GeoPoint[]>([]);

  const getPoints = useCallback(() => pointsRef.current, []);

  useEffect(() => {
    if (!active || !navigator.geolocation) return;

    const record = (pos: GeolocationPosition) => {
      const point: GeoPoint = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        timestamp: Date.now(),
      };
      pointsRef.current.push(point);
      setCurrentPosition(point);
    };

    // 初回取得
    navigator.geolocation.getCurrentPosition(record, () => {}, {
      enableHighAccuracy: true,
    });

    // 定期取得
    const id = setInterval(() => {
      navigator.geolocation.getCurrentPosition(record, () => {}, {
        enableHighAccuracy: true,
        maximumAge: intervalMs,
      });
    }, intervalMs);

    return () => {
      clearInterval(id);
    };
  }, [active, intervalMs]);

  const reset = useCallback(() => {
    pointsRef.current = [];
    setCurrentPosition(null);
  }, []);

  return { currentPosition, getPoints, reset };
}
