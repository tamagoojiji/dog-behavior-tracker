/**
 * サーバー同期サービス
 * GAS Web App とのデータ同期・キュー管理
 */

import type { Instructor, AdminInstructor, AdminUser, InstructorStudent, SyncConfig, SyncQueueItem, Dog, Session, BehaviorEvent } from '../types';
import { getDogs, getSessions, getEvents } from './localStorage';

const KEYS = {
  syncConfig: 'dbt_sync_config',
  syncQueue: 'dbt_sync_queue',
  lastSync: 'dbt_last_sync',
  gasUrl: 'dbt_gas_url',
};

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbyX0FsBeWn4rZjjJjRv3hD0Uzy_R8xPZRIm9T3sRMuHivhdPwXXXzdgouaV5zM1JKw/exec';

// --- 設定管理 ---

export function getGasUrl(): string {
  return localStorage.getItem(KEYS.gasUrl) || DEFAULT_GAS_URL;
}

export function setGasUrl(url: string): void {
  localStorage.setItem(KEYS.gasUrl, url);
}

export function getSyncConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(KEYS.syncConfig);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSyncConfig(config: SyncConfig): void {
  localStorage.setItem(KEYS.syncConfig, JSON.stringify(config));
}

export function clearSyncConfig(): void {
  localStorage.removeItem(KEYS.syncConfig);
  localStorage.removeItem(KEYS.lastSync);
  localStorage.removeItem(KEYS.syncQueue);
}

export function getLastSync(): string | null {
  return localStorage.getItem(KEYS.lastSync);
}

// --- キュー管理 ---

function getSyncQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(KEYS.syncQueue);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setSyncQueue(queue: SyncQueueItem[]): void {
  localStorage.setItem(KEYS.syncQueue, JSON.stringify(queue));
}

export function getSyncQueueCount(): number {
  return getSyncQueue().length;
}

// --- API呼び出し ---

/**
 * GAS Web App にGETリクエスト
 */
async function fetchGasGet(params: string): Promise<unknown> {
  const gasUrl = getGasUrl();
  if (!gasUrl) throw new Error('GAS URLが設定されていません');

  const response = await fetch(gasUrl + params, { redirect: 'follow' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/**
 * GAS Web App にPOSTリクエスト
 * GASの302リダイレクト問題を回避するため、Google Apps Script exec URLに直接POST
 */
async function fetchGasPost(body: unknown): Promise<unknown> {
  const gasUrl = getGasUrl();
  if (!gasUrl) throw new Error('GAS URLが設定されていません');

  const response = await fetch(gasUrl, {
    method: 'POST',
    body: JSON.stringify(body),
    redirect: 'follow',
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/**
 * 指導者リストを取得
 */
export async function fetchInstructors(): Promise<Instructor[]> {
  const result = await fetchGasGet('?action=getInstructors') as {
    success: boolean;
    data: Instructor[];
    error?: { message: string };
  };
  if (!result.success) throw new Error(result.error?.message || '取得失敗');
  return result.data;
}

/**
 * 指導者リストを取得（Admin用・ユーザー数付き）
 */
export async function fetchAdminInstructors(password: string): Promise<AdminInstructor[]> {
  const result = await fetchGasGet('?action=getAdminInstructors&password=' + encodeURIComponent(password)) as {
    success: boolean;
    data: AdminInstructor[];
    error?: { message: string };
  };
  if (!result.success) throw new Error(result.error?.message || '取得失敗');
  return result.data;
}

/**
 * ユーザー一覧を取得（Admin用）
 */
export async function fetchAdminUsers(password: string): Promise<AdminUser[]> {
  const result = await fetchGasGet('?action=getAdminUsers&password=' + encodeURIComponent(password)) as {
    success: boolean;
    data: AdminUser[];
    error?: { message: string };
  };
  if (!result.success) throw new Error(result.error?.message || '取得失敗');
  return result.data;
}

/**
 * ユーザーの指導者を変更（Admin用）
 */
export async function changeUserInstructor(
  emailHash: string,
  newInstructorId: string,
  password: string,
): Promise<{ instructorId: string; instructorName: string }> {
  const result = await fetchGasPost({
    action: 'changeUserInstructor',
    emailHash,
    newInstructorId,
    adminPassword: password,
  }) as {
    success: boolean;
    data: { instructorId: string; instructorName: string };
    error?: { message: string };
  };
  if (!result.success) throw new Error(result.error?.message || '変更失敗');
  return result.data;
}

/**
 * 指導者を追加（Admin用）
 */
export async function addInstructor(name: string, password: string): Promise<{ id: string; name: string }> {
  const result = await fetchGasPost({
    action: 'addInstructor',
    name,
    adminPassword: password,
  }) as {
    success: boolean;
    data: { id: string; name: string };
    error?: { message: string };
  };
  if (!result.success) throw new Error(result.error?.message || '追加失敗');
  return result.data;
}

/**
 * サーバーサイドでメールをハッシュ化
 * ソルトをクライアントに渡さないセキュアな方式
 */
export async function hashEmailOnServer(email: string): Promise<string> {
  const result = await fetchGasPost({
    action: 'hashEmail',
    email: email,
  }) as {
    success: boolean;
    data: { emailHash: string };
    error?: { message: string };
  };
  if (!result.success) throw new Error(result.error?.message || 'ハッシュ化失敗');
  return result.data.emailHash;
}

/**
 * ユーザー存在確認
 */
export async function checkUserExists(emailHash: string): Promise<{
  exists: boolean;
  instructorId?: string;
  dogName?: string;
}> {
  const result = await fetchGasGet('?action=checkUser&emailHash=' + encodeURIComponent(emailHash)) as {
    success: boolean;
    data: { exists: boolean; instructorId?: string; dogName?: string };
    error?: { message: string };
  };
  if (!result.success) throw new Error(result.error?.message || '確認失敗');
  return result.data;
}

/**
 * ユーザー新規登録
 */
export async function registerUser(emailHash: string, instructorId: string, dogName: string): Promise<void> {
  const result = await fetchGasPost({
    action: 'registerUser',
    emailHash,
    instructorId,
    dogName,
  }) as { success: boolean; error?: { message: string } };

  if (!result.success) throw new Error(result.error?.message || '登録失敗');
}

// --- 講師ダッシュボード用 ---

/**
 * 講師の生徒一覧を取得
 */
export async function fetchInstructorStudents(instructorId: string, password: string): Promise<InstructorStudent[]> {
  const result = await fetchGasGet(
    '?action=getInstructorStudents&instructorId=' + encodeURIComponent(instructorId) +
    '&password=' + encodeURIComponent(password)
  ) as {
    success: boolean;
    data: InstructorStudent[];
    error?: { message: string };
  };
  if (!result.success) throw new Error(result.error?.message || '取得失敗');
  return result.data;
}

/**
 * 生徒のデータを取得（講師ダッシュボード用・認証付き）
 */
export async function fetchStudentData(emailHash: string, password: string): Promise<{
  dogs: Dog[];
  sessions: Session[];
  events: BehaviorEvent[];
}> {
  const result = await fetchGasPost({
    action: 'getStudentData',
    emailHash,
    adminPassword: password,
  }) as {
    success: boolean;
    data: { dogs: Dog[]; sessions: Session[]; events: BehaviorEvent[] };
    error?: { message: string };
  };
  if (!result.success) throw new Error(result.error?.message || '取得失敗');
  return result.data;
}

/**
 * 生徒のデータをスプレッドシートにエクスポート
 */
export async function exportStudentSheet(emailHash: string, password: string): Promise<{ url: string; title: string }> {
  const result = await fetchGasPost({
    action: 'exportStudentSheet',
    emailHash,
    adminPassword: password,
  }) as {
    success: boolean;
    data: { url: string; title: string };
    error?: { message: string };
  };
  if (!result.success) throw new Error(result.error?.message || 'エクスポート失敗');
  return result.data;
}

/**
 * 全生徒データをまとめて1つのスプレッドシートにエクスポート
 */
export async function exportAllStudentsSheet(instructorId: string, password: string): Promise<{ url: string; title: string }> {
  const result = await fetchGasPost({
    action: 'exportAllStudentsSheet',
    instructorId,
    adminPassword: password,
  }) as {
    success: boolean;
    data: { url: string; title: string };
    error?: { message: string };
  };
  if (!result.success) throw new Error(result.error?.message || 'エクスポート失敗');
  return result.data;
}

/**
 * 講師コメントを保存
 */
export async function saveInstructorComment(
  instructorId: string, emailHash: string, comment: string, password: string
): Promise<void> {
  const result = await fetchGasPost({
    action: 'saveInstructorComment',
    instructorId,
    emailHash,
    comment,
    adminPassword: password,
  }) as { success: boolean; error?: { message: string } };
  if (!result.success) throw new Error(result.error?.message || '保存失敗');
}

/**
 * 講師コメントを取得
 */
export async function fetchInstructorComment(
  instructorId: string, emailHash: string, password: string
): Promise<string> {
  const result = await fetchGasPost({
    action: 'getInstructorComment',
    instructorId,
    emailHash,
    adminPassword: password,
  }) as { success: boolean; data: { comment: string }; error?: { message: string } };
  if (!result.success) throw new Error(result.error?.message || '取得失敗');
  return result.data.comment;
}

// --- 同期処理 ---

/**
 * サーバーにデータを同期
 * 散歩完了時にバックグラウンドで呼ばれる
 */
export async function syncToServer(
  specificDogs?: Dog[],
  specificSessions?: Session[],
  specificEvents?: BehaviorEvent[]
): Promise<boolean> {
  const config = getSyncConfig();
  if (!config) return false;

  const gasUrl = getGasUrl();
  if (!gasUrl) return false;

  const dogs = specificDogs || getDogs();
  const sessions = specificSessions || getSessions();
  const events = specificEvents || getEvents();

  const payload = { dogs, sessions, events };

  try {
    const result = await fetchGasPost({
      action: 'syncData',
      emailHash: config.emailHash,
      instructorId: config.instructorId,
      payload,
    }) as { success: boolean; data?: { timestamp: string }; error?: { message: string } };

    if (result.success) {
      localStorage.setItem(KEYS.lastSync, result.data?.timestamp || new Date().toISOString());
      return true;
    }

    // 失敗した場合はキューに追加
    addToSyncQueue(payload);
    return false;
  } catch {
    // ネットワークエラー → キューに追加
    addToSyncQueue(payload);
    return false;
  }
}

/**
 * 同期キューに追加
 */
function addToSyncQueue(payload: SyncQueueItem['payload']): void {
  const queue = getSyncQueue();
  queue.push({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    payload,
  });
  // キューは最新10件まで保持
  if (queue.length > 10) {
    queue.splice(0, queue.length - 10);
  }
  setSyncQueue(queue);
}

/**
 * キュー内のデータを再送
 * アプリ起動時に呼ばれる
 */
export async function retrySyncQueue(): Promise<void> {
  const config = getSyncConfig();
  if (!config) return;

  const gasUrl = getGasUrl();
  if (!gasUrl) return;

  const queue = getSyncQueue();
  if (queue.length === 0) return;

  const remaining: SyncQueueItem[] = [];

  for (const item of queue) {
    try {
      const result = await fetchGasPost({
        action: 'syncData',
        emailHash: config.emailHash,
        instructorId: config.instructorId,
        payload: item.payload,
      }) as { success: boolean };

      if (!result.success) {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
      break; // ネットワークエラーなら残りもスキップ
    }
  }

  setSyncQueue(remaining);
  if (remaining.length === 0 && queue.length > 0) {
    localStorage.setItem(KEYS.lastSync, new Date().toISOString());
  }
}

/**
 * 全データ手動同期
 */
export async function syncAll(): Promise<boolean> {
  return syncToServer();
}
