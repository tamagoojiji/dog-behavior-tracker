import { useState, useCallback } from 'react';
import { getActiveDog, getDogs, saveDog, setActiveDogId, clearSessionData } from '../store/localStorage';
import { Navigate } from 'react-router-dom';
import type { Dog } from '../types';
import { DEFAULT_STIMULI, DEFAULT_BEHAVIORS, DEFAULT_LATENCIES, DEFAULT_DISTANCES } from '../types';
import { generateTestData } from '../store/testData';

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
  const [allDogs, setAllDogs] = useState<Dog[]>(getDogs);
  const [name, setName] = useState(dog?.name ?? '');
  const [goal, setGoal] = useState(dog?.goal ?? '');
  const [newDogName, setNewDogName] = useState('');

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

  const handleAddDog = () => {
    const trimmed = newDogName.trim();
    if (!trimmed) return;
    const newDog: Dog = {
      id: crypto.randomUUID(),
      name: trimmed,
      targetBehaviors: [...DEFAULT_BEHAVIORS],
      stimulusOptions: [...DEFAULT_STIMULI],
      latencyOptions: [...DEFAULT_LATENCIES],
      distanceOptions: [...DEFAULT_DISTANCES],
      goal: '反応を減らす',
    };
    saveDog(newDog);
    setAllDogs(getDogs());
    setNewDogName('');
  };

  const handleSwitchDog = (id: string) => {
    setActiveDogId(id);
    const switched = getDogs().find(d => d.id === id) ?? null;
    setDog(switched);
    setAllDogs(getDogs());
    if (switched) {
      setName(switched.name);
      setGoal(switched.goal);
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">設定</h1>

      <div className="setting-group">
        <div className="setting-title">犬の管理</div>
        <div className="card">
          {allDogs.map(d => (
            <div
              key={d.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span style={{ fontWeight: d.id === dog?.id ? 700 : 400 }}>
                {d.id === dog?.id ? '✓ ' : ''}{d.name}
              </span>
              {d.id !== dog?.id && (
                <button
                  className="btn btn-primary"
                  style={{ minHeight: 36, padding: '6px 14px', fontSize: 13 }}
                  onClick={() => handleSwitchDog(d.id)}
                >
                  切替
                </button>
              )}
            </div>
          ))}
          <div className="add-row" style={{ marginTop: 10 }}>
            <input
              className="input"
              placeholder="新しい犬の名前"
              value={newDogName}
              onChange={e => setNewDogName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddDog()}
            />
            <button className="btn btn-primary" onClick={handleAddDog}>追加</button>
          </div>
        </div>
      </div>

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
        title="行動が出るまでの時間"
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

      <div className="setting-group" style={{ marginTop: 32, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div className="setting-title" style={{ color: 'var(--danger)' }}>開発用</div>
        <button
          className="btn btn-danger btn-full"
          onClick={() => { clearSessionData(); generateTestData(14); alert('古いデータをクリアし、GPS付き14散歩を生成しました。'); }}
        >
          データリセット＋テスト生成
        </button>
      </div>
    </div>
  );
}
