import type {Bone} from '../data/bones';
import type {Category} from './modes';
import type {Lang} from './typing';
import {getUi} from './i18n';

// 학습 모드: 낱말만 · 고른 영역의 문제를 모두 맞혀야 끝남 (틀린 문제는 다시) · 결과는 걸린 시간
export type Part = 'head' | 'spine' | 'thorax' | 'trunk' | 'upper' | 'lower';

export const PARTS: Record<Category, Part[]> = {
  bone: ['head', 'spine', 'thorax', 'upper', 'lower'],
  muscle: ['head', 'trunk', 'upper', 'lower'],
};

const LABEL: Record<Part, [string, string]> = {
  head: ['두경부', 'Head & neck'],
  spine: ['척추', 'Spine'],
  thorax: ['흉곽', 'Thorax'],
  trunk: ['몸통', 'Trunk'],
  upper: ['상지', 'Upper limb'],
  lower: ['하지', 'Lower limb'],
};
export const partLabel = (p: Part, cat: Category) => {
  const en = getUi() === 'en';
  // 뼈의 하지에는 골반이 함께 들어감
  if (p === 'lower' && cat === 'bone') return en ? 'Pelvis & lower limb' : '골반·하지';
  return LABEL[p][en ? 1 : 0];
};

// 뼈는 3D 파일로, 근육은 부위(region)로 — 묶음 이름은 3D 파일로
export const partOf = (b: Bone, cat: Category): Part => {
  const f = b.model.file;
  if (cat === 'bone') {
    if (f === 'skull') return 'head';
    if (f === 'spine') return 'spine';
    if (f === 'thorax') return 'thorax';
    if (f === 'arm' || f === 'hand') return 'upper';
    return 'lower';
  }
  const r = b.region;
  if (r === 'head' || r === 'neck') return 'head';
  if (r === 'trunk') return 'trunk';
  if (['shoulder', 'arm', 'forearm', 'hand'].includes(r)) return 'upper';
  if (['hip', 'thigh', 'leg', 'foot'].includes(r)) return 'lower';
  return f === 'muscle_head' ? 'head' : f === 'muscle_trunk' ? 'trunk' : f === 'muscle_upper' ? 'upper' : 'lower';
};

// 걸린 시간 표시: 1:23.4 (1시간 넘으면 1:02:03.4)
export const formatTime = (ms: number) => {
  const d = Math.floor(ms / 100) % 10;
  const s = Math.floor(ms / 1000);
  const ss = String(s % 60).padStart(2, '0');
  const m = Math.floor(s / 60);
  if (m >= 60) return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}:${ss}.${d}`;
  return `${m}:${ss}.${d}`;
};

// 이 기기 최고 기록 (같은 분류 · 언어 · 용어 · 영역 조합끼리)
const BEST = 'bone-typing:study-best';
export const studyKey = (cat: Category, lang: Lang, term: string, parts: Part[], blind = false) =>
  `${cat}|${lang}|${lang === 'ko' ? term : '-'}|${[...parts].sort().join(',')}${blind ? '|blind' : ''}`;
const readBest = (): Record<string, number> => {
  try {
    return JSON.parse(localStorage.getItem(BEST) || '{}');
  } catch {
    return {};
  }
};
export const getBest = (key: string): number | null => readBest()[key] ?? null;
// 새 기록이면 저장하고 true
export const saveBest = (key: string, ms: number) => {
  const all = readBest();
  if (all[key] != null && all[key] <= ms) return false;
  all[key] = ms;
  try {
    localStorage.setItem(BEST, JSON.stringify(all));
  } catch {
    /* 무시 */
  }
  return true;
};
