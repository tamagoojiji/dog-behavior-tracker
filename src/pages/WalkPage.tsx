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
  const [comment, setComment] = useState('');
  const [isListening, setIsListening] = useState(false);

  const [eventCount, setEventCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);

  const { currentPosition, getPoints } = useGeolocation(true);
  useWakeLock(true);

  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null);

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
    setComment('');
    setIsListening(false);
  }, []);

  const handleRecord = useCallback(() => {
    if (!dog || !stimulus) return;

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
      comment,
      location: currentPosition,
    };

    saveEvent(event);
    setEventCount(prev => prev + 1);
    if (behavior === 'アイコンタクト') setSuccessCount(prev => prev + 1);
    resetSelection();
  }, [dog, sessionId, elapsed, stimulus, behavior, latency, distance, comment, currentPosition, resetSelection]);

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

  const toggleSpeech = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognition = createRecognition();
    if (!recognition) return;
    recognitionRef.current = recognition;
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      setComment(prev => prev + transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  if (!dog) {
    return <Navigate to="/login" replace />;
  }

  const canRecord = !!stimulus;

  return (
    <div className="page" style={{ paddingBottom: 16 }}>
      <div className="walk-timer">{formatTimer(elapsed)}</div>

      <div className="walk-counter">
        <span>記録: <strong>{eventCount}</strong>件</span>
        <span>アイコンタクト: <strong style={{ color: 'var(--success)' }}>{successCount}</strong></span>
      </div>

      <div className="section-label">SD（刺激）</div>
      <ButtonGrid options={dog.stimulusOptions} selected={stimulus} onSelect={setStimulus} columns={3} />

      <div className="section-label">行動</div>
      <ButtonGrid
        options={stimulus ? (dog.behaviorsByStimulus?.[stimulus] ?? dog.targetBehaviors) : dog.targetBehaviors}
        selected={behavior}
        onSelect={setBehavior}
        columns={3}
      />

      <div className="section-label">行動が出るまでの時間</div>
      <ButtonGrid
        options={dog.latencyOptions.map(l => l === -1 ? 'なし' : `${l}秒`)}
        selected={latency === null ? null : latency === -1 ? 'なし' : `${latency}秒`}
        onSelect={v => setLatency(v === 'なし' ? -1 : Number(v.replace('秒', '')))}
        columns={4}
      />

      <div className="section-label">刺激との距離</div>
      <DistanceScroller options={dog.distanceOptions} selected={distance} onSelect={setDistance} />

      <div className="section-label">コメント</div>
      <div className="comment-input-wrap">
        <textarea
          className="input"
          placeholder="メモ..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={2}
          style={{ minHeight: 48 }}
        />
        <button
          type="button"
          className={`mic-btn ${isListening ? 'listening' : ''}`}
          onClick={toggleSpeech}
          aria-label="音声入力"
        >
          🎤
        </button>
      </div>

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
        記録終了
      </button>
    </div>
  );
}

interface SpeechRecognitionResult {
  readonly [index: number]: { transcript: string };
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [Symbol.iterator](): Iterator<SpeechRecognitionResult>;
}
interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: SpeechRecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

function createRecognition(): SpeechRecognitionInstance | null {
  const w = window as unknown as Record<string, unknown>;
  const SR = (w.webkitSpeechRecognition ?? w.SpeechRecognition) as
    | (new () => SpeechRecognitionInstance)
    | undefined;
  if (!SR) return null;
  const r = new SR();
  r.lang = 'ja-JP';
  r.interimResults = false;
  r.continuous = false;
  return r;
}
