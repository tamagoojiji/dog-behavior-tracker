interface SummaryCardProps {
  count: number;
  successCount: number;
  avgLatency: number | null;
}

export default function SummaryCard({ count, successCount, avgLatency }: SummaryCardProps) {
  return (
    <div className="card">
      <div className="summary-grid">
        <div>
          <div className="summary-value">{count}</div>
          <div className="summary-label">記録数</div>
        </div>
        <div>
          <div className="summary-value" style={{ color: 'var(--success)' }}>{successCount}</div>
          <div className="summary-label">成功</div>
        </div>
        <div>
          <div className="summary-value">{avgLatency !== null ? `${avgLatency.toFixed(1)}s` : '-'}</div>
          <div className="summary-label">平均潜時</div>
        </div>
      </div>
    </div>
  );
}
