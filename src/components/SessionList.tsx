import type { Session, BehaviorEvent } from '../types';

interface SessionListProps {
  sessions: Session[];
  events: BehaviorEvent[];
  onSelect: (session: Session) => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDuration(start: number, end: number | null): string {
  if (!end) return '-';
  const sec = Math.floor((end - start) / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}分${s}秒`;
}

export default function SessionList({ sessions, events, onSelect }: SessionListProps) {
  const sorted = [...sessions].sort((a, b) => b.startTime - a.startTime);

  if (sorted.length === 0) {
    return <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>まだ散歩の記録がありません</div>;
  }

  return (
    <div className="card">
      {sorted.map(session => {
        const sessionEvents = events.filter(e => e.sessionId === session.id);
        const successCount = sessionEvents.filter(e => e.behavior === '成功').length;
        return (
          <div key={session.id} className="session-item" onClick={() => onSelect(session)}>
            <div>
              <div className="session-date">{formatDate(session.startTime)}</div>
              <div className="session-meta">{formatDuration(session.startTime, session.endTime)}</div>
            </div>
            <div className="session-stats">
              <div>{sessionEvents.length}件 / {successCount}成功</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
