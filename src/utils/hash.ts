/**
 * SHA-256ハッシュユーティリティ
 * Web Crypto API を使用してメールアドレスをハッシュ化
 */

/**
 * 文字列をSHA-256ハッシュに変換
 */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * メールアドレスをソルト付きSHA-256ハッシュに変換
 * GAS側と同じロジック: salt + ':' + email.toLowerCase().trim()
 */
export async function hashEmail(email: string, salt: string): Promise<string> {
  const input = salt + ':' + email.toLowerCase().trim();
  return sha256(input);
}
