import { useMemo } from 'react';
import { getActiveDog, getEventsByDog, getSessionsByDog } from '../store/localStorage';
import { Navigate } from 'react-router-dom';
import SummaryCard from '../components/SummaryCard';

export default function StatsPage() {
  const dog = getActiveDog();

  const stats = useMemo(() => {
    if (!dog) return null;
    const events = getEventsByDog(dog.id);
    const sessions = getSessionsByDog(dog.id);
    const count = events.length;
    const successCount = events.filter(e => e.behavior === '成功').length;
    const latencies = events.filter(e => e.latency >= 0).map(e => e.latency);
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null;

    // SD別集計
    const byStimulus: Record<string, { total: number; success: number }> = {};
    for (const e of events) {
      if (!byStimulus[e.stimulus]) byStimulus[e.stimulus] = { total: 0, success: 0 };
      byStimulus[e.stimulus].total++;
      if (e.behavior === '成功') byStimulus[e.stimulus].success++;
    }

    return { count, successCount, avgLatency, sessionCount: sessions.length, byStimulus };
  }, [dog?.id]);

  if (!dog) {
    return <Navigate to="/login" replace />;
  }

  if (!stats || stats.count === 0) {
    return (
      <div className="page">
        <h1 className="page-title">統計</h1>
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          まだデータがありません。散歩を記録しましょう！
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">統計</h1>

      <div className="section-label">全体サマリー（{stats.sessionCount}回の散歩）</div>
      <SummaryCard count={stats.count} successCount={stats.successCount} avgLatency={stats.avgLatency} />

      <div className="section-label">SD別成功率</div>
      <div className="card">
        {Object.entries(stats.byStimulus).map(([sd, data]) => {
          const rate = data.total > 0 ? Math.round((data.success / data.total) * 100) : 0;
          return (
            <div key={sd} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 600 }}>{sd}</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--success)', fontWeight: 600 }}>{rate}%</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12, marginLeft: 8 }}>({data.success}/{data.total})</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
