import { useMemo, useCallback, useState } from 'react';
import { getActiveDog, getEventsByDog, getSessionsByDog } from '../store/localStorage';
import { getGasUrl } from '../store/syncService';
import { Navigate } from 'react-router-dom';
import SummaryCard from '../components/SummaryCard';
import {
  ComposedChart, Line, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

function formatDateShort(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDateFull(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function getAthleteComparison(avgLatency: number): string | null {
  if (avgLatency <= 0.5) {
    return '⚡ 陸上短距離選手のスタート反応（約0.1〜0.2秒）に迫る速さです！';
  } else if (avgLatency <= 1.0) {
    return '🏓 卓球選手のリターン反応（約0.5〜1秒）と同レベルです！';
  } else if (avgLatency <= 2.0) {
    return '⚾ 野球バッターの投球判断（約1〜2秒）と同じくらいの反応速度です。';
  } else if (avgLatency <= 3.0) {
    return '🥊 ボクサーの防御反応（約2〜3秒の判断時間）に近い水準です。';
  } else if (avgLatency <= 5.0) {
    return '⚽ サッカーGKのPK反応（約3〜5秒の読み時間）と同等の判断速度です。';
  } else {
    return '🏋️ まだ反応に時間がかかっていますが、トレーニングで必ず改善します！';
  }
}

interface DailyPoint {
  date: string;
  avgLatency: number | null;
  avgDistance: number | null;
  count: number;
}

export default function StatsPage() {
  const dog = getActiveDog();

  const stats = useMemo(() => {
    if (!dog) return null;
    const events = getEventsByDog(dog.id);
    const sessions = getSessionsByDog(dog.id);
    const count = events.length;
    const latencies = events.filter(e => e.latency !== null && e.latency >= 0).map(e => e.latency!);
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null;
    const distances = events.filter(e => e.distance !== null).map(e => e.distance!);
    const avgDistance = distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : null;

    // SD別集計
    const byStimulus: Record<string, { total: number; success: number }> = {};
    for (const e of events) {
      if (!byStimulus[e.stimulus]) byStimulus[e.stimulus] = { total: 0, success: 0 };
      byStimulus[e.stimulus].total++;
      if (e.behavior === 'アイコンタクト') byStimulus[e.stimulus].success++;
    }

    // 行動別・日別推移データ
    const behaviorsSet = new Set(events.map(e => e.behavior).filter((b): b is string => b !== null));
    const byBehavior: Record<string, { daily: DailyPoint[]; total: number }> = {};

    for (const behavior of behaviorsSet) {
      const bEvents = events.filter(e => e.behavior === behavior);
      const dailyMap: Record<string, { latencies: number[]; distances: number[] }> = {};

      for (const ev of bEvents) {
        const dateKey = formatDateShort(ev.timestamp);
        if (!dailyMap[dateKey]) dailyMap[dateKey] = { latencies: [], distances: [] };
        if (ev.latency !== null && ev.latency >= 0) dailyMap[dateKey].latencies.push(ev.latency);
        if (ev.distance !== null) dailyMap[dateKey].distances.push(ev.distance);
      }

      // 日付順にソート
      const sortedDates = Object.keys(dailyMap).sort((a, b) => {
        const [am, ad] = a.split('/').map(Number);
        const [bm, bd] = b.split('/').map(Number);
        return am !== bm ? am - bm : ad - bd;
      });

      const daily: DailyPoint[] = sortedDates.map(date => {
        const d = dailyMap[date];
        return {
          date,
          avgLatency: d.latencies.length > 0 ? +(d.latencies.reduce((a, b) => a + b, 0) / d.latencies.length).toFixed(1) : null,
          avgDistance: d.distances.length > 0 ? +(d.distances.reduce((a, b) => a + b, 0) / d.distances.length).toFixed(0) : null,
          count: d.latencies.length + d.distances.length,
        };
      });

      byBehavior[behavior] = { daily, total: bEvents.length };
    }

    // 合計回数順にソート
    const sortedBehaviors = Object.entries(byBehavior).sort((a, b) => b[1].total - a[1].total);

    // 今週のデータ
    const weekStart = (() => {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0).getTime();
    })();
    const weekEvents = events.filter(e => e.timestamp >= weekStart);
    const weekSessions = sessions.filter(s => s.startTime >= weekStart);

    // 自動コメント生成
    const comments: string[] = [];

    if (weekEvents.length > 0) {
      comments.push(`今週は合計${weekEvents.length}件の記録がありました（${weekSessions.length}回の散歩）。`);

      // 最多行動
      const weekBehaviorCount: Record<string, number> = {};
      for (const e of weekEvents) {
        if (e.behavior) {
          weekBehaviorCount[e.behavior] = (weekBehaviorCount[e.behavior] || 0) + 1;
        }
      }
      const topBehavior = Object.entries(weekBehaviorCount).sort((a, b) => b[1] - a[1])[0];
      if (topBehavior) {
        comments.push(`最も多い行動は「${topBehavior[0]}」（${topBehavior[1]}件）でした。`);
      }

      // 平均潜時 + 選手比較
      const weekLatencies = weekEvents.filter(e => e.latency !== null && e.latency >= 0).map(e => e.latency!);
      if (weekLatencies.length > 0) {
        const weekAvgLat = +(weekLatencies.reduce((a, b) => a + b, 0) / weekLatencies.length).toFixed(1);
        comments.push(`平均反応潜時は${weekAvgLat}秒です。`);
        // 選手比較コメント
        const comparison = getAthleteComparison(weekAvgLat);
        if (comparison) comments.push(comparison);
      }

      // 平均距離
      const weekDistances = weekEvents.filter(e => e.distance !== null).map(e => e.distance!);
      if (weekDistances.length > 0) {
        const weekAvgDist = Math.round(weekDistances.reduce((a, b) => a + b, 0) / weekDistances.length);
        comments.push(`主な発生距離は${weekAvgDist}m付近でした。`);
      }

      // SD別アイコンタクト率の最高・最低
      const weekByStimulus: Record<string, { total: number; success: number }> = {};
      for (const e of weekEvents) {
        if (!e.stimulus) continue;
        if (!weekByStimulus[e.stimulus]) weekByStimulus[e.stimulus] = { total: 0, success: 0 };
        weekByStimulus[e.stimulus].total++;
        if (e.behavior === 'アイコンタクト') weekByStimulus[e.stimulus].success++;
      }
      const sdRates = Object.entries(weekByStimulus)
        .filter(([, d]) => d.total >= 2)
        .map(([sd, d]) => ({ sd, rate: Math.round((d.success / d.total) * 100), total: d.total }));
      if (sdRates.length > 0) {
        const best = sdRates.sort((a, b) => b.rate - a.rate)[0];
        const worst = sdRates.sort((a, b) => a.rate - b.rate)[0];
        if (best.rate > 0) {
          comments.push(`アイコンタクト率が最も高いのは「${best.sd}」で${best.rate}%でした。`);
        }
        if (worst.sd !== best.sd && worst.rate < best.rate) {
          comments.push(`「${worst.sd}」は${worst.rate}%と課題が残ります。`);
        }
      }
    } else {
      comments.push('今週はまだ記録がありません。散歩に出かけましょう！');
    }

    return { count, avgLatency, avgDistance, sessionCount: sessions.length, byStimulus, sortedBehaviors, comments };
  }, [dog?.id]);

  const [exporting, setExporting] = useState(false);

  const handleDataDownload = useCallback(async () => {
    if (!dog) return;
    const events = getEventsByDog(dog.id);
    const gasUrl = getGasUrl();

    // GAS接続あり → スプレッドシートへエクスポート
    if (gasUrl) {
      setExporting(true);
      try {
        const response = await fetch(gasUrl, {
          method: 'POST',
          body: JSON.stringify({
            action: 'exportToSheet',
            dogName: dog.name,
            events: events,
          }),
          redirect: 'follow',
        });
        const result = await response.json() as { success: boolean; data?: { url: string }; error?: { message: string } };
        if (result.success && result.data?.url) {
          window.open(result.data.url, '_blank');
        } else {
          alert('エクスポートに失敗しました: ' + (result.error?.message || '不明なエラー'));
        }
      } catch {
        alert('通信エラーが発生しました。CSV形式でダウンロードします。');
        downloadCsv(dog.name, events);
      } finally {
        setExporting(false);
      }
    } else {
      // GAS未接続 → CSV
      downloadCsv(dog.name, events);
    }
  }, [dog]);

  function downloadCsv(dogName: string, events: import('../types').BehaviorEvent[]) {
    const bom = '\uFEFF';
    const header = '日時,刺激,行動,潜時(秒),距離(m),コメント';
    const rows = events.map(e => {
      const date = formatDateFull(e.timestamp);
      const stimulus = e.stimulus;
      const behavior = e.behavior ?? '';
      const latency = e.latency !== null ? (e.latency === -1 ? 'なし' : String(e.latency)) : '';
      const distance = e.distance !== null ? String(e.distance) : '';
      const comment = (e.comment ?? '').replace(/"/g, '""');
      return `${date},${stimulus},${behavior},${latency},${distance},"${comment}"`;
    });
    const csv = bom + header + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dogName}_行動記録.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

      <button
        className="btn btn-primary btn-full"
        style={{ marginBottom: 12 }}
        onClick={handleDataDownload}
        disabled={exporting}
      >
        {exporting ? 'エクスポート中...' : 'データダウンロード'}
      </button>

      <div className="section-label">今週のコメント</div>
      <div className="card" style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>
        {stats.comments.map((c, i) => (
          <p key={i} style={{ margin: i === 0 ? 0 : '4px 0 0' }}>{c}</p>
        ))}
      </div>

      <div className="section-label">全体サマリー（{stats.sessionCount}回の散歩）</div>
      <SummaryCard count={stats.count} avgLatency={stats.avgLatency} avgDistance={stats.avgDistance} />

      {stats.sortedBehaviors.map(([behavior, data]) => (
        <div key={behavior}>
          <div className="section-label">{behavior}（{data.total}回）</div>
          <div className="card" style={{ padding: '12px 8px' }}>
            {data.daily.length >= 2 ? (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={data.daily} margin={{ top: 12, right: 4, left: -8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e8e8" />
                  <XAxis dataKey="date" fontSize={12} tick={{ fill: '#555' }} tickMargin={6} />
                  <YAxis yAxisId="latency" fontSize={12} unit="s" tick={{ fill: '#ff9800' }} tickMargin={4} width={42} />
                  <YAxis yAxisId="distance" orientation="right" fontSize={12} unit="m" tick={{ fill: '#4a90d9' }} tickMargin={4} width={42} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 13, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                    formatter={(value, name) => name === '潜時' ? [`${value}s`, name] : [`${value}m`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar yAxisId="distance" dataKey="avgDistance" name="距離" fill="#4a90d9" fillOpacity={0.5} radius={[4, 4, 0, 0]} />
                  <Line yAxisId="latency" type="monotone" dataKey="avgLatency" name="潜時" stroke="#ff9800" strokeWidth={2.5} dot={{ r: 4, fill: '#ff9800' }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', padding: 12 }}>
                潜時: {data.daily[0]?.avgLatency ?? '-'}s / 距離: {data.daily[0]?.avgDistance ?? '-'}m
              </div>
            )}
          </div>
        </div>
      ))}

      <div className="section-label">行動の出現率</div>
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
