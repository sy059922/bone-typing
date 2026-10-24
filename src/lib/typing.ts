import {disassemble} from 'es-hangul';

export type Lang = 'ko' | 'en';

// 두벌식: 자모 → 물리 키 (KeyboardEvent.code) + Shift
const KO_KEYS: Record<string, [string, boolean]> = {
  ㅂ: ['KeyQ', false], ㅈ: ['KeyW', false], ㄷ: ['KeyE', false], ㄱ: ['KeyR', false], ㅅ: ['KeyT', false],
  ㅛ: ['KeyY', false], ㅕ: ['KeyU', false], ㅑ: ['KeyI', false], ㅐ: ['KeyO', false], ㅔ: ['KeyP', false],
  ㅃ: ['KeyQ', true], ㅉ: ['KeyW', true], ㄸ: ['KeyE', true], ㄲ: ['KeyR', true], ㅆ: ['KeyT', true],
  ㅒ: ['KeyO', true], ㅖ: ['KeyP', true],
  ㅁ: ['KeyA', false], ㄴ: ['KeyS', false], ㅇ: ['KeyD', false], ㄹ: ['KeyF', false], ㅎ: ['KeyG', false],
  ㅗ: ['KeyH', false], ㅓ: ['KeyJ', false], ㅏ: ['KeyK', false], ㅣ: ['KeyL', false],
  ㅋ: ['KeyZ', false], ㅌ: ['KeyX', false], ㅊ: ['KeyC', false], ㅍ: ['KeyV', false], ㅠ: ['KeyB', false],
  ㅜ: ['KeyN', false], ㅡ: ['KeyM', false],
};

const EN_PUNCT: Record<string, [string, boolean]> = {
  ' ': ['Space', false], ',': ['Comma', false], '.': ['Period', false], "'": ['Quote', false], '’': ['Quote', false],
  '-': ['Minus', false], '/': ['Slash', false], '?': ['Slash', true], '!': ['Digit1', true],
};

// 한 글자(또는 한글 자모) → 눌러야 할 키
export const keyFor = (ch: string): [string, boolean] | null => {
  if (KO_KEYS[ch]) return KO_KEYS[ch];
  if (EN_PUNCT[ch]) return EN_PUNCT[ch];
  if (/[a-z]/.test(ch)) return [`Key${ch.toUpperCase()}`, false];
  if (/[A-Z]/.test(ch)) return [`Key${ch}`, true];
  if (/[0-9]/.test(ch)) return [`Digit${ch}`, false];
  return null;
};

// 입력 단위: 한글은 자모(두벌식 키 하나 = 하나), 영어는 글자
export const units = (s: string, lang: Lang) => (lang === 'ko' ? [...disassemble(s)] : [...s]);

export type Check = {
  ok: boolean; // 지금까지 친 것이 목표의 앞부분과 맞음
  doneUnits: number; // 맞게 친 단위 수 (진행률·타수)
  totalUnits: number;
  nextKey: [string, boolean] | null; // 다음에 눌러야 할 키 (가이드 표시)
  charStates: ('done' | 'cur' | 'bad' | 'todo')[]; // 목표 글자별 상태 (흐린 글씨 위 덮기)
};

// 영어는 대소문자를 구분하지 않음 (’ 같은 꼬부랑 따옴표도 ' 로)
export const norm = (s: string, lang: Lang) => (lang === 'en' ? s.toLowerCase().replace(/[’‘]/g, "'") : s);

// 입력 중인 값(조합 중 글자 포함)을 목표와 비교
export const check = (rawTarget: string, rawValue: string, lang: Lang): Check => {
  const target = norm(rawTarget, lang);
  const value = norm(rawValue, lang);
  const tu = units(target, lang);
  const vu = units(value, lang);
  let same = 0;
  while (same < vu.length && same < tu.length && vu[same] === tu[same]) same++;
  const ok = same === vu.length;
  const chars = [...target];
  const vchars = [...value];
  const charStates = chars.map((c, i): Check['charStates'][number] => {
    if (i >= vchars.length) return 'todo';
    if (vchars[i] === c) return i === vchars.length - 1 && lang === 'ko' && ok && vchars.length < chars.length ? 'cur' : 'done';
    // 조합 중인 마지막 글자: 자모가 목표의 앞부분이면 진행 중
    if (i === vchars.length - 1 && ok) return 'cur';
    // 한글 받침이 다음 글자로 넘어가기 전 (쇅 → 쇄골)
    if (i === vchars.length - 1 && lang === 'ko' && units(chars.slice(i).join(''), lang).join('').startsWith(units(vchars[i], lang).join(''))) return 'cur';
    return 'bad';
  });
  const nextU = ok && same < tu.length ? tu[same] : null;
  return {ok, doneUnits: ok ? same : same, totalUnits: tu.length, nextKey: nextU ? keyFor(nextU) : null, charStates};
};
