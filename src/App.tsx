import {useEffect, useState} from 'react';
import {BoneStage, preloadModels} from './components/BoneStage';
import {BONES} from './data/bones';
import {Game, type Kind, type Result} from './Game';
import {SoundToggle} from './components/SoundToggle';
import {isShared, submitScore, topScores, type Mode, type Score} from './lib/ranking';
import {initSound, startBgm} from './lib/sound';
import type {Lang} from './lib/typing';

const NICK = 'bone-typing:nick';
const readNick = () => {
  try {
    return localStorage.getItem(NICK) ?? '';
  } catch {
    return '';
  }
};

const MODE_LABEL: Record<Mode, string> = {
  'ko-word': '한글 · 낱말',
  'ko-sentence': '한글 · 문장',
  'en-word': 'English · Word',
  'en-sentence': 'English · Sentence',
};

const Board: React.FC<{mode: Mode; me?: string; refresh: number}> = ({mode, me, refresh}) => {
  const [rows, setRows] = useState<Score[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    setRows(null);
    setErr(false);
    topScores(mode)
      .then((r) => alive && setRows(r))
      .catch(() => alive && setErr(true));
    return () => {
      alive = false;
    };
  }, [mode, refresh]);
  return (
    <div className="board">
      <div className="board-head">
        RANKING · {MODE_LABEL[mode]}
        <span className="board-scope">{isShared() ? '전체' : '이 기기'}</span>
      </div>
      {err ? <div className="board-empty">랭킹을 불러오지 못했어요</div> : null}
      {rows && rows.length === 0 ? <div className="board-empty">아직 기록이 없어요. 첫 1등을 노려 보세요!</div> : null}
      {rows?.map((r, i) => (
        <div key={`${r.nickname}-${i}`} className={`board-row ${me && r.nickname === me ? 'me' : ''}`}>
          <span className="rank">{String(i + 1).padStart(2, '0')}</span>
          <span className="nick">{r.nickname}</span>
          <span className="score">{r.score}</span>
          <span className="meta">
            {r.cpm}타 · {Number(r.accuracy).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
};

const IDLE = [{key: 'title-spine', model: BONES.find((b) => b.id === 'spine')!.model, slot: 'cur' as const}];

export default function App() {
  const [screen, setScreen] = useState<'title' | 'game' | 'result'>('title');
  const [lang, setLang] = useState<Lang>('ko');
  const [kind, setKind] = useState<Kind>('word');
  const [nick, setNick] = useState(readNick);
  const [result, setResult] = useState<Result | null>(null);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'ok' | 'fail'>('idle');
  const [refresh, setRefresh] = useState(0);
  const [round, setRound] = useState(0);
  const mode = `${lang}-${kind}` as Mode;

  useEffect(() => preloadModels(['spine', 'arm', 'hand', 'pelvis', 'leg', 'foot']), []);

  const start = () => {
    const n = nick.trim().slice(0, 12);
    if (!n) return;
    initSound();
    startBgm();
    try {
      localStorage.setItem(NICK, n);
    } catch {
      /* 무시 */
    }
    setNick(n);
    setRound((r) => r + 1);
    setScreen('game');
  };

  const done = async (r: Result) => {
    setResult(r);
    setScreen('result');
    setSaved('saving');
    try {
      await submitScore({nickname: nick, ...r});
      setSaved('ok');
    } catch {
      setSaved('fail');
    }
    setRefresh((x) => x + 1);
  };

  // 개발용: ?bone=<id> 로 뼈 하나만 띄워 3D 확인
  const peek = new URLSearchParams(location.search).get('bone');
  const peekBone = peek ? BONES.find((b) => b.id === peek) : null;
  if (peekBone)
    return (
      <div style={{height: '100%'}}>
        <BoneStage items={[{key: peekBone.id, model: peekBone.model, slot: 'cur'}]} bad={false} bursts={[]} />
      </div>
    );

  if (screen === 'game') return <Game key={round} lang={lang} kind={kind} onDone={done} onQuit={() => setScreen('title')} />;

  return (
    <div
      className="title"
      onPointerDown={() => {
        // 브라우저는 사용자 동작 뒤에만 소리를 낼 수 있음 — 첫 클릭에 배경음 시작
        initSound();
        startBgm();
      }}
    >
      <div className="title-stage">
        <BoneStage items={IDLE} bad={false} bursts={[]} />
      </div>
      <div className="title-panel">
        {screen === 'title' ? (
          <>
            <div className="logo">
              뼈이름으로
              <br />
              <span className="logo-king">타자연습</span>
              <span className="logo-sub">BONE NAME TYPING</span>
            </div>
            <div className="seg">
              <button className={lang === 'ko' ? 'on' : ''} onClick={() => setLang('ko')}>
                한글
              </button>
              <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>
                English
              </button>
            </div>
            <div className="seg">
              <button className={kind === 'word' ? 'on' : ''} onClick={() => setKind('word')}>
                낱말 연습
              </button>
              <button className={kind === 'sentence' ? 'on' : ''} onClick={() => setKind('sentence')}>
                문장 연습
              </button>
            </div>
            <input
              className="nick-input"
              placeholder="닉네임 (12자까지)"
              maxLength={12}
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && start()}
            />
            <button className="start" disabled={!nick.trim()} onClick={start}>
              시작하기
            </button>
            <SoundToggle />
            <Board mode={mode} me={nick} refresh={refresh} />
          </>
        ) : result ? (
          <>
            <div className="result-head">{MODE_LABEL[result.mode]} 결과</div>
            <div className="result-score">{result.score}</div>
            <div className="result-sub">점수 = 타수 × 정확도²</div>
            <div className="result-grid">
              <div>
                <b>{result.cpm}</b>
                <span>{lang === 'ko' ? '타수' : 'CPM'}</span>
              </div>
              <div>
                <b>{result.accuracy.toFixed(1)}%</b>
                <span>정확도</span>
              </div>
              <div>
                <b>{(result.duration_ms / 1000).toFixed(1)}s</b>
                <span>시간</span>
              </div>
            </div>
            <div className="saved">{saved === 'saving' ? '랭킹에 올리는 중…' : saved === 'ok' ? '랭킹에 올렸어요' : saved === 'fail' ? '랭킹 저장 실패' : ''}</div>
            <div className="row-btns">
              <button className="start" onClick={start}>
                다시 하기
              </button>
              <button className="ghost-btn" onClick={() => setScreen('title')}>
                처음으로
              </button>
            </div>
            <Board mode={result.mode} me={nick} refresh={refresh} />
          </>
        ) : null}
        <div className="credit">
          3D 뼈 모델: BodyParts3D © DBCLS, CC BY-SA 2.1 JP (단위·경량화·이름 수정) · made by <b>@iamnotwoodz</b>
        </div>
      </div>
    </div>
  );
}
