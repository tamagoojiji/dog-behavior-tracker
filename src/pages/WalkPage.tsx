import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { getActiveDog, saveSession, saveEvent } from '../store/localStorage';
import type { Session, BehaviorEvent } from '../types';
import { useGeolocation } from '../hooks/useGeolocation';
import { useWakeLock } from '../hooks/useWakeLock';
import ButtonGrid from '../components/ButtonGrid';
import DistanceScroller from '../components/DistanceScroller';

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function WalkPage() {
  const navigate = useNavigate();
  const dog = getActiveDog();

  const [sessionId] = useState(() => crypto.randomUUID());
  const startTimeRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  const [stimulus, setStimulus] = useState<string | null>(null);
  const [behavior, setBehavior] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  const [eventCount, setEventCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);

  const { currentPosition, getPoints } = useGeolocation(true);
  useWakeLock(true);

  // タイマー
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const resetSelection = useCallback(() => {
    setStimulus(null);
    setBehavior(null);
    setLatency(null);
    setDistance(null);
  }, []);

  const handleRecord = useCallback(() => {
    if (!dog || !stimulus || !behavior || latency === null || distance === null) return;

    const event: BehaviorEvent = {
      id: crypto.randomUUID(),
      sessionId,
      dogId: dog.id,
      timestamp: Date.now(),
      elapsedSeconds: elapsed,
      stimulus,
      behavior,
      latency,
      distance,
      location: currentPosition,
    };

    saveEvent(event);
    setEventCount(prev => prev + 1);
    if (behavior === '成功') setSuccessCount(prev => prev + 1);
    resetSelection();
  }, [dog, sessionId, elapsed, stimulus, behavior, latency, distance, currentPosition, resetSelection]);

  const handleEnd = useCallback(() => {
    if (!dog) return;
    const session: Session = {
      id: sessionId,
      dogId: dog.id,
      startTime: startTimeRef.current,
      endTime: Date.now(),
      routePoints: getPoints(),
      treatAmount: 0,
      comment: '',
    };
    saveSession(session);
    navigate(`/walk-result/${sessionId}`);
  }, [dog, sessionId, getPoints, navigate]);

  if (!dog) {
    return <Navigate to="/login" replace />;
  }

  const canRecord = stimulus && behavior && latency !== null && distance !== null;

  return (
    <div className="page" style={{ paddingBottom: 16 }}>
      <div className="walk-timer">{formatTimer(elapsed)}</div>

      <div className="walk-counter">
        <span>記録: <strong>{eventCount}</strong>件</span>
        <span>成功: <strong style={{ color: 'var(--success)' }}>{successCount}</strong></span>
      </div>

      <div className="section-label">SD（刺激）</div>
      <ButtonGrid options={dog.stimulusOptions} selected={stimulus} onSelect={setStimulus} columns={3} />

      <div className="section-label">行動</div>
      <ButtonGrid options={dog.targetBehaviors} selected={behavior} onSelect={setBehavior} columns={3} />

      <div className="section-label">潜時（秒）</div>
      <ButtonGrid
        options={dog.latencyOptions.map(l => l === -1 ? 'なし' : `${l}`)}
        selected={latency === null ? null : latency === -1 ? 'なし' : `${latency}`}
        onSelect={v => setLatency(v === 'なし' ? -1 : Number(v))}
        columns={4}
      />

      <div className="section-label">距離</div>
      <DistanceScroller options={dog.distanceOptions} selected={distance} onSelect={setDistance} />

      <button
        className="btn btn-primary btn-full btn-lg"
        style={{ marginTop: 16 }}
        onClick={handleRecord}
        disabled={!canRecord}
      >
        記録する
      </button>

      <button
        className="btn btn-danger btn-full"
        style={{ marginTop: 12 }}
        onClick={handleEnd}
      >
        散歩終了
      </button>
    </div>
  );
}
