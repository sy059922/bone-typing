// 공유 링크용 공통: 기록 하나를 Supabase 에서 읽기 (공개 anon 키 · get_score RPC — 진짜 기록만)
export type SharedScore = {
  nickname: string;
  mode: 'ko-word' | 'ko-sentence' | 'en-word' | 'en-sentence';
  score: number;
  cpm: number;
  accuracy: number;
  rank: number;
};

export const MODE_KO: Record<string, string> = {
  'ko-word': '한글 낱말',
  'ko-sentence': '한글 문장',
  'en-word': '영어 낱말',
  'en-sentence': '영어 문장',
};

export async function getScore(id: string | null): Promise<SharedScore | null> {
  if (!id || !/^\d{1,12}$/.test(id)) return null;
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const r = await fetch(`${url}/rest/v1/rpc/get_score`, {
    method: 'POST',
    headers: {apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({p_id: Number(id)}),
  });
  if (!r.ok) return null;
  const rows = (await r.json()) as SharedScore[];
  const s = rows[0];
  return s ? {...s, accuracy: Number(s.accuracy), rank: Number(s.rank)} : null;
}
