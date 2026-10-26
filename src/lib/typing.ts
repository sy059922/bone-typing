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

// 쌍자음을 같은 자음 두 개로 (비교용). 'ㄱ 두 번 → ㄲ' 키보드는 늑+ㄱ 을 잠깐 '늒'(받침 ㄲ)으로 만들었다가
// 모음이 오면 '늑고' 로 가르므로, ㄲ 과 ㄱㄱ 를 같게 봐야 중간 글자를 오타로 잡지 않음 (2026-10-26 사용자 제보)
const DOUBLE: Record<string, string> = {ㄲ: 'ㄱ', ㄸ: 'ㄷ', ㅃ: 'ㅂ', ㅆ: 'ㅅ', ㅉ: 'ㅈ'};
// 펼친 자모 목록과 각 자모가 원래 몇 번째 단위였는지
const expand = (us: string[]) => {
  const out: string[] = [];
  const from: number[] = [];
  us.forEach((u, i) => {
    const d = DOUBLE[u];
    if (d) {
      out.push(d, d);
      from.push(i, i);
    } else {
      out.push(u);
      from.push(i);
    }
  });
  return {out, from};
};

// 입력 중인 값(조합 중 글자 포함)을 목표와 비교
export const check = (rawTarget: string, rawValue: string, lang: Lang): Check => {
  const target = norm(rawTarget, lang);
  const value = norm(rawValue, lang);
  const tu = units(target, lang);
  const vu = units(value, lang);
  const tx = expand(tu);
  const vx = expand(vu).out;
  let sameX = 0;
  while (sameX < vx.length && sameX < tx.out.length && vx[sameX] === tx.out[sameX]) sameX++;
  const ok = sameX === vx.length;
  // 원래 단위로 몇 개를 다 맞혔는지 (쌍자음의 반만 친 상태면 그 단위는 아직)
  const same = sameX === 0 ? 0 : sameX < tx.out.length && tx.from[sameX] === tx.from[sameX - 1] ? tx.from[sameX] : sameX < tx.out.length ? tx.from[sameX] : tu.length;
  const half = sameX > 0 && sameX < tx.out.length && tx.from[sameX] === tx.from[sameX - 1];
  const chars = [...target];
  const vchars = [...value];
  const charStates = chars.map((c, i): Check['charStates'][number] => {
    if (i >= vchars.length) return 'todo';
    if (vchars[i] === c) return i === vchars.length - 1 && lang === 'ko' && ok && vchars.length < chars.length ? 'cur' : 'done';
    // 조합 중인 마지막 글자: 자모가 목표의 앞부분이면 진행 중
    if (i === vchars.length - 1 && ok) return 'cur';
    // 한글 받침이 다음 글자로 넘어가기 전 (쇅 → 쇄골)
    if (i === vchars.length - 1 && lang === 'ko' && expand(units(chars.slice(i).join(''), lang)).out.join('').startsWith(expand(units(vchars[i], lang)).out.join(''))) return 'cur';
    return 'bad';
  });
  // 다음에 칠 키: 쌍자음을 반만 쳤으면 나머지 한 번 (같은 자음)
  const nextU = !ok ? null : half ? tx.out[sameX] : same < tu.length ? tu[same] : null;
  return {ok, doneUnits: ok ? same : same, totalUnits: tu.length, nextKey: nextU ? keyFor(nextU) : null, charStates};
};
