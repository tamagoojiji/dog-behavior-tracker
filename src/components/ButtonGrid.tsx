interface ButtonGridProps {
  options: string[];
  selected: string | null;
  onSelect: (value: string) => void;
  columns?: 3 | 4;
  successLabel?: string;
}

export default function ButtonGrid({ options, selected, onSelect, columns = 3, successLabel = '成功' }: ButtonGridProps) {
  return (
    <div className={`btn-grid btn-grid-${columns}`}>
      {options.map(option => (
        <button
          key={option}
          className={`btn-option ${selected === option ? 'selected' : ''} ${option === successLabel ? 'success-option' : ''}`}
          onClick={() => onSelect(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
