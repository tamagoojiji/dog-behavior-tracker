import { useState, useEffect, useCallback } from 'react';
import type { InstructorStudent, AdminInstructor, BehaviorEvent, Session } from '../types';
import {
  fetchAdminInstructors,
  fetchInstructorStudents,
  fetchStudentData,
  exportStudentSheet,
  exportAllStudentsSheet,
} from '../store/syncService';
import { generateWeeklyComments } from '../utils/weeklyComments';
import SummaryCard from '../components/SummaryCard';

type View = 'login' | 'students' | 'detail';

const SESSION_KEY_PW = 'dbt_inst_pw';
const SESSION_KEY_ID = 'dbt_inst_id';
const SESSION_KEY_NAME = 'dbt_inst_name';

export default function InstructorPage() {
  const [view, setView] = useState<View>('login');
  const [password, setPassword] = useState('');
  const [instructors, setInstructors] = useState<AdminInstructor[]>([]);
  const [instructorId, setInstructorId] = useState('');
  const [instructorName, setInstructorName] = useState('');
  const [students, setStudents] = useState<InstructorStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<InstructorStudent | null>(null);
  const [studentEvents, setStudentEvents] = useState<BehaviorEvent[]>([]);
  const [studentSessions, setStudentSessions] = useState<Session[]>([]);
  const [comments, setComments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [loginStep, setLoginStep] = useState<'password' | 'instructor'>('password');

  const loadStudents = useCallback(async (instId: string, pw: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchInstructorStudents(instId, pw);
      setStudents(data);
      setView('students');
    } catch (e) {
      setError(e instanceof Error ? e.message : '取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  // sessionStorageから自動ログイン
  useEffect(() => {
    const savedPw = sessionStorage.getItem(SESSION_KEY_PW);
    const savedId = sessionStorage.getItem(SESSION_KEY_ID);
    const savedName = sessionStorage.getItem(SESSION_KEY_NAME);
    if (savedPw && savedId && savedName) {
      setPassword(savedPw);
      setInstructorId(savedId);
      setInstructorName(savedName);
      loadStudents(savedId, savedPw);
    }
  }, [loadStudents]);

  const handlePasswordSubmit = async () => {
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const list = await fetchAdminInstructors(password);
      setInstructors(list);
      setLoginStep('instructor');
    } catch {
      setError('パスワードが正しくありません');
    } finally {
      setLoading(false);
    }
  };

  const handleInstructorSelect = async (inst: AdminInstructor) => {
    setInstructorId(inst.id);
    setInstructorName(inst.name);
    sessionStorage.setItem(SESSION_KEY_PW, password);
    sessionStorage.setItem(SESSION_KEY_ID, inst.id);
    sessionStorage.setItem(SESSION_KEY_NAME, inst.name);
    await loadStudents(inst.id, password);
  };

  const handleStudentSelect = async (student: InstructorStudent) => {
    setSelectedStudent(student);
    setLoading(true);
    setError('');
    try {
      const data = await fetchStudentData(student.emailHash, password);
      setStudentEvents(data.events);
      setStudentSessions(data.sessions);
      setComments(generateWeeklyComments(data.events, data.sessions));
      setView('detail');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'データ取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedStudent) return;
    setExporting(true);
    try {
      const result = await exportStudentSheet(selectedStudent.emailHash, password);
      window.open(result.url, '_blank');
    } catch (e) {
      alert('エクスポート失敗: ' + (e instanceof Error ? e.message : '不明なエラー'));
    } finally {
      setExporting(false);
    }
  };

  const handleExportAll = async () => {
    setExportingAll(true);
    try {
      const result = await exportAllStudentsSheet(instructorId, password);
      window.open(result.url, '_blank');
    } catch (e) {
      alert('エクスポート失敗: ' + (e instanceof Error ? e.message : '不明なエラー'));
    } finally {
      setExportingAll(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY_PW);
    sessionStorage.removeItem(SESSION_KEY_ID);
    sessionStorage.removeItem(SESSION_KEY_NAME);
    setView('login');
    setLoginStep('password');
    setPassword('');
    setInstructorId('');
    setInstructorName('');
    setStudents([]);
  };

  // 統計計算
  const studentStats = (() => {
    if (studentEvents.length === 0) return null;
    const count = studentEvents.length;
    const latencies = studentEvents.filter(e => e.latency !== null && e.latency >= 0).map(e => e.latency!);
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null;
    const distances = studentEvents.filter(e => e.distance !== null).map(e => e.distance!);
    const avgDistance = distances.length > 0 ? distances.reduce((a, b) => a + b, 0) / distances.length : null;
    return { count, avgLatency, avgDistance };
  })();

  // ログイン画面
  if (view === 'login') {
    return (
      <div className="page" style={{ maxWidth: 400, margin: '0 auto', paddingTop: 40 }}>
        <h1 className="page-title" style={{ textAlign: 'center', fontSize: 22 }}>講師ダッシュボード</h1>

        {loginStep === 'password' ? (
          <>
            <div className="card" style={{ padding: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>パスワード</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="パスワードを入力"
                style={{
                  width: '100%', padding: 14, fontSize: 18, borderRadius: 8,
                  border: '2px solid var(--border)', boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              className="btn btn-primary btn-full"
              style={{ marginTop: 12, padding: 16, fontSize: 18 }}
              onClick={handlePasswordSubmit}
              disabled={loading || !password.trim()}
            >
              {loading ? '確認中...' : '次へ'}
            </button>
          </>
        ) : (
          <>
            <div className="section-label" style={{ fontSize: 16 }}>あなたのお名前を選んでください</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {instructors.map(inst => (
                <button
                  key={inst.id}
                  className="btn btn-primary btn-full"
                  style={{ padding: 18, fontSize: 20 }}
                  onClick={() => handleInstructorSelect(inst)}
                  disabled={loading}
                >
                  {inst.name}
                </button>
              ))}
            </div>
            <button
              className="btn btn-full"
              style={{ marginTop: 16, padding: 14, fontSize: 16, background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              onClick={() => setLoginStep('password')}
            >
              戻る
            </button>
          </>
        )}

        {error && (
          <div style={{ color: 'var(--error)', textAlign: 'center', marginTop: 12, fontSize: 14 }}>{error}</div>
        )}
      </div>
    );
  }

  // 生徒一覧画面
  if (view === 'students') {
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h1 className="page-title" style={{ margin: 0 }}>{instructorName}先生の生徒</h1>
          <button
            onClick={handleLogout}
            style={{ padding: '6px 12px', fontSize: 13, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            ログアウト
          </button>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>読み込み中...</div>}
        {error && <div style={{ color: 'var(--error)', textAlign: 'center', marginBottom: 12 }}>{error}</div>}

        {!loading && students.length === 0 && (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>
            まだ生徒がいません
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {students.map(s => (
            <button
              key={s.emailHash}
              className="card"
              onClick={() => handleStudentSelect(s)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                border: '2px solid var(--border)', padding: 16, background: 'var(--bg)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{s.dogName}</div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span>散歩 {s.sessionCount}回</span>
                <span>記録 {s.eventCount}件</span>
                {s.lastSync && (
                  <span>最終同期: {new Date(s.lastSync).toLocaleDateString('ja-JP')}</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {students.length > 0 && (
          <button
            className="btn btn-primary btn-full"
            style={{ marginTop: 16, padding: 14, fontSize: 16 }}
            onClick={handleExportAll}
            disabled={exportingAll}
          >
            {exportingAll ? 'エクスポート中...' : '全生徒をスプシに出力'}
          </button>
        )}

        <button
          className="btn btn-full"
          style={{ marginTop: 8, padding: 14, fontSize: 16, background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
          onClick={() => loadStudents(instructorId, password)}
          disabled={loading}
        >
          {loading ? '更新中...' : '一覧を更新'}
        </button>
      </div>
    );
  }

  // 生徒詳細画面
  return (
    <div className="page">
      <button
        onClick={() => setView('students')}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '8px 0',
          background: 'none', border: 'none', color: 'var(--primary)', fontSize: 15, cursor: 'pointer', marginBottom: 8,
        }}
      >
        ← 生徒一覧に戻る
      </button>

      <h1 className="page-title">{selectedStudent?.dogName}</h1>

      {loading && <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>読み込み中...</div>}
      {error && <div style={{ color: 'var(--error)', textAlign: 'center', marginBottom: 12 }}>{error}</div>}

      {!loading && (
        <>
          <button
            className="btn btn-primary btn-full"
            style={{ marginBottom: 12, padding: 16, fontSize: 18 }}
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'エクスポート中...' : 'スプレッドシートに出力'}
          </button>

          <div className="section-label">今週のコメント</div>
          <div className="card" style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>
            {comments.length > 0 ? (
              comments.map((c, i) => (
                <p key={i} style={{ margin: i === 0 ? 0 : '4px 0 0' }}>{c}</p>
              ))
            ) : (
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>データがありません</p>
            )}
          </div>

          {studentStats && (
            <>
              <div className="section-label">全体サマリー（{studentSessions.length}回の散歩）</div>
              <SummaryCard
                count={studentStats.count}
                avgLatency={studentStats.avgLatency}
                avgDistance={studentStats.avgDistance}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
