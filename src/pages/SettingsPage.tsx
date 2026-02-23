import { useState, useCallback } from 'react';
import { getActiveDog, getDogs, saveDog, setActiveDogId, clearSessionData } from '../store/localStorage';
import { Navigate, useNavigate } from 'react-router-dom';
import type { Dog } from '../types';
import { DEFAULT_STIMULI, DEFAULT_BEHAVIORS, DEFAULT_LATENCIES, DEFAULT_DURATIONS, DEFAULT_DISTANCES } from '../types';
import { generateTestData } from '../store/testData';
import {
  getSyncConfig, clearSyncConfig, getLastSync, getSyncQueueCount,
  syncAll, getGasUrl, setGasUrl,
} from '../store/syncService';

function CheckboxStringList({
  title, active, defaults, onToggle, onAdd,
}: {
  title: string;
  active: string[];
  defaults: string[];
  onToggle: (item: string, checked: boolean) => void;
  onAdd: (item: string) => void;
}) {
  const [value, setValue] = useState('');
  // デフォルト + カスタム（activeに含まれるがdefaultsにない）
  const allItems = [...defaults, ...active.filter(i => !defaults.includes(i))];

  const handleAdd = () => {
    const trimmed = value.trim();
    if (!trimmed || allItems.includes(trimmed)) return;
    onAdd(trimmed);
    setValue('');
  };

  return (
    <div className="setting-group">
      <div className="setting-title">{title}</div>
      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {allItems.map(item => (
            <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, minWidth: '45%' }}>
              <input
                type="checkbox"
                checked={active.includes(item)}
                onChange={e => onToggle(item, e.target.checked)}
              />
              {item}
            </label>
          ))}
        </div>
        <div className="add-row" style={{ marginTop: 10 }}>
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
    </div>
  );
}

function CheckboxNumberList({
  title, active, defaults, unit, onToggle, onAdd,
}: {
  title: string;
  active: number[];
  defaults: number[];
  unit: string;
  onToggle: (item: number, checked: boolean) => void;
  onAdd: (item: number) => void;
}) {
  const [value, setValue] = useState('');
  const allItems = [...new Set([...defaults, ...active])].sort((a, b) => a - b);

  const formatLabel = (n: number) => n === -1 ? 'なし' : `${n}${unit}`;

  const handleAdd = () => {
    const num = Number(value);
    if (isNaN(num) || allItems.includes(num)) return;
    onAdd(num);
    setValue('');
  };

  return (
    <div className="setting-group">
      <div className="setting-title">{title}</div>
      <div className="card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {allItems.map(item => (
            <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 14, minWidth: '30%' }}>
              <input
                type="checkbox"
                checked={active.includes(item)}
                onChange={e => onToggle(item, e.target.checked)}
              />
              {formatLabel(item)}
            </label>
          ))}
        </div>
        <div className="add-row" style={{ marginTop: 10 }}>
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
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [dog, setDog] = useState<Dog | null>(getActiveDog);
  const [allDogs, setAllDogs] = useState<Dog[]>(getDogs);
  const [name, setName] = useState(dog?.name ?? '');
  const [goal, setGoal] = useState(dog?.goal ?? '');
  const [newDogName, setNewDogName] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [gasUrlInput, setGasUrlInput] = useState(getGasUrl());
  const [syncConnected, setSyncConnected] = useState(!!getSyncConfig());

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
      durationOptions: [...DEFAULT_DURATIONS],
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

  const toggleString = (field: 'stimulusOptions' | 'targetBehaviors') =>
    (item: string, checked: boolean) => {
      updateDog(d => ({
        ...d,
        [field]: checked ? [...d[field], item] : d[field].filter(i => i !== item),
      }));
    };

  const toggleNumber = (field: 'latencyOptions' | 'durationOptions' | 'distanceOptions') =>
    (item: number, checked: boolean) => {
      updateDog(d => ({
        ...d,
        [field]: checked
          ? [...d[field], item].sort((a, b) => a - b)
          : d[field].filter(i => i !== item),
      }));
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

      <CheckboxStringList
        title="SD（刺激）候補"
        active={dog.stimulusOptions}
        defaults={DEFAULT_STIMULI}
        onToggle={toggleString('stimulusOptions')}
        onAdd={item => updateDog(d => ({ ...d, stimulusOptions: [...d.stimulusOptions, item] }))}
      />

      <CheckboxStringList
        title="行動候補"
        active={dog.targetBehaviors}
        defaults={DEFAULT_BEHAVIORS}
        onToggle={toggleString('targetBehaviors')}
        onAdd={item => updateDog(d => ({ ...d, targetBehaviors: [...d.targetBehaviors, item] }))}
      />

      <CheckboxNumberList
        title="行動が出るまでの時間"
        active={dog.latencyOptions}
        defaults={DEFAULT_LATENCIES}
        unit="秒"
        onToggle={toggleNumber('latencyOptions')}
        onAdd={item => updateDog(d => ({ ...d, latencyOptions: [...d.latencyOptions, item].sort((a, b) => a - b) }))}
      />

      <CheckboxNumberList
        title="行動の持続時間"
        active={dog.durationOptions}
        defaults={DEFAULT_DURATIONS}
        unit="秒"
        onToggle={toggleNumber('durationOptions')}
        onAdd={item => updateDog(d => ({ ...d, durationOptions: [...d.durationOptions, item].sort((a, b) => a - b) }))}
      />

      <CheckboxNumberList
        title="距離候補"
        active={dog.distanceOptions}
        defaults={DEFAULT_DISTANCES}
        unit="m"
        onToggle={toggleNumber('distanceOptions')}
        onAdd={item => updateDog(d => ({ ...d, distanceOptions: [...d.distanceOptions, item].sort((a, b) => a - b) }))}
      />

      <div className="setting-group" style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div className="setting-title">データ同期</div>
        <div className="card">
          {syncConnected ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14 }}>ステータス</span>
                <span style={{ fontSize: 14, color: 'var(--success)', fontWeight: 600 }}>接続済み</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14 }}>最終同期</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {getLastSync() ? new Date(getLastSync()!).toLocaleString('ja-JP') : '未同期'}
                </span>
              </div>
              {getSyncQueueCount() > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>未送信キュー</span>
                  <span style={{ fontSize: 14, color: 'var(--warning)', fontWeight: 600 }}>{getSyncQueueCount()}件</span>
                </div>
              )}
              {syncMessage && (
                <div style={{ fontSize: 13, color: syncMessage.includes('成功') ? 'var(--success)' : 'var(--danger)', marginBottom: 8 }}>
                  {syncMessage}
                </div>
              )}
              <button
                className="btn btn-primary btn-full"
                style={{ marginTop: 4 }}
                onClick={async () => {
                  setSyncing(true);
                  setSyncMessage('');
                  try {
                    const ok = await syncAll();
                    setSyncMessage(ok ? '同期成功' : '同期失敗（キューに保存済み）');
                  } catch {
                    setSyncMessage('同期エラー');
                  } finally {
                    setSyncing(false);
                  }
                }}
                disabled={syncing}
              >
                {syncing ? '同期中...' : '手動同期'}
              </button>
              <button
                className="btn btn-full"
                style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}
                onClick={() => {
                  if (confirm('同期設定を解除しますか？')) {
                    clearSyncConfig();
                    setSyncMessage('');
                    setSyncConnected(false);
                  }
                }}
              >
                連携を解除
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
                指導者との連携が未設定です
              </p>
              {getGasUrl() ? (
                <button
                  className="btn btn-primary btn-full"
                  onClick={() => navigate('/login')}
                >
                  指導者と連携する
                </button>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  サーバーURLを下の「接続設定」で設定してください
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="setting-group">
        <div className="setting-title">接続設定</div>
        <div className="card">
          <label className="label" style={{ marginTop: 0 }}>GAS Web App URL</label>
          <input
            className="input"
            placeholder="https://script.google.com/macros/s/..."
            value={gasUrlInput}
            onChange={e => setGasUrlInput(e.target.value)}
            onBlur={() => setGasUrl(gasUrlInput.trim())}
            style={{ fontSize: 12 }}
          />
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            指導者から共有されたURLを入力してください
          </p>
        </div>
      </div>

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
