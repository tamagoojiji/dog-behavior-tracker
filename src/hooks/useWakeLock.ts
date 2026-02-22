import { useEffect, useRef } from 'react';

export function useWakeLock(active: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;

    let cancelled = false;

    const request = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          lock.release();
          return;
        }
        wakeLockRef.current = lock;
      } catch {
        // Wake Lock API not supported or failed
      }
    };

    request();

    return () => {
      cancelled = true;
      wakeLockRef.current?.release();
      wakeLockRef.current = null;
    };
  }, [active]);
}
