import {createClient, type SupabaseClient} from '@supabase/supabase-js';

// 경쟁 랭킹 — Supabase 가 설정돼 있으면 모두와 공유, 아니면 이 브라우저에만 저장 (개발·오프라인용)
import type {Mode} from './modes';
export type {Mode};
export type Score = {nickname: string; mode: Mode; score: number; cpm: number; accuracy: number; items: number; duration_ms: number; created_at?: string};

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
// 느린 망에서 무한정 기다리지 않게 8초 제한 (앱 오프라인 플레이)
const timedFetch: typeof fetch = (input, init) => fetch(input, {...init, signal: init?.signal ?? AbortSignal.timeout(8000)});
const sb: SupabaseClient | null = URL && KEY ? createClient(URL, KEY, {auth: {persistSession: false}, global: {fetch: timedFetch}}) : null;

// 오프라인이면 서버 대신 이 기기에 저장·표시
const online = () => typeof navigator === 'undefined' || navigator.onLine !== false;
export const isShared = () => sb !== null && online();

const LOCAL = 'bone-typing:scores';
const readLocal = (): Score[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL) ?? '[]');
  } catch {
    return [];
  }
};

// ── 닉네임 선점: 처음 올린 브라우저의 열쇠(= 복구 코드)만 그 닉네임으로 기록을 올릴 수 있음
const TOKENS = 'bone-typing:tokens';
const keyOf = (nick: string) => nick.trim().toLowerCase();
const readTokens = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(TOKENS) ?? '{}');
  } catch {
    return {};
  }
};
export const getToken = (nick: string): string | null => readTokens()[keyOf(nick)] ?? null;
export const setToken = (nick: string, token: string) => {
  try {
    localStorage.setItem(TOKENS, JSON.stringify({...readTokens(), [keyOf(nick)]: token}));
  } catch {
    /* 저장 불가 브라우저 */
  }
};
// 헷갈리는 글자(0·O·1·I) 뺀 32자 × 12자리 ≈ 60비트
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newToken = () => [...crypto.getRandomValues(new Uint8Array(12))].map((b) => ALPHA[b % 32]).join('');
export const formatCode = (t: string) => t.match(/.{1,4}/g)!.join('-');
export const parseCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

export type NickState = 'free' | 'mine' | 'taken' | 'local';
export async function checkNickname(nick: string, token: string | null): Promise<NickState> {
  if (!sb || !isShared()) return 'local';
  const {data, error} = await sb.rpc('check_nickname', {p_nickname: nick, p_token: token});
  if (error) throw error;
  return data as NickState;
}

// 점수 = 타수 × 정확도² — 빨라도 오타가 많으면 손해
export const scoreOf = (cpm: number, accuracy: number) => Math.round(cpm * Math.pow(accuracy / 100, 2));

// ── 서버 판정 (2026-10-25): 서버가 판과 문제를 정하고, 첫 타~제출을 서버 시계로 재서 점수를 계산
export type Round = {round: string; items: string[]};
export async function startRound(mode: Mode, term: string): Promise<Round | null> {
  if (!sb || !isShared()) return null;
  const {data, error} = await sb.rpc('start_round', {p_mode: mode, p_term: term});
  if (error) throw error;
  return data as Round;
}
export const beginRound = (round: string) => {
  if (sb) void sb.rpc('begin_round', {p_round: round}).then(() => undefined, () => undefined);
};
export type Saved = {id: number; cpm: number; accuracy: number; score: number; status: 'ok' | 'review'; duration_ms: number};

// 서버 판정으로 저장 → 서버가 계산한 값 / 이 기기 저장이면 null
export async function submitScore(s: Score, token: string | null, round: string | null, errors: number): Promise<Saved | null> {
  if (sb && round && isShared()) {
    const {data, error} = await sb.rpc('submit_score', {p_round: round, p_nickname: s.nickname, p_token: token, p_errors: errors});
    if (error) throw error;
    const d = data as Saved;
    return {...d, accuracy: Number(d.accuracy)};
  }
  try {
    const all = [...readLocal(), {...s, created_at: new Date().toISOString()}];
    localStorage.setItem(LOCAL, JSON.stringify(all.slice(-500)));
  } catch {
    /* 저장 불가 브라우저 — 무시 */
  }
  return null;
}

// 버튼 클릭 기록 (팔로우·공유) — 실패해도 조용히 무시
export type ClickKind = 'follow' | 'follow_title' | 'share_system' | 'share_copy' | 'share_image';
export const logClick = (kind: ClickKind) => {
  if (sb) void sb.rpc('log_click', {p_kind: kind}).then(() => undefined, () => undefined);
};

// 공유받은 기록 하나 (도전 문구용)
export async function getShared(id: number): Promise<(Score & {rank: number}) | null> {
  if (!sb || !isShared()) return null;
  const {data} = await sb.rpc('get_score', {p_id: id});
  const row = (data as (Score & {rank: number})[] | null)?.[0];
  return row ? {...row, accuracy: Number(row.accuracy), rank: Number(row.rank)} : null;
}

export async function topScores(mode: Mode, limit = 20): Promise<Score[]> {
  if (sb && isShared()) {
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
