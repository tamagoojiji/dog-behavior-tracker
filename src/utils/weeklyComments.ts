import type { BehaviorEvent, Session } from '../types';

export function getAthleteComparison(avgLatency: number): string | null {
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

export function generateWeeklyComments(events: BehaviorEvent[], sessions: Session[]): string[] {
  const weekStart = (() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0).getTime();
  })();
  const weekEvents = events.filter(e => e.timestamp >= weekStart);
  const weekSessions = sessions.filter(s => s.startTime >= weekStart);

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

  return comments;
}
