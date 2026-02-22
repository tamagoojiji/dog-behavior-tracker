import { useState, useCallback } from 'react';
import { getActiveDog, saveDog } from '../store/localStorage';
import { Navigate } from 'react-router-dom';
import type { Dog } from '../types';

function AddableList({ title, items, onAdd }: { title: string; items: string[]; onAdd: (item: string) => void }) {
  const [value, setValue] = useState('');

  const handleAdd = () => {
    const trimmed = value.trim();
    if (!trimmed || items.includes(trimmed)) return;
    onAdd(trimmed);
    setValue('');
  };

  return (
    <div className="setting-group">
      <div className="setting-title">{title}</div>
      <div className="tag-list">
        {items.map(item => (
          <span key={item} className="tag">{item}</span>
        ))}
      </div>
      <div className="add-row">
        <input
          className="input"
          placeholder="追加..."
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button className="btn btn-primary" onClick={handleAdd}>追加</button>
      </div>
    </div>
  );
}

function AddableNumberList({ title, items, unit, onAdd }: { title: string; items: number[]; unit: string; onAdd: (item: number) => void }) {
  const [value, setValue] = useState('');

  const handleAdd = () => {
    const num = Number(value);
    if (isNaN(num) || items.includes(num)) return;
    onAdd(num);
    setValue('');
  };

  return (
    <div className="setting-group">
      <div className="setting-title">{title}</div>
      <div className="tag-list">
        {items.map(item => (
          <span key={item} className="tag">{item === -1 ? 'なし' : `${item}${unit}`}</span>
        ))}
      </div>
      <div className="add-row">
        <input
          className="input"
          type="number"
          placeholder="追加..."
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button className="btn btn-primary" onClick={handleAdd}>追加</button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [dog, setDog] = useState<Dog | null>(getActiveDog);
  const [name, setName] = useState(dog?.name ?? '');
  const [goal, setGoal] = useState(dog?.goal ?? '');

  const updateDog = useCallback((updater: (d: Dog) => Dog) => {
    setDog(prev => {
      if (!prev) return prev;
      const updated = updater(prev);
      saveDog(updated);
      return updated;
    });
  }, []);

  if (!dog) {
    return <Navigate to="/login" replace />;
  }

  const handleSaveProfile = () => {
    updateDog(d => ({ ...d, name: name.trim() || d.name, goal: goal.trim() || d.goal }));
  };

  return (
    <div className="page">
      <h1 className="page-title">設定</h1>

      <div className="setting-group">
        <div className="setting-title">プロフィール</div>
        <div className="card">
          <label className="label" style={{ marginTop: 0 }}>犬の名前</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} onBlur={handleSaveProfile} />
          <label className="label">目標</label>
          <input className="input" value={goal} onChange={e => setGoal(e.target.value)} onBlur={handleSaveProfile} />
        </div>
      </div>

      <AddableList
        title="SD（刺激）候補"
        items={dog.stimulusOptions}
        onAdd={item => updateDog(d => ({ ...d, stimulusOptions: [...d.stimulusOptions, item] }))}
      />

      <AddableList
        title="行動候補"
        items={dog.targetBehaviors}
        onAdd={item => updateDog(d => ({ ...d, targetBehaviors: [...d.targetBehaviors, item] }))}
      />

      <AddableNumberList
        title="潜時候補"
        items={dog.latencyOptions}
        unit="秒"
        onAdd={item => updateDog(d => ({ ...d, latencyOptions: [...d.latencyOptions, item].sort((a, b) => a - b) }))}
      />

      <AddableNumberList
        title="距離候補"
        items={dog.distanceOptions}
        unit="m"
        onAdd={item => updateDog(d => ({ ...d, distanceOptions: [...d.distanceOptions, item].sort((a, b) => a - b) }))}
      />
    </div>
  );
}
