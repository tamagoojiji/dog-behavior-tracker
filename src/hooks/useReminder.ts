import { useState, useRef, useCallback, useEffect } from 'react';

export interface ScheduleItem {
  type: 'behavior' | 'interval';
  duration: number; // 秒
}

export interface ReminderConfig {
  totalTime: number;    // 上限時間（秒）
  avgDuration: number;  // 平均行動時間（秒）
  count: number;        // 行動回数
  maxInterval: number;  // インターバル上限（秒）、0なら制限なし
}

// ランダム値を生成し、合計が targetSum になるよう正規化・丸め
function randomDistribute(count: number, targetSum: number, minVal: number, maxVal: number): number[] {
  if (count <= 0 || targetSum <= 0) return [];
  if (count === 1) return [targetSum];

  // ランダム値を生成
  const raw = Array.from({ length: count }, () => minVal + Math.random() * (maxVal - minVal));
  const rawSum = raw.reduce((a, b) => a + b, 0);

  // 正規化
  const scaled = raw.map(v => (v / rawSum) * targetSum);

  // 丸め（合計が targetSum になるよう調整）
  const rounded = scaled.map(v => Math.max(1, Math.round(v)));
  let diff = targetSum - rounded.reduce((a, b) => a + b, 0);

  // 差分を分配
  while (diff !== 0) {
    for (let i = 0; i < rounded.length && diff !== 0; i++) {
      if (diff > 0) {
        rounded[i]++;
        diff--;
      } else if (diff < 0 && rounded[i] > 1) {
        rounded[i]--;
        diff++;
      }
    }
  }

  return rounded;
}

export function generateSchedule(config: ReminderConfig): ScheduleItem[] {
  const { totalTime, avgDuration, count, maxInterval } = config;
  const totalBehavior = avgDuration * count;
  let totalInterval = totalTime - totalBehavior;

  if (totalInterval < 0 || count <= 0) return [];

  // maxIntervalが指定されている場合、各インターバルの上限を適用
  if (maxInterval > 0) {
    const cappedTotal = maxInterval * count;
    if (totalInterval > cappedTotal) {
      totalInterval = cappedTotal;
    }
  }

  const minBehavior = Math.max(1, Math.round(avgDuration * 0.2));
  const maxBehavior = avgDuration * 2;

  const behaviorDurations = randomDistribute(count, totalBehavior, minBehavior, maxBehavior);
  const intervalMaxPerItem = maxInterval > 0 ? maxInterval : Math.max(2, Math.round(totalInterval / count) * 2);
  const intervalDurations = totalInterval > 0
    ? randomDistribute(count, totalInterval, 1, intervalMaxPerItem)
    : Array.from({ length: count }, () => 0);

  // 交互に配置: behavior1, interval1, behavior2, interval2, ...
  const schedule: ScheduleItem[] = [];
  for (let i = 0; i < count; i++) {
    schedule.push({ type: 'behavior', duration: behaviorDurations[i] });
    if (intervalDurations[i] > 0) {
      schedule.push({ type: 'interval', duration: intervalDurations[i] });
    }
  }

  return schedule;
}

// AudioContext をモジュールスコープでキャッシュ（iOS Safari対策）
let audioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

// ビープ音を鳴らす
function playBeep(frequency: number, durationMs: number) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // Audio API not available
  }
}

// 通知（ビープ音 + バイブレーション）
export function notify(type: 'start' | 'stop') {
  if (type === 'start') {
    playBeep(880, 200); // 高音
  } else {
    playBeep(440, 300); // 低音
  }
  if (navigator.vibrate) {
    navigator.vibrate(type === 'start' ? [100, 50, 100] : [200]);
  }
}

export interface ReminderState {
  phase: 'behavior' | 'interval' | null;
  currentIndex: number;   // 何回目の行動か（1始まり）
  totalCount: number;     // 行動の合計回数
  countdown: number;      // 現フェーズの残り秒数
  totalRemaining: number; // 全体の残り秒数
  isRunning: boolean;
  isPaused: boolean;
  start: (config: ReminderConfig) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

export function useReminder(): ReminderState {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [phase, setPhase] = useState<'behavior' | 'interval' | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [totalRemaining, setTotalRemaining] = useState(0);

  const scheduleRef = useRef<ScheduleItem[]>([]);
  const scheduleIdxRef = useRef(0);
  const phaseEndRef = useRef(0);    // 現フェーズの終了timestamp
  const totalEndRef = useRef(0);    // 全体の終了timestamp
  const timerRef = useRef<number>(0);
  const audioUnlockedRef = useRef(false);
  // 一時停止時の残り時間を保持
  const pausedPhaseRemainingRef = useRef(0);
  const pausedTotalRemainingRef = useRef(0);

  const advancePhase = useCallback(() => {
    const schedule = scheduleRef.current;
    const idx = scheduleIdxRef.current;

    if (idx >= schedule.length) {
      // 全スケジュール完了
      notify('stop');
      setIsRunning(false);
      setPhase(null);
      setCountdown(0);
      setTotalRemaining(0);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const item = schedule[idx];
    setPhase(item.type);
    setCountdown(item.duration);
    phaseEndRef.current = Date.now() + item.duration * 1000;

    // 行動回数のカウント
    if (item.type === 'behavior') {
      const behaviorIdx = schedule.slice(0, idx + 1).filter(s => s.type === 'behavior').length;
      setCurrentIndex(behaviorIdx);
      notify('start');
    } else {
      notify('stop');
    }

    scheduleIdxRef.current = idx + 1;
  }, []);

  const tick = useCallback(() => {
    const now = Date.now();
    const phaseLeft = Math.max(0, Math.ceil((phaseEndRef.current - now) / 1000));
    const totalLeft = Math.max(0, Math.ceil((totalEndRef.current - now) / 1000));
    setCountdown(phaseLeft);
    setTotalRemaining(totalLeft);

    if (phaseLeft <= 0) {
      advancePhase();
    }
  }, [advancePhase]);

  const start = useCallback((config: ReminderConfig) => {
    const schedule = generateSchedule(config);
    if (schedule.length === 0) return;

    // iOS Safari対策: ユーザー操作起点でAudioContextをアンロック
    if (!audioUnlockedRef.current) {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') ctx.resume();
      audioUnlockedRef.current = true;
    }

    scheduleRef.current = schedule;
    scheduleIdxRef.current = 0;
    const totalDuration = schedule.reduce((sum, item) => sum + item.duration, 0);
    totalEndRef.current = Date.now() + totalDuration * 1000;
    setTotalCount(config.count);
    setTotalRemaining(totalDuration);
    setIsRunning(true);

    advancePhase();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(tick, 200);
  }, [advancePhase, tick]);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = 0;
    setIsRunning(false);
    setIsPaused(false);
    setPhase(null);
    setCountdown(0);
    setTotalRemaining(0);
    scheduleRef.current = [];
    scheduleIdxRef.current = 0;
  }, []);

  const pause = useCallback(() => {
    if (!isRunning || isPaused) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = 0;
    const now = Date.now();
    pausedPhaseRemainingRef.current = Math.max(0, phaseEndRef.current - now);
    pausedTotalRemainingRef.current = Math.max(0, totalEndRef.current - now);
    setIsPaused(true);
  }, [isRunning, isPaused]);

  const resume = useCallback(() => {
    if (!isRunning || !isPaused) return;
    const now = Date.now();
    phaseEndRef.current = now + pausedPhaseRemainingRef.current;
    totalEndRef.current = now + pausedTotalRemainingRef.current;
    setIsPaused(false);
    timerRef.current = window.setInterval(tick, 200);
  }, [isRunning, isPaused, tick]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    phase,
    currentIndex,
    totalCount,
    countdown,
    totalRemaining,
    isRunning,
    isPaused,
    start,
    stop,
    pause,
    resume,
  };
}
