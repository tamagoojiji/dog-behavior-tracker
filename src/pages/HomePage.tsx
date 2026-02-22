import { useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { getActiveDog, getSessionsByDog, getEventsByDog } from '../store/localStorage';
import SummaryCard from '../components/SummaryCard';
import SessionList from '../components/SessionList';
import type { BehaviorEvent, Session } from '../types';

function getWeekStart(): number {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
  return start.getTime();
}

function calcStats(events: BehaviorEvent[]) {
  const count = events.length;
  const successCount = events.filter(e => e.behavior === '成功').length;
  const latencies = events.filter(e => e.latency >= 0).map(e => e.latency);
  const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null;
  return { count, successCount, avgLatency };
}

export default function HomePage() {
  const navigate = useNavigate();
  const dog = getActiveDog();

  const { sessions, events, weekStats } = useMemo(() => {
    if (!dog) return { sessions: [], events: [], weekStats: { count: 0, successCount: 0, avgLatency: null } };
    const sessions = getSessionsByDog(dog.id);
    const events = getEventsByDog(dog.id);
    const weekStart = getWeekStart();
    const weekEvents = events.filter(e => e.timestamp >= weekStart);
    return { sessions, events, weekStats: calcStats(weekEvents) };
  }, [dog?.id]);

  if (!dog) {
    return <Navigate to="/login" replace />;
  }

  const handleSelectSession = (session: Session) => {
    navigate(`/walk-result/${session.id}`);
  };

  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <h1 className="page-title">🐕 {dog.name}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>目標: {dog.goal}</p>
      </div>

      <div className="section-label">今週のサマリー</div>
      <SummaryCard {...weekStats} />

      <button
        className="btn btn-primary btn-full btn-lg"
        style={{ marginBottom: 16 }}
        onClick={() => navigate('/walk')}
      >
        🚶 散歩開始
      </button>

      <div className="section-label">最近の散歩</div>
      <SessionList sessions={sessions} events={events} onSelect={handleSelectSession} />
    </div>
  );
}
