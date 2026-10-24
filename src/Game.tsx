import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {BoneStage, type StageItem} from './components/BoneStage';
import {Keyboard} from './components/Keyboard';
import type {Bone} from './data/bones';
import {NATIVE_NAME, NATIVE_SENTENCE, toNative} from './data/native';
import {modeOf, type Category, type Kind, type Mode} from './lib/modes';
import {scoreOf} from './lib/ranking';
import {sfxBackspace, sfxBad, sfxFinish, sfxKey, sfxPass, sfxWord} from './lib/sound';
import {check, norm, units, type Lang} from './lib/typing';
import {SoundToggle} from './components/SoundToggle';

export type {Kind};
export type Result = {mode: Mode; cpm: number; accuracy: number; items: number; duration_ms: number; score: number; passes?: number; errors?: number; review?: boolean};

const ROUND = {word: 20, sentence: 8};

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

export type Term = 'hanja' | 'native';
// 한글 이름: 한자어(쇄골) 또는 우리말(빗장뼈)
export const koName = (b: Bone, term: Term) => (term === 'native' ? NATIVE_NAME[b.id] ?? b.ko : b.ko);
const targetOf = (b: Bone, lang: Lang, kind: Kind, term: Term) => {
  if (lang === 'en') return kind === 'sentence' ? b.sentence.en : b.en;
  if (kind === 'word') return koName(b, term);
  return term === 'native' ? NATIVE_SENTENCE[b.id] ?? toNative(b.sentence.ko) : b.sentence.ko;
};

export const Game: React.FC<{cat: Category; pool: Bone[]; lang: Lang; kind: Kind; term: Term; blind: boolean; order?: string[]; onFirstKey?: () => void; onDone: (r: Result) => void; onQuit: () => void}> = ({cat, pool, lang, kind, term, blind, order, onFirstKey, onDone, onQuit}) => {
  // 서버가 정해 준 문제 순서가 있으면 그대로 (랭킹 판정용), 없으면 무작위
  const queue = useMemo(() => {
    const fromServer = order?.map((id) => pool.find((b) => b.id === id)).filter((b): b is Bone => !!b);
    return fromServer && fromServer.length ? fromServer : shuffle(pool).slice(0, ROUND[kind]);
  }, [kind, pool, order]);
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState('');
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const [bad, setBad] = useState(false);
  const [ended, setEnded] = useState(false);
  // 블라인드 모드: 정답 글씨를 숨기고, 틀린 문제에서만 보여 줌 (다음 문제부터 다시 숨김)
  const [revealed, setRevealed] = useState(false);
  const [passing, setPassing] = useState(false);
  const passes = useRef(0);
  const hide = blind && !revealed;
  const endedRef = useRef(false);
  endedRef.current = ended;
  const [bursts, setBursts] = useState<number[]>([]);
  const [combo, setCombo] = useState(0);
  const [latinWarn, setLatinWarn] = useState(false);
  const stats = useRef({start: 0, units: 0, errors: 0, clean: true});
  const [tick, setTick] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const pendingSubmit = useRef(false);
  const lastOk = useRef(true);
  // 확정 뒤 새 키를 누르기 전까지 들어오는 입력은 한글 입력기가 남긴 이전 글자 → 무시
  const keySinceSubmit = useRef(true);
  const submittedAt = useRef(0);
  const progress = useRef(0);
  progress.current = idx / queue.length;

  const bone = queue[idx];
  // 3D 무대: 왼쪽 = 방금 친 뼈, 가운데 = 지금, 오른쪽 = 다음 (모두 회전). 끝나면 한 칸씩 더 밀림
  const at = ended ? idx + 1 : idx;
  const items: StageItem[] = [];
  for (let i = Math.max(0, at - 2); i <= Math.min(queue.length - 1, at + 1); i++) {
    const slot = i < at - 1 ? 'gone' : i === at - 1 ? 'prev' : i === at ? 'cur' : 'next';
    items.push({key: `${queue[i].id}-${i}`, model: queue[i].model, slot});
  }
  const target = targetOf(bone, lang, kind, term);
  const st = check(target, kind === 'word' ? value.trim() : value, lang);

  // 게임 중에는 페이지 자체가 스크롤되지 않게 (키보드 대응 · 타이틀은 자유 스크롤)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('in-game');
    window.scrollTo(0, 0);
    return () => root.classList.remove('in-game');
  }, []);

  // 진행 중 타수 갱신용
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const focus = () => input.current?.focus();
    focus();
    const down = (e: KeyboardEvent) => {
      setPressed((p) => new Set(p).add(e.code || e.key));
      // 확정 키(Space·Enter) 자체는 '새 입력'으로 치지 않음 — 이 키가 확정을 부른 뒤 여기에 도착하므로
      if (!['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Enter', ' '].includes(e.key) && e.code !== 'Space') keySinceSubmit.current = true;
      // 타격음: 글자·띄어쓰기 키마다 (조합 중인 한글도 물리 키 기준이라 한 자 한 자 남)
      if (!e.repeat && !e.metaKey && !e.ctrlKey) {
        if (e.code === 'Backspace') sfxBackspace();
        else if (/^(Key|Digit)/.test(e.code) || ['Space', 'Comma', 'Period', 'Quote', 'Minus', 'Slash', 'Semicolon'].includes(e.code)) sfxKey(progress.current);
      }
      if (!endedRef.current && document.activeElement !== input.current) focus();
    };
    const up = (e: KeyboardEvent) =>
      setPressed((p) => {
        const n = new Set(p);
        n.delete(e.code || e.key);
        return n;
      });
    const clear = () => setPressed(new Set());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, []);

  const flashBad = useCallback(() => {
    setBad(true);
    setTimeout(() => setBad(false), 380);
  }, []);

  const onChange = (v: string) => {
    if (ended || passing) return;
    if (!keySinceSubmit.current && performance.now() - submittedAt.current < 200) {
      // 이전 문제의 조합 글자가 다시 들어온 것 — 지우고 무시
      if (input.current) input.current.value = '';
      setValue('');
      return;
    }
    if (!stats.current.start && v) {
      stats.current.start = performance.now();
      onFirstKey?.();
    }
    // 한글 판인데 영문이 들어오면 한/영 안내
    setLatinWarn(lang === 'ko' && /[a-zA-Z]/.test(v));
    const c = check(target, kind === 'word' ? v.trim() : v, lang);
    if (!c.ok && lastOk.current && v.length >= value.length && v.trim()) {
      stats.current.errors++;
      stats.current.clean = false;
      flashBad();
      sfxBad();
      setRevealed(true);
    }
    lastOk.current = c.ok;
    setValue(v);
  };

  const finish = useCallback(() => {
    const s = stats.current;
    const ms = Math.max(1, performance.now() - (s.start || performance.now()));
    const cpm = Math.round((s.units / ms) * 60000);
    const accuracy = Math.round((s.units / Math.max(1, s.units + s.errors)) * 10000) / 100;
    onDone({mode: modeOf(cat, lang, kind), cpm, accuracy, items: queue.length, duration_ms: Math.round(ms), score: scoreOf(cpm, accuracy), passes: passes.current, errors: s.errors});
  }, [cat, lang, kind, queue.length, onDone]);

  // 다음 문제로 (맞힘 · 패스 공통)
  const advance = useCallback(() => {
    // 한글 조합을 강제로 끝내고(포커스 잠깐 빼기) 비움 — 다음 문제로 글자가 넘어가지 않게
    keySinceSubmit.current = false;
    submittedAt.current = performance.now();
    const el = input.current;
    if (el) {
      el.blur();
      el.value = '';
      requestAnimationFrame(() => el.focus());
    }
    setValue('');
    const next = idx + 1;
    if (next >= queue.length) {
      setEnded(true);
      setTimeout(() => {
        sfxFinish();
        finish();
      }, 700);
      return;
    }
    setIdx(next);
    setRevealed(false);
  }, [idx, queue, finish]);

  const submit = useCallback(() => {
    const v = kind === 'word' ? value.trim() : value.replace(/\s+$/, '');
    if (norm(v, lang) !== norm(target, lang)) {
      if (v.length) {
        stats.current.errors++;
        stats.current.clean = false;
      }
      flashBad();
      sfxBad();
      setRevealed(true);
      return;
    }
    stats.current.units += units(target, lang).length + (kind === 'word' ? 1 : 1); // 확정 키(스페이스·엔터)까지
    const nextCombo = stats.current.clean ? combo + 1 : 0;
    setCombo(nextCombo);
    sfxWord(nextCombo);
    stats.current.clean = true;
    lastOk.current = true;
    setBursts((b) => [...b.slice(-4), performance.now()]);
    advance();
  }, [value, target, kind, lang, finish, flashBad, combo, advance]);

  // 패스: 그 낱말의 글자(자모) 수만큼 오타로 치고, 정답을 1초 보여 준 뒤 넘어감
  const pass = useCallback(() => {
    if (ended || passing) return;
    stats.current.errors += units(target, lang).length;
    stats.current.clean = false;
    passes.current++;
    setCombo(0);
    sfxPass();
    setPassing(true);
    setRevealed(true);
    keySinceSubmit.current = false;
    submittedAt.current = performance.now();
    if (input.current) input.current.value = '';
    setValue('');
    setTimeout(() => {
      setPassing(false);
      advance();
    }, 1000);
  }, [ended, passing, target, lang, advance]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (ended || passing) {
      e.preventDefault();
      return;
    }
    // Tab = 패스
    if (e.key === 'Tab') {
      e.preventDefault();
      pass();
      return;
    }
    // Space 는 끝까지 다 친 뒤에 확정 — 문장은 마침표 뒤 Space 로 다음 문장, 낱말은 띄어쓰기 없는 낱말이면 언제든
    const isSpace = e.key === ' ' || e.code === 'Space';
    const spaceSubmit = isSpace && (norm(value.trim(), lang) === norm(target, lang) || (kind === 'word' && !target.includes(' ')));
    const isSubmit = e.key === 'Enter' || spaceSubmit;
    if (e.key === 'Escape') onQuit();
    if (!isSubmit) return;
    e.preventDefault();
    // 한글 조합 중이면 조합이 끝난 뒤 확정
    if (e.nativeEvent.isComposing || composing.current) {
      pendingSubmit.current = true;
      return;
    }
    submit();
  };

  useEffect(() => {
    if (pendingSubmit.current && !composing.current) {
      pendingSubmit.current = false;
      submit();
    }
  });

  const s = stats.current;
  const elapsed = s.start ? (performance.now() - s.start) / 60000 : 0;
  const liveCpm = elapsed > 0.02 ? Math.round((s.units + (st.ok ? st.doneUnits : 0)) / elapsed) : 0;
  const liveAcc = s.units + s.errors > 0 ? Math.round((s.units / (s.units + s.errors)) * 100) : 100;
  void tick;

  const typed = [...value];
  const ghost = passing ? [...target] : [...target].slice(typed.length);
  const tag = bone.tag ? ` (${bone.tag[lang]})` : '';
  const sub = lang === 'ko' ? `${bone.en}${bone.tag ? ` · ${bone.tag.en}` : ''}` : `${koName(bone, term)}${bone.tag ? ` (${bone.tag.ko})` : ''}`;

  return (
    <div className="game" onClick={() => input.current?.focus()}>
      <div className="hud">
        <button className="ghost-btn" onClick={onQuit}>
          그만하기<span className="esc"> Esc</span>
        </button>
        <div className="hud-stats">
          {blind ? <span className={`blind-badge ${revealed ? 'peek' : ''}`}>{revealed ? 'BLIND · 공개' : 'BLIND'}</span> : null}
          <span>
            <b>{liveCpm}</b> {lang === 'ko' ? '타' : 'CPM'}
          </span>
          <span>
            <b>{liveAcc}</b>%
          </span>
          <span>
            <b>{idx + 1}</b>/{queue.length}
          </span>
        </div>
        <div className="hud-right">
        <SoundToggle />
        <div className={`combo ${combo >= 2 ? 'on' : ''}`} key={combo}>
          {combo >= 2 ? (
            <>
              COMBO<b>{combo}</b>
            </>
          ) : null}
        </div>
        </div>
      </div>
      <div className="progress">
        <div style={{width: `${(idx / queue.length) * 100}%`}} />
      </div>

      <div className="stage">
        <BoneStage items={items} bad={bad} bursts={bursts} />
        <div className="bone-label">
          {kind === 'sentence' ? (
            <>
              <span className="bone-name">
                {lang === 'ko' ? koName(bone, term) : bone.en}
                {tag}
              </span>
              <span className="bone-sub">{sub}</span>
            </>
          ) : (
            <span className="bone-sub">{sub}</span>
          )}
        </div>
      </div>

      <div className={`line ${kind} ${bad ? 'shake' : ''} ${passing ? 'passing' : ''}`} data-target={target}>
        {typed.map((ch, i) => (
          <span key={i} className={`ch ${st.charStates[i] ?? 'bad'}`}>
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
        <span className="caret" />
        {(hide ? [] : ghost).map((ch, i) => (
          <span key={`g${i}`} className="ch ghost">
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
        {kind === 'word' && bone.tag ? <span className="tag">{bone.tag[lang]}</span> : null}
        <input
          ref={input}
          className="sink"
          value={value}
          autoComplete="one-time-code"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          lang={lang === 'ko' ? 'ko' : 'en'}
          enterKeyHint="next"
          name="bone-answer"
          id="bone-answer"
          aria-autocomplete="none"
          data-form-type="other"
          data-lpignore="true"
          inputMode="text"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onCompositionStart={() => (composing.current = true)}
          onCompositionEnd={(e) => {
            composing.current = false;
            onChange((e.target as HTMLInputElement).value);
          }}
        />
      </div>
      <div className="hint">
        <button className="pass-btn" onClick={pass} disabled={ended || passing}>
          {passing ? 'PASS' : '패스'} <kbd>Tab</kbd>
        </button>
        {latinWarn ? <span className="warn">한/영 키를 눌러 한글 입력으로 바꿔 주세요</span> : <span className="hint-keys">{kind === 'word' ? 'Space 또는 Enter 로 확정' : '마침표까지 치고 Space 또는 Enter 로 다음 문장'}</span>}
        <span className="hint-touch">글자를 누르면 키보드가 열려요 · 확정은 띄어쓰기/엔터</span>
      </div>

      <Keyboard
        lang={lang}
        pressed={pressed}
        next={passing ? null : !st.ok ? ['Backspace', false] : hide ? null : st.nextKey ?? (st.doneUnits === st.totalUnits ? [kind === 'word' ? 'Space' : 'Enter', false] : null)}
        flashBad={bad}
      />
    </div>
  );
};
