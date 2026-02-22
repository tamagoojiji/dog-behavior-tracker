interface DistanceScrollerProps {
  options: number[];
  selected: number | null;
  onSelect: (value: number) => void;
}

export default function DistanceScroller({ options, selected, onSelect }: DistanceScrollerProps) {
  return (
    <div className="distance-scroller">
      {options.map(d => (
        <button
          key={d}
          className={`distance-item ${selected === d ? 'selected' : ''}`}
          onClick={() => onSelect(d)}
        >
          {d}m
        </button>
      ))}
    </div>
  );
}
