import { useState, useMemo } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { getSessions, saveSession, getEventsBySession } from '../store/localStorage';
import SummaryCard from '../components/SummaryCard';

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function formatDuration(start: number, end: number | null): string {
  if (!end) return '-';
  const sec = Math.floor((end - start) / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}分${s}秒`;
}

export default function WalkResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const session = useMemo(() => getSessions().find(s => s.id === sessionId), [sessionId]);
  const events = useMemo(() => sessionId ? getEventsBySession(sessionId) : [], [sessionId]);

  const [treatAmount, setTreatAmount] = useState(session?.treatAmount ?? 0);
  const [comment, setComment] = useState(session?.comment ?? '');

  const stats = useMemo(() => {
    const count = events.length;
    const successCount = events.filter(e => e.behavior === '成功').length;
    const latencies = events.filter(e => e.latency >= 0).map(e => e.latency);
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null;
    return { count, successCount, avgLatency };
  }, [events]);

  if (!session) {
    return <Navigate to="/" replace />;
  }

  const handleSave = () => {
    saveSession({ ...session, treatAmount, comment });
    navigate('/');
  };

  const treatOptions = Array.from({ length: 26 }, (_, i) => i * 10);

  return (
    <div className="page" style={{ paddingBottom: 16 }}>
      <h1 className="page-title">散歩結果</h1>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span>散歩時間</span>
          <strong>{formatDuration(session.startTime, session.endTime)}</strong>
        </div>
      </div>

      <SummaryCard {...stats} />

      <div className="section-label">記録一覧</div>
      <div className="card">
        <div className="event-row" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
          <span>時刻</span>
          <span>SD → 行動</span>
          <span>距離</span>
          <span>潜時</span>
        </div>
        {events.length === 0 ? (
          <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>記録なし</div>
        ) : (
          events.map(ev => (
            <div key={ev.id} className="event-row">
              <span>{formatTime(ev.timestamp)}</span>
              <span>{ev.stimulus} → {ev.behavior}</span>
              <span>{ev.distance}m</span>
              <span>{ev.latency === -1 ? 'なし' : `${ev.latency}s`}</span>
            </div>
          ))
        )}
      </div>

      <label className="label">おやつ量</label>
      <select className="input" value={treatAmount} onChange={e => setTreatAmount(Number(e.target.value))}>
        {treatOptions.map(g => (
          <option key={g} value={g}>{g}g</option>
        ))}
      </select>

      <label className="label">コメント</label>
      <textarea
        className="input"
        placeholder="気づいたことなど..."
        value={comment}
        onChange={e => setComment(e.target.value)}
      />

      <button
        className="btn btn-success btn-full btn-lg"
        style={{ marginTop: 16 }}
        onClick={handleSave}
      >
        保存する
      </button>
    </div>
  );
}
