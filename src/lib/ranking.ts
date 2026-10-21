import {createClient, type SupabaseClient} from '@supabase/supabase-js';

// 경쟁 랭킹 — Supabase 가 설정돼 있으면 모두와 공유, 아니면 이 브라우저에만 저장 (개발·오프라인용)
export type Mode = 'ko-word' | 'ko-sentence' | 'en-word' | 'en-sentence';
export type Score = {nickname: string; mode: Mode; score: number; cpm: number; accuracy: number; items: number; duration_ms: number; created_at?: string};

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const sb: SupabaseClient | null = URL && KEY ? createClient(URL, KEY, {auth: {persistSession: false}}) : null;

export const isShared = () => sb !== null;

const LOCAL = 'bone-typing:scores';
const readLocal = (): Score[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL) ?? '[]');
  } catch {
    return [];
  }
};

// 점수 = 타수 × 정확도² — 빨라도 오타가 많으면 손해
export const scoreOf = (cpm: number, accuracy: number) => Math.round(cpm * Math.pow(accuracy / 100, 2));

export async function submitScore(s: Score): Promise<void> {
  if (sb) {
    const {error} = await sb.rpc('submit_score', {
      p_nickname: s.nickname,
      p_mode: s.mode,
      p_cpm: s.cpm,
      p_accuracy: s.accuracy,
      p_items: s.items,
      p_duration_ms: s.duration_ms,
    });
    if (error) throw error;
    return;
  }
  try {
    const all = [...readLocal(), {...s, created_at: new Date().toISOString()}];
    localStorage.setItem(LOCAL, JSON.stringify(all.slice(-500)));
  } catch {
    /* 저장 불가 브라우저 — 무시 */
  }
}

export async function topScores(mode: Mode, limit = 20): Promise<Score[]> {
  if (sb) {
    const {data, error} = await sb.from('leaderboard').select('*').eq('mode', mode).order('score', {ascending: false}).limit(limit);
    if (error) throw error;
    return (data ?? []) as Score[];
  }
  // 닉네임마다 최고 기록 하나
  const best = new Map<string, Score>();
  for (const s of readLocal().filter((x) => x.mode === mode)) {
    const b = best.get(s.nickname);
    if (!b || s.score > b.score) best.set(s.nickname, s);
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}
