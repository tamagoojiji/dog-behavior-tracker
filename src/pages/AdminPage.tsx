import { useState, useEffect } from 'react';
import type { AdminInstructor } from '../types';
import { fetchAdminInstructors, addInstructor, getGasUrl, setGasUrl } from '../store/syncService';

const SESSION_KEY = 'dbt_admin_password';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [instructors, setInstructors] = useState<AdminInstructor[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState('');
  const [gasUrlInput, setGasUrlInput] = useState(getGasUrl());

  // sessionStorageからパスワードを復元
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved && getGasUrl()) {
      setPassword(saved);
      handleLogin(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStoredPassword = () => sessionStorage.getItem(SESSION_KEY) || password;

  function handleSaveGasUrl() {
    const trimmed = gasUrlInput.trim();
    setGasUrl(trimmed);
    setGasUrlInput(trimmed);
    if (trimmed) setAuthError('');
  }

  async function handleLogin(pw?: string) {
    const pass = pw || password;
    if (!pass.trim()) return;

    if (!getGasUrl()) {
      setAuthError('GAS URLを先に入力してください');
      return;
    }

    setLoading(true);
    setAuthError('');
    try {
      const list = await fetchAdminInstructors(pass);
      sessionStorage.setItem(SESSION_KEY, pass);
      setAuthenticated(true);
      setInstructors(list);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : '認証に失敗しました');
      sessionStorage.removeItem(SESSION_KEY);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;

    setAdding(true);
    setMessage('');
    try {
      const result = await addInstructor(trimmed, getStoredPassword());
      setMessage(`「${result.name}」を追加しました`);
      setNewName('');
      const list = await fetchAdminInstructors(getStoredPassword());
      setInstructors(list);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '追加に失敗しました');
    } finally {
      setAdding(false);
    }
  }

  // 未認証: パスワード入力画面
  if (!authenticated) {
    return (
      <div className="page">
        <h1 className="page-title">管理</h1>

        {/* GAS URL未設定時は入力欄を表示 */}
        {!getGasUrl() && (
          <div className="setting-group">
            <div className="setting-title">接続設定</div>
            <div className="card">
              <label className="label" style={{ marginTop: 0 }}>GAS Web App URL</label>
              <input
                className="input"
                placeholder="https://script.google.com/macros/s/..."
                value={gasUrlInput}
                onChange={e => setGasUrlInput(e.target.value)}
                style={{ fontSize: 12 }}
              />
              <button
                className="btn btn-primary btn-full"
                style={{ marginTop: 8 }}
                onClick={handleSaveGasUrl}
                disabled={!gasUrlInput.trim()}
              >
                保存
              </button>
            </div>
          </div>
        )}

        <div className="card">
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, textAlign: 'center' }}>
            管理者パスワードを入力してください
          </p>
          <input
            className="input"
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            autoFocus
          />
          {authError && (
            <p style={{ fontSize: 13, color: 'var(--danger)', marginTop: 8 }}>{authError}</p>
          )}
          <button
            className="btn btn-primary btn-full"
            style={{ marginTop: 12 }}
            onClick={() => handleLogin()}
            disabled={loading || !password.trim()}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </div>
      </div>
    );
  }

  // 認証済み: 管理画面
  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>管理</h1>
        <button
          onClick={() => {
            sessionStorage.removeItem(SESSION_KEY);
            setAuthenticated(false);
            setPassword('');
            setInstructors([]);
          }}
          style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          ログアウト
        </button>
      </div>

      {/* 指導者一覧 */}
      <div className="setting-group">
        <div className="setting-title">指導者一覧（{instructors.length}名）</div>
        {instructors.length === 0 ? (
          <div className="card">
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center' }}>
              指導者がまだ登録されていません
            </p>
          </div>
        ) : (
          instructors.map(inst => (
            <div className="card" key={inst.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{inst.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    ID: {inst.id}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{inst.userCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>ユーザー</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 指導者追加フォーム */}
      <div className="setting-group">
        <div className="setting-title">指導者を追加</div>
        <div className="card">
          <div className="add-row">
            <input
              className="input"
              placeholder="指導者名"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <button
              className="btn btn-primary"
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
            >
              {adding ? '...' : '追加'}
            </button>
          </div>
          {message && (
            <p style={{
              fontSize: 13,
              marginTop: 8,
              color: message.includes('追加しました') ? 'var(--success)' : 'var(--danger)',
            }}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
