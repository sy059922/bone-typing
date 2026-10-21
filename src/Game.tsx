import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {BoneStage, type StageItem} from './components/BoneStage';
import {Keyboard} from './components/Keyboard';
import {BONES, type Bone} from './data/bones';
import {scoreOf, type Mode} from './lib/ranking';
import {sfxBackspace, sfxBad, sfxFinish, sfxKey, sfxWord} from './lib/sound';
import {check, units, type Lang} from './lib/typing';
import {SoundToggle} from './components/SoundToggle';

export type Kind = 'word' | 'sentence';
export type Result = {mode: Mode; cpm: number; accuracy: number; items: number; duration_ms: number; score: number};

const ROUND = {word: 20, sentence: 8};

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

const targetOf = (b: Bone, lang: Lang, kind: Kind) => (kind === 'sentence' ? b.sentence[lang] : lang === 'ko' ? b.ko : b.en);

export const Game: React.FC<{lang: Lang; kind: Kind; onDone: (r: Result) => void; onQuit: () => void}> = ({lang, kind, onDone, onQuit}) => {
  const queue = useMemo(() => shuffle(BONES).slice(0, ROUND[kind]), [kind]);
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState('');
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  const [bad, setBad] = useState(false);
  const [ended, setEnded] = useState(false);
  const [bursts, setBursts] = useState<number[]>([]);
  const [combo, setCombo] = useState(0);
  const [latinWarn, setLatinWarn] = useState(false);
  const stats = useRef({start: 0, units: 0, errors: 0, clean: true});
  const [tick, setTick] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  const pendingSubmit = useRef(false);
  const lastOk = useRef(true);
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
  const target = targetOf(bone, lang, kind);
  const st = check(target, kind === 'word' ? value.trim() : value, lang);

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
      // 타격음: 글자·띄어쓰기 키마다 (조합 중인 한글도 물리 키 기준이라 한 자 한 자 남)
      if (!e.repeat && !e.metaKey && !e.ctrlKey) {
        if (e.code === 'Backspace') sfxBackspace();
        else if (/^(Key|Digit)/.test(e.code) || ['Space', 'Comma', 'Period', 'Quote', 'Minus', 'Slash', 'Semicolon'].includes(e.code)) sfxKey(progress.current);
      }
      if (document.activeElement !== input.current) focus();
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
    if (!stats.current.start && v) stats.current.start = performance.now();
    // 한글 판인데 영문이 들어오면 한/영 안내
    setLatinWarn(lang === 'ko' && /[a-zA-Z]/.test(v));
    const c = check(target, kind === 'word' ? v.trim() : v, lang);
    if (!c.ok && lastOk.current && v.length >= value.length) {
      stats.current.errors++;
      stats.current.clean = false;
      flashBad();
      sfxBad();
    }
    lastOk.current = c.ok;
    setValue(v);
  };

  const finish = useCallback(() => {
    const s = stats.current;
    const ms = Math.max(1, performance.now() - (s.start || performance.now()));
    const cpm = Math.round((s.units / ms) * 60000);
    const accuracy = Math.round((s.units / Math.max(1, s.units + s.errors)) * 10000) / 100;
    onDone({mode: `${lang}-${kind}` as Mode, cpm, accuracy, items: queue.length, duration_ms: Math.round(ms), score: scoreOf(cpm, accuracy)});
  }, [lang, kind, queue.length, onDone]);

  const submit = useCallback(() => {
    const v = kind === 'word' ? value.trim() : value.replace(/\s+$/, '');
    if (v !== target) {
      if (v.length) {
        stats.current.errors++;
        stats.current.clean = false;
      }
      flashBad();
      sfxBad();
      return;
    }
    stats.current.units += units(target, lang).length + (kind === 'word' ? 1 : 1); // 확정 키(스페이스·엔터)까지
    const nextCombo = stats.current.clean ? combo + 1 : 0;
    setCombo(nextCombo);
    sfxWord(nextCombo);
    stats.current.clean = true;
    lastOk.current = true;
    setBursts((b) => [...b.slice(-4), performance.now()]);
    setValue('');
    if (input.current) input.current.value = '';
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
  }, [value, target, kind, lang, idx, queue, finish, flashBad, combo]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 낱말 모드의 Space 는 다 친 뒤에만 확정 (영어 이름 'Carpal bones' 처럼 띄어쓰기가 있는 낱말)
    const spaceSubmit = kind === 'word' && (e.key === ' ' || e.code === 'Space') && (value.trim() === target || !target.includes(' '));
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
  const ghost = [...target].slice(typed.length);
  const tag = bone.tag ? ` (${bone.tag[lang]})` : '';
  const sub = lang === 'ko' ? `${bone.en}${bone.tag ? ` · ${bone.tag.en}` : ''}` : `${bone.ko}${bone.tag ? ` (${bone.tag.ko})` : ''}`;

  return (
    <div className="game" onClick={() => input.current?.focus()}>
      <div className="hud">
        <button className="ghost-btn" onClick={onQuit}>
          그만하기<span className="esc"> Esc</span>
        </button>
        <div className="hud-stats">
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
                {lang === 'ko' ? bone.ko : bone.en}
                {tag}
              </span>
              <span className="bone-sub">{sub}</span>
            </>
          ) : (
            <span className="bone-sub">{sub}</span>
          )}
        </div>
      </div>

      <div className={`line ${kind} ${bad ? 'shake' : ''}`} data-target={target}>
        {typed.map((ch, i) => (
          <span key={i} className={`ch ${st.charStates[i] ?? 'bad'}`}>
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
        <span className="caret" />
        {ghost.map((ch, i) => (
          <span key={`g${i}`} className="ch ghost">
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
        {kind === 'word' && bone.tag ? <span className="tag">{bone.tag[lang]}</span> : null}
        <input
          ref={input}
          className="sink"
          value={value}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          lang={lang === 'ko' ? 'ko' : 'en'}
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
        {latinWarn ? <span className="warn">한/영 키를 눌러 한글 입력으로 바꿔 주세요</span> : <span className="hint-keys">{kind === 'word' ? 'Space 또는 Enter 로 확정' : 'Enter 로 확정'}</span>}
        <span className="hint-touch">글자를 누르면 키보드가 열려요 · 확정은 띄어쓰기/엔터</span>
      </div>

      <Keyboard lang={lang} pressed={pressed} next={st.ok ? st.nextKey ?? (st.doneUnits === st.totalUnits ? [kind === 'word' ? 'Space' : 'Enter', false] : null) : ['Backspace', false]} flashBad={bad} />
    </div>
  );
};
