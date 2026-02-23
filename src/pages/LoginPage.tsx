import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Dog } from '../types';
import { DEFAULT_STIMULI, DEFAULT_BEHAVIORS, DEFAULT_LATENCIES, DEFAULT_DURATIONS, DEFAULT_DISTANCES } from '../types';
import { getDogs, saveDog, setActiveDogId } from '../store/localStorage';

export default function LoginPage() {
  const navigate = useNavigate();
  const dogs = getDogs();
  const [showForm, setShowForm] = useState(dogs.length === 0);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');

  const handleSelectDog = (dog: Dog) => {
    setActiveDogId(dog.id);
    navigate('/');
  };

  const handleStart = () => {
    if (!name.trim()) return;
    const defaultBehaviors = [...DEFAULT_BEHAVIORS];
    const defaultStimuli = [...DEFAULT_STIMULI];
    const behaviorsByStimulus: Record<string, string[]> = {};
    for (const sd of defaultStimuli) {
      behaviorsByStimulus[sd] = [...defaultBehaviors];
    }
    const dog: Dog = {
      id: crypto.randomUUID(),
      name: name.trim(),
      targetBehaviors: defaultBehaviors,
      stimulusOptions: defaultStimuli,
      behaviorsByStimulus,
      latencyOptions: [...DEFAULT_LATENCIES],
      durationOptions: [...DEFAULT_DURATIONS],
      distanceOptions: [...DEFAULT_DISTANCES],
      goal: goal.trim() || '反応を減らす',
    };
    saveDog(dog);
    setActiveDogId(dog.id);
    navigate('/');
  };

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100dvh', paddingBottom: 16 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🐕</div>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>犬の行動記録</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>散歩中の行動を記録・分析</p>
      </div>

      {!showForm && dogs.length > 0 ? (
        <div>
          <div className="section-label">犬を選択</div>
          <div className="card">
            {dogs.map(dog => (
              <div
                key={dog.id}
                className="session-item"
                onClick={() => handleSelectDog(dog)}
              >
                <div>
                  <div className="session-date">{dog.name}</div>
                  <div className="session-meta">{dog.goal}</div>
                </div>
                <span style={{ fontSize: 20 }}>→</span>
              </div>
            ))}
          </div>
          <button
            className="btn btn-primary btn-full"
            style={{ marginTop: 8 }}
            onClick={() => setShowForm(true)}
          >
            新しい犬を追加
          </button>
        </div>
      ) : (
        <div className="card">
          {dogs.length > 0 && (
            <button
              className="btn"
              style={{ marginBottom: 12, fontSize: 14, color: 'var(--primary)', padding: '4px 0' }}
              onClick={() => setShowForm(false)}
            >
              ← 犬一覧に戻る
            </button>
          )}
          <label className="label" style={{ marginTop: 0 }}>犬の名前</label>
          <input
            className="input"
            placeholder="例: ポチ"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />

          <label className="label">目標</label>
          <input
            className="input"
            placeholder="例: 犬への反応を減らす"
            value={goal}
            onChange={e => setGoal(e.target.value)}
          />

          <button
            className="btn btn-primary btn-full btn-lg"
            style={{ marginTop: 20 }}
            onClick={handleStart}
            disabled={!name.trim()}
          >
            はじめる
          </button>
        </div>
      )}
    </div>
  );
}
