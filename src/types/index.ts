export interface Dog {
  id: string;
  name: string;
  targetBehaviors: string[];
  stimulusOptions: string[];
  behaviorsByStimulus: Record<string, string[]>; // SDごとの行動テンプレート
  latencyOptions: number[];    // -1 = 反応なし
  durationOptions: number[];   // 行動の持続時間（秒）
  distanceOptions: number[];
  goal: string;
}

export interface Session {
  id: string;
  dogId: string;
  startTime: number;           // timestamp
  endTime: number | null;
  routePoints: GeoPoint[];
  treatAmount: number;         // おやつ量（g）
  comment: string;
}

export interface BehaviorEvent {
  id: string;
  sessionId: string;
  dogId: string;
  timestamp: number;
  elapsedSeconds: number;
  stimulus: string;            // SD
  behavior: string | null;
  latency: number | null;      // 秒（-1 = 反応なし）
  duration: number | null;     // 行動の持続時間（秒）
  distance: number | null;     // m
  comment: string;
  location: GeoPoint | null;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

export const DEFAULT_STIMULI = ['犬', '人', '自転車', '車', '音', 'その他'];
export const DEFAULT_BEHAVIORS = ['吠え', '突進', '固まる', '回避', '引張り', 'アイコンタクト'];
export const DEFAULT_LATENCIES = [0, 1, 2, 3, 4, 5, -1]; // -1 = なし
export const DEFAULT_DURATIONS = [1, 2, 3, 5, 10, 15, 30, 60];
export const DEFAULT_DISTANCES = [1, 2, 3, 5, 7, 10, 15, 20, 30, 50];
