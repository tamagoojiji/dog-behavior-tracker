interface SummaryCardProps {
  count: number;
  avgLatency: number | null;
  avgDistance: number | null;
}

export default function SummaryCard({ count, avgLatency, avgDistance }: SummaryCardProps) {
  return (
    <div className="card">
      <div className="summary-grid">
        <div>
          <div className="summary-value">{count}</div>
          <div className="summary-label">記録数</div>
        </div>
        <div>
          <div className="summary-value">{avgLatency !== null ? `${avgLatency.toFixed(1)}s` : '-'}</div>
          <div className="summary-label">平均潜時</div>
        </div>
        <div>
          <div className="summary-value">{avgDistance !== null ? `${avgDistance.toFixed(0)}m` : '-'}</div>
          <div className="summary-label">平均距離</div>
        </div>
      </div>
    </div>
  );
}
