import { useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { getActiveDog, getDogs, setActiveDogId, getSessionsByDog, getEventsByDog } from '../store/localStorage';
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
  const latencies = events.filter(e => e.latency !== null && e.latency >= 0).map(e => e.latency!);
  const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null;
  const distances = events.filter(e => e.distance !== null).map(e => e.distance!);
  const avgDistance = distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : null;
  return { count, avgLatency, avgDistance };
}

export default function HomePage() {
  const navigate = useNavigate();
  const [activeDog, setActiveDog] = useState(getActiveDog);
  const dog = activeDog;
  const allDogs = getDogs();

  const { sessions, events, weekStats } = useMemo(() => {
    if (!dog) return { sessions: [], events: [], weekStats: { count: 0, avgLatency: null, avgDistance: null } };
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

  const handleSwitchDog = (id: string) => {
    setActiveDogId(id);
    setActiveDog(getDogs().find(d => d.id === id) ?? null);
  };

  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <h1 className="page-title">🐕 {dog.name}</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>目標: {dog.goal}</p>
      </div>

      {allDogs.length > 1 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="section-label" style={{ marginTop: 0 }}>犬を選択</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {allDogs.map(d => (
              <button
                key={d.id}
                className={`btn-option ${d.id === dog.id ? 'selected' : ''}`}
                style={{ flex: '1 1 auto', minWidth: 80 }}
                onClick={() => handleSwitchDog(d.id)}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="section-label">今週のサマリー</div>
      <SummaryCard {...weekStats} />

      <button
        className="btn btn-primary btn-full btn-lg"
        style={{ marginBottom: 8 }}
        onClick={() => navigate('/walk')}
      >
        🚶 記録開始
      </button>

      <button
        className="btn btn-full btn-lg"
        style={{
          marginBottom: 16,
          background: 'var(--card-bg)',
          border: '2px solid var(--primary)',
          color: 'var(--primary)',
        }}
        onClick={() => navigate('/reminder')}
      >
        ⏱ リマインダー
      </button>

      <div className="section-label">最近の散歩</div>
      <SessionList sessions={sessions} events={events} onSelect={handleSelectSession} />
    </div>
  );
}
