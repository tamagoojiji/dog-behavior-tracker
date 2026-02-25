import { useState, useEffect } from 'react';
import type { AdminInstructor, AdminUser } from '../types';
import {
  fetchAdminInstructors, fetchAdminUsers, addInstructor,
  changeUserInstructor, getGasUrl, setGasUrl,
} from '../store/syncService';

const SESSION_KEY = 'dbt_admin_password';
const SAVED_PW_KEY = 'dbt_saved_password';
const REMEMBER_KEY = 'dbt_remember_pw';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [rememberPw, setRememberPw] = useState(() => localStorage.getItem(REMEMBER_KEY) === 'true');
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [instructors, setInstructors] = useState<AdminInstructor[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState('');
  const [gasUrlInput, setGasUrlInput] = useState(getGasUrl());
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [changingInstructor, setChangingInstructor] = useState(false);

  useEffect(() => {
    // localStorageの保存済みPWを優先
    const rememberedPw = localStorage.getItem(SAVED_PW_KEY);
    if (rememberedPw && getGasUrl()) {
      setPassword(rememberedPw);
      handleLogin(rememberedPw);
      return;
    }
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
      const [instList, userList] = await Promise.all([
        fetchAdminInstructors(pass),
        fetchAdminUsers(pass),
      ]);
      sessionStorage.setItem(SESSION_KEY, pass);
      if (rememberPw) {
        localStorage.setItem(SAVED_PW_KEY, pass);
        localStorage.setItem(REMEMBER_KEY, 'true');
      }
      setAuthenticated(true);
      setInstructors(instList);
      setUsers(userList);
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

  async function handleChangeInstructor(emailHash: string, newInstructorId: string) {
    setChangingInstructor(true);
    try {
      await changeUserInstructor(emailHash, newInstructorId, getStoredPassword());
      // リスト更新
      const [instList, userList] = await Promise.all([
        fetchAdminInstructors(getStoredPassword()),
        fetchAdminUsers(getStoredPassword()),
      ]);
      setInstructors(instList);
      setUsers(userList);
      setEditingUser(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : '変更に失敗しました');
    } finally {
      setChangingInstructor(false);
    }
  }

  // 未認証
  if (!authenticated) {
    return (
      <div className="page">
        <h1 className="page-title">管理</h1>

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
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 14, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={rememberPw}
              onChange={e => {
                setRememberPw(e.target.checked);
                if (!e.target.checked) {
                  localStorage.removeItem(SAVED_PW_KEY);
                  localStorage.removeItem(REMEMBER_KEY);
                }
              }}
              style={{ width: 18, height: 18 }}
            />
            パスワードを保存
          </label>
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

  // 認証済み
  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>管理</h1>
        <button
          onClick={() => {
            sessionStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(SAVED_PW_KEY);
            localStorage.removeItem(REMEMBER_KEY);
            setRememberPw(false);
            setAuthenticated(false);
            setPassword('');
            setInstructors([]);
            setUsers([]);
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

        {/* 指導者追加フォーム */}
        <div className="card">
          <div className="add-row">
            <input
              className="input"
              placeholder="指導者名を入力"
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

      {/* ユーザー管理 */}
      <div className="setting-group">
        <div className="setting-title">ユーザー一覧（{users.length}名）</div>
        {users.length === 0 ? (
          <div className="card">
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center' }}>
              ユーザーがまだ登録されていません
            </p>
          </div>
        ) : (
          users.map(user => (
            <div className="card" key={user.emailHash}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{user.dogName}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    指導者: {user.instructorName}
                  </div>
                  {user.lastSync && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      最終同期: {new Date(user.lastSync).toLocaleDateString('ja-JP')}
                    </div>
                  )}
                </div>
                <button
                  className="btn"
                  style={{ minHeight: 36, padding: '6px 12px', fontSize: 12, color: 'var(--primary)', border: '1px solid var(--border)' }}
                  onClick={() => setEditingUser(editingUser === user.emailHash ? null : user.emailHash)}
                >
                  変更
                </button>
              </div>

              {/* 指導者変更UI */}
              {editingUser === user.emailHash && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <label className="label" style={{ marginTop: 0 }}>新しい指導者を選択</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {instructors
                      .filter(inst => inst.id !== user.instructorId)
                      .map(inst => (
                        <button
                          key={inst.id}
                          className="btn"
                          style={{
                            minHeight: 40,
                            padding: '8px 14px',
                            fontSize: 14,
                            border: '1px solid var(--border)',
                            justifyContent: 'flex-start',
                          }}
                          onClick={() => handleChangeInstructor(user.emailHash, inst.id)}
                          disabled={changingInstructor}
                        >
                          {changingInstructor ? '...' : inst.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
