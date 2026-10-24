import {getUi} from '../lib/i18n';
import type {Lang} from '../lib/typing';

type K = {code: string; en: string; ko?: string; koS?: string; w?: number};

const ROWS: K[][] = [
  [
    {code: 'Backquote', en: '`'}, {code: 'Digit1', en: '1'}, {code: 'Digit2', en: '2'}, {code: 'Digit3', en: '3'}, {code: 'Digit4', en: '4'},
    {code: 'Digit5', en: '5'}, {code: 'Digit6', en: '6'}, {code: 'Digit7', en: '7'}, {code: 'Digit8', en: '8'}, {code: 'Digit9', en: '9'},
    {code: 'Digit0', en: '0'}, {code: 'Minus', en: '-'}, {code: 'Equal', en: '='}, {code: 'Backspace', en: '⌫', w: 1.6},
  ],
  [
    {code: 'Tab', en: 'Tab', w: 1.5}, {code: 'KeyQ', en: 'Q', ko: 'ㅂ', koS: 'ㅃ'}, {code: 'KeyW', en: 'W', ko: 'ㅈ', koS: 'ㅉ'},
    {code: 'KeyE', en: 'E', ko: 'ㄷ', koS: 'ㄸ'}, {code: 'KeyR', en: 'R', ko: 'ㄱ', koS: 'ㄲ'}, {code: 'KeyT', en: 'T', ko: 'ㅅ', koS: 'ㅆ'},
    {code: 'KeyY', en: 'Y', ko: 'ㅛ'}, {code: 'KeyU', en: 'U', ko: 'ㅕ'}, {code: 'KeyI', en: 'I', ko: 'ㅑ'},
    {code: 'KeyO', en: 'O', ko: 'ㅐ', koS: 'ㅒ'}, {code: 'KeyP', en: 'P', ko: 'ㅔ', koS: 'ㅖ'},
    {code: 'BracketLeft', en: '['}, {code: 'BracketRight', en: ']'}, {code: 'Backslash', en: '\\', w: 1.1},
  ],
  [
    {code: 'CapsLock', en: 'Caps', w: 1.8}, {code: 'KeyA', en: 'A', ko: 'ㅁ'}, {code: 'KeyS', en: 'S', ko: 'ㄴ'}, {code: 'KeyD', en: 'D', ko: 'ㅇ'},
    {code: 'KeyF', en: 'F', ko: 'ㄹ'}, {code: 'KeyG', en: 'G', ko: 'ㅎ'}, {code: 'KeyH', en: 'H', ko: 'ㅗ'}, {code: 'KeyJ', en: 'J', ko: 'ㅓ'},
    {code: 'KeyK', en: 'K', ko: 'ㅏ'}, {code: 'KeyL', en: 'L', ko: 'ㅣ'}, {code: 'Semicolon', en: ';'}, {code: 'Quote', en: "'"},
    {code: 'Enter', en: 'Enter', w: 1.9},
  ],
  [
    {code: 'ShiftLeft', en: 'Shift', w: 2.3}, {code: 'KeyZ', en: 'Z', ko: 'ㅋ'}, {code: 'KeyX', en: 'X', ko: 'ㅌ'}, {code: 'KeyC', en: 'C', ko: 'ㅊ'},
    {code: 'KeyV', en: 'V', ko: 'ㅍ'}, {code: 'KeyB', en: 'B', ko: 'ㅠ'}, {code: 'KeyN', en: 'N', ko: 'ㅜ'}, {code: 'KeyM', en: 'M', ko: 'ㅡ'},
    {code: 'Comma', en: ','}, {code: 'Period', en: '.'}, {code: 'Slash', en: '/'}, {code: 'ShiftRight', en: 'Shift', w: 2.4},
  ],
  [{code: 'Lang', en: '한/영', w: 1.6}, {code: 'Space', en: '', w: 8}, {code: 'Lang2', en: '', w: 1.6}],
];

const HOME = new Set(['KeyF', 'KeyJ']);

export const Keyboard: React.FC<{lang: Lang; pressed: Set<string>; next: [string, boolean] | null; flashBad: boolean}> = ({lang, pressed, next, flashBad}) => {
  const shiftOn = pressed.has('ShiftLeft') || pressed.has('ShiftRight');
  return (
    <div className={`kb ${flashBad ? 'kb-bad' : ''}`}>
      {ROWS.map((row, ri) => (
        <div className="kb-row" key={ri}>
          {row.map((k) => {
            const isNext = next && (next[0] === k.code || (next[1] && (k.code === 'ShiftLeft' || k.code === 'ShiftRight')));
            const down = pressed.has(k.code) || (k.code === 'Lang' && (pressed.has('Lang1') || pressed.has('AltRight')));
            const label = k.code === 'Lang' ? (getUi() === 'en' ? 'Lang' : '한/영') : lang === 'ko' && k.ko ? (shiftOn && k.koS ? k.koS : k.ko) : k.en;
            return (
              <div key={k.code} className={`key ${down ? 'down' : ''} ${isNext ? 'next' : ''} ${HOME.has(k.code) ? 'home' : ''}`} style={{flex: k.w ?? 1}}>
                <span className="key-main">{label}</span>
                {lang === 'ko' && k.ko ? <span className="key-sub">{k.en}</span> : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
