import type {Lang} from './typing';
import {getUi} from './i18n';

// 모드 = 블라인드 여부 × 분류(뼈·근육·신경) × 언어 × 낱말/문장
// 뼈 모드는 예전 이름 그대로 (랭킹 기록 유지), 근육은 'm-', 신경은 'n-', 블라인드는 맨 앞에 'b-'
export type Category = 'bone' | 'muscle' | 'nerve';
export type Kind = 'word' | 'sentence';
export type Mode = `${'' | 'b-'}${'' | 'm-' | 'n-'}${Lang}-${Kind}`;

const PREFIX: Record<Category, string> = {bone: '', muscle: 'm-', nerve: 'n-'};
export const modeOf = (cat: Category, lang: Lang, kind: Kind, blind = false) => `${blind ? 'b-' : ''}${PREFIX[cat]}${lang}-${kind}` as Mode;
export const parseMode = (m: Mode): {cat: Category; lang: Lang; kind: Kind; blind: boolean} => {
  const blind = m.startsWith('b-');
  const base = m.replace(/^b-/, '');
  const cat: Category = base.startsWith('m-') ? 'muscle' : base.startsWith('n-') ? 'nerve' : 'bone';
  const [lang, kind] = base.replace(/^[mn]-/, '').split('-') as [Lang, Kind];
  return {cat, lang, kind, blind};
};

const CAT_KO: Record<Category, string> = {bone: '뼈', muscle: '근육', nerve: '신경'};
const CAT_EN: Record<Category, string> = {bone: 'Bone', muscle: 'Muscle', nerve: 'Nerve'};

// 화면 표시용 (랭킹 머리 · 결과 팝업)
export const modeLabel = (m: Mode) => {
  const {cat, lang, kind, blind} = parseMode(m);
  if (getUi() === 'ko') return `${CAT_KO[cat]} · ${lang === 'ko' ? '한글' : 'English'} · ${kind === 'word' ? '낱말' : '문장'}${blind ? ' · 블라인드' : ''}`;
  return `${CAT_EN[cat]} · ${lang === 'ko' ? 'Korean' : 'English'} · ${kind === 'word' ? 'Word' : 'Sentence'}${blind ? ' · Blind' : ''}`;
};

// 공유 글·카드용 짧은 이름
export const modeShort = (m: Mode) => {
  const {cat, lang, kind, blind} = parseMode(m);
  if (getUi() === 'en') return `${blind ? 'blind ' : ''}${CAT_EN[cat].toLowerCase()} ${lang === 'ko' ? 'Korean' : 'English'} ${kind === 'word' ? 'words' : 'sentences'}`;
  return `${blind ? '블라인드 ' : ''}${CAT_KO[cat]} ${lang === 'ko' ? '한글' : '영어'} ${kind === 'word' ? '낱말' : '문장'}`;
};
