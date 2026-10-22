import type {Lang} from './typing';

// 모드 = 분류(뼈·근육) × 언어 × 낱말/문장. 뼈 모드는 예전 이름 그대로 (랭킹 기록 유지)
export type Category = 'bone' | 'muscle';
export type Kind = 'word' | 'sentence';
export type Mode = `${'' | 'm-'}${Lang}-${Kind}`;

export const modeOf = (cat: Category, lang: Lang, kind: Kind) => `${cat === 'muscle' ? 'm-' : ''}${lang}-${kind}` as Mode;
export const parseMode = (m: Mode): {cat: Category; lang: Lang; kind: Kind} => {
  const muscle = m.startsWith('m-');
  const [lang, kind] = m.replace(/^m-/, '').split('-') as [Lang, Kind];
  return {cat: muscle ? 'muscle' : 'bone', lang, kind};
};

// 화면 표시용 (랭킹 머리 · 결과 팝업)
export const modeLabel = (m: Mode) => {
  const {cat, lang, kind} = parseMode(m);
  if (lang === 'ko') return `${cat === 'muscle' ? '근육' : '뼈'} · 한글 · ${kind === 'word' ? '낱말' : '문장'}`;
  return `${cat === 'muscle' ? 'Muscle' : 'Bone'} · English · ${kind === 'word' ? 'Word' : 'Sentence'}`;
};

// 공유 글·카드용 짧은 이름
export const modeShort = (m: Mode) => {
  const {cat, lang, kind} = parseMode(m);
  return `${cat === 'muscle' ? '근육' : '뼈'} ${lang === 'ko' ? '한글' : '영어'} ${kind === 'word' ? '낱말' : '문장'}`;
};
