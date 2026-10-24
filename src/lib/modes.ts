import type {Lang} from './typing';
import {getUi} from './i18n';

// 모드 = 블라인드 여부 × 분류(뼈·근육) × 언어 × 낱말/문장. 뼈 모드는 예전 이름 그대로 (랭킹 기록 유지), 블라인드는 앞에 'b-'
export type Category = 'bone' | 'muscle';
export type Kind = 'word' | 'sentence';
export type Mode = `${'' | 'b-'}${'' | 'm-'}${Lang}-${Kind}`;

export const modeOf = (cat: Category, lang: Lang, kind: Kind, blind = false) => `${blind ? 'b-' : ''}${cat === 'muscle' ? 'm-' : ''}${lang}-${kind}` as Mode;
export const parseMode = (m: Mode): {cat: Category; lang: Lang; kind: Kind; blind: boolean} => {
  const blind = m.startsWith('b-');
  const base = m.replace(/^b-/, '');
  const muscle = base.startsWith('m-');
  const [lang, kind] = base.replace(/^m-/, '').split('-') as [Lang, Kind];
  return {cat: muscle ? 'muscle' : 'bone', lang, kind, blind};
};

// 화면 표시용 (랭킹 머리 · 결과 팝업)
export const modeLabel = (m: Mode) => {
  const {cat, lang, kind, blind} = parseMode(m);
  if (getUi() === 'ko') return `${cat === 'muscle' ? '근육' : '뼈'} · ${lang === 'ko' ? '한글' : 'English'} · ${kind === 'word' ? '낱말' : '문장'}${blind ? ' · 블라인드' : ''}`;
  return `${cat === 'muscle' ? 'Muscle' : 'Bone'} · ${lang === 'ko' ? 'Korean' : 'English'} · ${kind === 'word' ? 'Word' : 'Sentence'}${blind ? ' · Blind' : ''}`;
};

// 공유 글·카드용 짧은 이름
export const modeShort = (m: Mode) => {
  const {cat, lang, kind, blind} = parseMode(m);
  if (getUi() === 'en') return `${blind ? 'blind ' : ''}${cat === 'muscle' ? 'muscle' : 'bone'} ${lang === 'ko' ? 'Korean' : 'English'} ${kind === 'word' ? 'words' : 'sentences'}`;
  return `${blind ? '블라인드 ' : ''}${cat === 'muscle' ? '근육' : '뼈'} ${lang === 'ko' ? '한글' : '영어'} ${kind === 'word' ? '낱말' : '문장'}`;
};
