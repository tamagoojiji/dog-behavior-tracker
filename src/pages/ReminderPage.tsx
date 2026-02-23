import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReminder } from '../hooks/useReminder';
import { useWakeLock } from '../hooks/useWakeLock';
import type { ReminderConfig } from '../hooks/useReminder';

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ReminderPage() {
  const navigate = useNavigate();
  const reminder = useReminder();
  useWakeLock(reminder.isRunning);

  const [rmTotalTime, setRmTotalTime] = useState('5');
  const [rmTotalUnit, setRmTotalUnit] = useState<'s' | 'm'>('m');
  const [rmAvgDuration, setRmAvgDuration] = useState('5');
  const [rmAvgUnit, setRmAvgUnit] = useState<'s' | 'm'>('s');
  const [rmCount, setRmCount] = useState('');
  const [rmMaxInterval, setRmMaxInterval] = useState('');
  const [rmIntervalUnit, setRmIntervalUnit] = useState<'s' | 'm'>('s');
  const [rmAutoField, setRmAutoField] = useState<'totalTime' | 'avgDuration' | 'count'>('count');

  const toSeconds = (val: string, unit: 's' | 'm') => {
    const n = Number(val);
    return unit === 'm' ? n * 60 : n;
  };

  const fromSeconds = (sec: number, unit: 's' | 'm') => {
    return unit === 'm' ? Math.round(sec / 60) : Math.round(sec);
  };

  const calcReminderAuto = useCallback((field: string) => {
    const t = toSeconds(rmTotalTime, rmTotalUnit);
    const a = toSeconds(rmAvgDuration, rmAvgUnit);
    const c = Number(rmCount);
    const mi = rmMaxInterval ? toSeconds(rmMaxInterval, rmIntervalUnit) : 0;
    // インターバル上限がある場合、1サイクル = 行動時間 + min(行動時間, 上限)
    const avgInterval = mi > 0 ? Math.min(a, mi) : a;
    if (field !== 'count' && t > 0 && a > 0) {
      const calc = Math.round(t / (a + avgInterval));
      setRmCount(calc > 0 ? String(calc) : '');
      setRmAutoField('count');
    } else if (field !== 'avgDuration' && t > 0 && c > 0) {
      const calcSec = Math.round(t / (c * 2));
      const display = fromSeconds(calcSec, rmAvgUnit);
      setRmAvgDuration(display > 0 ? String(display) : '');
      setRmAutoField('avgDuration');
    } else if (field !== 'totalTime' && a > 0 && c > 0) {
      const calcSec = a * c + avgInterval * c;
      const display = fromSeconds(calcSec, rmTotalUnit);
      setRmTotalTime(display > 0 ? String(display) : '');
      setRmAutoField('totalTime');
    }
  }, [rmTotalTime, rmTotalUnit, rmAvgDuration, rmAvgUnit, rmCount, rmMaxInterval, rmIntervalUnit]);

  const handleStart = useCallback(() => {
    const config: ReminderConfig = {
      totalTime: toSeconds(rmTotalTime, rmTotalUnit),
      avgDuration: toSeconds(rmAvgDuration, rmAvgUnit),
      count: Number(rmCount) || 0,
      maxInterval: rmMaxInterval ? toSeconds(rmMaxInterval, rmIntervalUnit) : 0,
    };
    if (config.totalTime > 0 && config.avgDuration > 0 && config.count > 0) {
      reminder.start(config);
    }
  }, [rmTotalTime, rmTotalUnit, rmAvgDuration, rmAvgUnit, rmCount, rmMaxInterval, rmIntervalUnit, reminder]);

  const unitToggle = (
    currentUnit: 's' | 'm',
    onSwitch: (unit: 's' | 'm', convertedVal: string) => void,
    currentVal: string,
  ) => (
    <div style={{ display: 'flex', marginTop: 4, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
      <button
        style={{
          flex: 1, padding: '4px 0', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
          background: currentUnit === 's' ? 'var(--primary)' : 'white',
          color: currentUnit === 's' ? 'white' : 'var(--text-secondary)',
        }}
        onClick={() => {
          if (currentUnit === 'm') onSwitch('s', String(toSeconds(currentVal, 'm')));
        }}
      >秒</button>
      <button
        style={{
          flex: 1, padding: '4px 0', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
          background: currentUnit === 'm' ? 'var(--primary)' : 'white',
          color: currentUnit === 'm' ? 'white' : 'var(--text-secondary)',
        }}
        onClick={() => {
          if (currentUnit === 's') onSwitch('m', String(fromSeconds(Number(currentVal), 'm')));
        }}
      >分</button>
    </div>
  );

  return (
    <div className="page" style={{ paddingBottom: 16 }}>
      <h1 className="page-title">リマインダー</h1>

      {reminder.isRunning ? (
        /* === 実行中 === */
        <>
          <div className="card">
            <div style={{
              textAlign: 'center',
              padding: '20px 0',
              borderRadius: 10,
              background: reminder.phase === 'behavior' ? '#e8f5e9' : '#f5f5f5',
              transition: 'background 0.3s',
            }}>
              <div style={{
                fontSize: 22,
                fontWeight: 700,
                color: reminder.phase === 'behavior' ? 'var(--success)' : 'var(--text-secondary)',
              }}>
                {reminder.phase === 'behavior'
                  ? `行動 ${reminder.currentIndex}/${reminder.totalCount}`
                  : 'インターバル'}
              </div>
              <div style={{
                fontSize: 64,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                marginTop: 12,
                color: reminder.phase === 'behavior' ? 'var(--success)' : 'var(--text-secondary)',
              }}>
                {reminder.countdown}
                <span style={{ fontSize: 20, fontWeight: 400 }}>秒</span>
              </div>
              <div style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                marginTop: 12,
              }}>
                残り {formatTimer(reminder.totalRemaining)}
              </div>
            </div>
          </div>

          <button
            className="btn btn-full"
            style={{
              marginTop: 16,
              minHeight: 56,
              background: 'var(--bg)',
              border: '2px solid var(--danger)',
              color: 'var(--danger)',
              fontSize: 18,
            }}
            onClick={reminder.stop}
          >
            停止
          </button>
        </>
      ) : (
        /* === 設定 === */
        <>
          <div className="card">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label className="label" style={{ marginTop: 0 }}>上限時間</label>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  value={rmTotalTime}
                  onChange={e => setRmTotalTime(e.target.value)}
                  onBlur={() => calcReminderAuto('totalTime')}
                  style={{
                    minHeight: 40,
                    fontSize: 14,
                    background: rmAutoField === 'totalTime' ? '#fff9c4' : undefined,
                  }}
                />
                {unitToggle(rmTotalUnit, (u, v) => { setRmTotalUnit(u); setRmTotalTime(v); }, rmTotalTime)}
              </div>
              <div>
                <label className="label" style={{ marginTop: 0 }}>平均行動時間</label>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  value={rmAvgDuration}
                  onChange={e => setRmAvgDuration(e.target.value)}
                  onBlur={() => calcReminderAuto('avgDuration')}
                  style={{
                    minHeight: 40,
                    fontSize: 14,
                    background: rmAutoField === 'avgDuration' ? '#fff9c4' : undefined,
                  }}
                />
                {unitToggle(rmAvgUnit, (u, v) => { setRmAvgUnit(u); setRmAvgDuration(v); }, rmAvgDuration)}
              </div>
              <div>
                <label className="label" style={{ marginTop: 0 }}>行動回数</label>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  value={rmCount}
                  onChange={e => setRmCount(e.target.value)}
                  onBlur={() => calcReminderAuto('count')}
                  style={{
                    minHeight: 40,
                    fontSize: 14,
                    background: rmAutoField === 'count' ? '#fff9c4' : undefined,
                  }}
                />
              </div>
              <div>
                <label className="label" style={{ marginTop: 0 }}>インターバル上限</label>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  placeholder="制限なし"
                  value={rmMaxInterval}
                  onChange={e => setRmMaxInterval(e.target.value)}
                  style={{ minHeight: 40, fontSize: 14 }}
                />
                {unitToggle(rmIntervalUnit, (u, v) => { setRmIntervalUnit(u); setRmMaxInterval(v); }, rmMaxInterval)}
              </div>
            </div>

            <button
              className="btn btn-success btn-full btn-lg"
              style={{ marginTop: 16 }}
              onClick={handleStart}
              disabled={!Number(rmTotalTime) || !Number(rmAvgDuration) || !Number(rmCount)}
            >
              スタート
            </button>
          </div>

          <button
            className="btn btn-full"
            style={{
              marginTop: 16,
              background: 'var(--bg)',
              border: '2px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
            onClick={() => navigate('/')}
          >
            戻る
          </button>
        </>
      )}
    </div>
  );
}
