import {useEffect, useState} from 'react';
import {BoneStage, IconStage, preloadModels} from './components/BoneStage';
import {BONES} from './data/bones';
import {MUSCLES} from './data/muscles';
import {modeLabel, modeOf, parseMode, type Category} from './lib/modes';
import {Game, type Kind, type Result, type Term} from './Game';
import {ResultModal} from './components/ResultModal';
import {SoundToggle} from './components/SoundToggle';
import {logClick, checkNickname, formatCode, getShared, getToken, isShared, newToken, parseCode, setToken, submitScore, topScores, type Mode, type Score} from './lib/ranking';
import {initSound, setTheme, startBgm} from './lib/sound';
import type {Lang} from './lib/typing';

const NICK = 'bone-typing:nick';
const readNick = () => {
  try {
    return localStorage.getItem(NICK) ?? '';
  } catch {
    return '';
  }
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
        RANKING · {modeLabel(mode)}
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
const IDLE_MUSCLE = [{key: 'title-quads', model: MUSCLES.find((b) => b.id === 'quadriceps')!.model, slot: 'cur' as const}];

export default function App() {
  const [screen, setScreen] = useState<'title' | 'game'>('title');
  const [cat, setCat] = useState<Category>('bone');
  // 한글 용어: 한자어(쇄골) · 우리말(빗장뼈) — 이 브라우저에 기억
  const [term, setTermState] = useState<Term>(() => {
    try {
      return localStorage.getItem('bone-typing:term') === 'native' ? 'native' : 'hanja';
    } catch {
      return 'hanja';
    }
  });
  const setTerm = (t: Term) => {
    setTermState(t);
    try {
      localStorage.setItem('bone-typing:term', t);
    } catch {
      /* 무시 */
    }
  };
  const [blind, setBlindState] = useState(() => {
    try {
      return localStorage.getItem('bone-typing:blind') === '1';
    } catch {
      return false;
    }
  });
  const setBlind = (on: boolean) => {
    setBlindState(on);
    setTheme(on ? 'blind' : 'normal');
    try {
      localStorage.setItem('bone-typing:blind', on ? '1' : '0');
    } catch {
      /* 무시 */
    }
  };
  useEffect(() => setTheme(blind ? 'blind' : 'normal'), [blind]);
  const [lang, setLang] = useState<Lang>('ko');
  const [kind, setKind] = useState<Kind>('word');
  const [nick, setNick] = useState(readNick);
  const [result, setResult] = useState<Result | null>(null);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'ok' | 'fail'>('idle');
  const [refresh, setRefresh] = useState(0);
  const [round, setRound] = useState(0);
  const [rank, setRank] = useState<number | null>(null);
  const [best, setBest] = useState(false);
  const [scoreId, setScoreId] = useState<number | null>(null);
  const [failReason, setFailReason] = useState('');
  // 닉네임 선점 상태: taken = 남의 닉네임 → 복구 코드 입력, claimed = 이번 판으로 새로 선점
  const [nickTaken, setNickTaken] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [checking, setChecking] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [showCode, setShowCode] = useState(false);
  // 공유 링크로 들어온 경우: 그 기록에 도전하라는 문구
  const [vs, setVs] = useState<(Score & {rank: number}) | null>(null);
  useEffect(() => {
    const id = Number(new URLSearchParams(location.search).get('vs'));
    if (!id) return;
    getShared(id).then((s) => {
      if (!s) return;
      setVs(s);
      const m = parseMode(s.mode);
      setCat(m.cat);
      setLang(m.lang);
      setKind(m.kind);
    });
  }, []);
  const mode = modeOf(cat, lang, kind);

  useEffect(() => preloadModels(cat === 'muscle' ? ['muscle_upper', 'muscle_lower', 'muscle_trunk'] : ['spine', 'arm', 'hand', 'pelvis', 'leg', 'foot']), [cat]);

  const start = async () => {
    const n = nick.trim().slice(0, 12);
    if (!n || checking) return;
    initSound();
    startBgm();
    // 닉네임 주인 확인 — 남의 닉네임이면 시작 전에 막음
    if (isShared()) {
      setChecking(true);
      try {
        const token = getToken(n);
        const st = await checkNickname(n, token);
        if (st === 'taken') {
          setNickTaken(true);
          setScreen('title');
          setResult(null);
          return;
        }
        if (st === 'free' && !token) setToken(n, newToken());
        setClaimed(st === 'free');
      } catch {
        /* 확인 실패해도 게임은 함 — 저장 때 서버가 다시 막음 */
      } finally {
        setChecking(false);
      }
    }
    setNickTaken(false);
    try {
      localStorage.setItem(NICK, n);
    } catch {
      /* 무시 */
    }
    setNick(n);
    setResult(null);
    setRank(null);
    setBest(false);
    setScoreId(null);
    setFailReason('');
    setRound((r) => r + 1);
    setScreen('game');
  };

  // 다른 기기에서 내 닉네임 되찾기
  const recover = async () => {
    const code = parseCode(codeInput);
    if (code.length !== 12) {
      setCodeErr('복구 코드는 12자리예요');
      return;
    }
    try {
      if ((await checkNickname(nick.trim(), code)) === 'mine') {
        setToken(nick.trim(), code);
        setNickTaken(false);
        setCodeInput('');
        start();
      } else setCodeErr('코드가 맞지 않아요');
    } catch {
      setCodeErr('확인하지 못했어요. 잠시 뒤 다시 해 주세요');
    }
  };

  // 끝나면 게임 화면 위에 결과 팝업 (확인을 눌러야 메인으로)
  const done = async (r: Result) => {
    setResult(r);
    setSaved('saving');
    try {
      setScoreId(await submitScore({nickname: nick, ...r}, getToken(nick)));
      setSaved('ok');
      const top = await topScores(r.mode, 500);
      const i = top.findIndex((x) => x.nickname.toLowerCase() === nick.toLowerCase());
      setRank(i >= 0 ? i + 1 : null);
      setBest(i >= 0 && top[i].score === r.score);
    } catch (e) {
      const code = (e as {code?: string; message?: string}).code;
      const msg = (e as {message?: string}).message ?? '';
      setFailReason(
        code === '23514'
          ? '기록이 비정상적으로 빨라 랭킹에 올리지 않았어요'
          : msg.includes('too many')
            ? '잠시 뒤에 다시 올려 주세요 (1분에 5번까지)'
            : msg.includes('nickname taken')
              ? '다른 사람이 쓰는 닉네임이라 저장하지 못했어요'
              : '',
      );
      setClaimed(false);
      setSaved('fail');
    }
    setRefresh((x) => x + 1);
  };

  // 개발용: ?bone=<id> 로 뼈 하나만 띄워 3D 확인
  const peek = new URLSearchParams(location.search).get('bone');
  const peekBone = peek ? [...BONES, ...MUSCLES].find((b) => b.id === peek) : null;
  // 개발용: ?icon 으로 앱 아이콘(손뼈 '안녕') 렌더
  if (new URLSearchParams(location.search).has('icon')) {
    const hand = BONES.find((b) => b.id === 'phalanges')!.model;
    const all = [...new Set([...(hand.show ?? []), ...hand.hl])];
    return (
      <div style={{width: '100vw', height: '100vh'}}>
        <IconStage model={{file: 'hand', hl: all}} />
      </div>
    );
  }
  // 개발용: ?og 로 링크 미리보기 그림(1200×630) 화면
  if (new URLSearchParams(location.search).has('og'))
    return (
      <div className="og">
        <div className="og-text">
          <div className="logo">
            뼈쟁이
            <br />
            <span className="logo-king">타자연습</span>
            <span className="logo-sub">BONE NAME TYPING</span>
          </div>
          <div className="og-desc">뼈 48개 · 근육 83개를 3D로 보며 타자 연습 · 랭킹 도전</div>
        </div>
        <div className="og-stage">
          <BoneStage items={IDLE} bad={false} bursts={[]} />
        </div>
      </div>
    );
  if (peekBone)
    return (
      <div style={{height: '100%'}}>
        <BoneStage items={[{key: peekBone.id, model: peekBone.model, slot: 'cur'}]} bad={false} bursts={[]} />
      </div>
    );

  if (screen === 'game')
    return (
      <>
        <Game key={round} cat={cat} pool={cat === 'muscle' ? MUSCLES : BONES} lang={lang} kind={kind} term={term} blind={blind} onDone={done} onQuit={() => setScreen('title')} />
        {result ? (
          <ResultModal
            result={result}
            nick={nick}
            saved={saved}
            rank={rank}
            scoreId={scoreId}
            claimCode={claimed && saved === 'ok' ? formatCode(getToken(nick) ?? '') : ''}
            failReason={failReason}
            best={best}
            onOk={() => {
              setResult(null);
              setScreen('title');
            }}
            onAgain={start}
          />
        ) : null}
      </>
    );

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
        <BoneStage items={cat === 'muscle' ? IDLE_MUSCLE : IDLE} bad={false} bursts={[]} />
      </div>
      <div className="title-panel">
        {screen === 'title' ? (
          <>
            <div className="logo">
              뼈쟁이
              <br />
              <span className="logo-king">타자연습</span>
              <span className="logo-sub">{cat === 'muscle' ? 'BONE NAME TYPING · MUSCLE EDITION' : 'BONE NAME TYPING'}</span>
            </div>
            {vs ? (
              <div className="vs">
                <b>{vs.nickname}</b>님의 <b>{vs.score}점</b>({modeLabel(vs.mode)} · 전체 {vs.rank}위)에 도전해 보세요
              </div>
            ) : null}
            <div className="seg">
              <button className={cat === 'bone' ? 'on' : ''} onClick={() => setCat('bone')}>
                뼈
              </button>
              <button className={cat === 'muscle' ? 'on' : ''} onClick={() => setCat('muscle')}>
                근육
              </button>
            </div>
            <div className="seg">
              <button className={lang === 'ko' ? 'on' : ''} onClick={() => setLang('ko')}>
                한글
              </button>
              <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>
                English
              </button>
            </div>
            {lang === 'ko' ? (
              <div className="seg term">
                <button className={term === 'hanja' ? 'on' : ''} onClick={() => setTerm('hanja')}>
                  한자어 <small>쇄골</small>
                </button>
                <button className={term === 'native' ? 'on' : ''} onClick={() => setTerm('native')}>
                  우리말 <small>빗장뼈</small>
                </button>
              </div>
            ) : null}
            <div className="seg">
              <button className={kind === 'word' ? 'on' : ''} onClick={() => setKind('word')}>
                낱말 연습
              </button>
              <button className={kind === 'sentence' ? 'on' : ''} onClick={() => setKind('sentence')}>
                문장 연습
              </button>
            </div>
            <button className={`blind-toggle ${blind ? 'on' : ''}`} onClick={() => setBlind(!blind)} role="switch" aria-checked={blind}>
              <span className="blind-knob" />
              <span className="blind-text">
                <b>블라인드 모드</b>
                <small>정답 글씨 숨기기 · 틀린 문제만 보여 줌</small>
              </span>
            </button>
            <input
              className="nick-input"
              placeholder="닉네임 (12자까지)"
              name="bone-nickname"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-form-type="other"
              onBlur={() => window.scrollTo({top: 0, behavior: 'smooth'})}
              maxLength={12}
              value={nick}
              onChange={(e) => {
                setNick(e.target.value);
                setNickTaken(false);
                setShowCode(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && start()}
            />
            {nickTaken ? (
              <div className="claim">
                <div>
                  <b>‘{nick.trim()}’</b>은 이미 다른 사람이 쓰는 닉네임이에요. 다른 닉네임을 쓰거나, 내 닉네임이라면 복구 코드를 넣어 주세요.
                </div>
                <div className="claim-row">
                  <input
                    className="nick-input"
                    placeholder="복구 코드 (XXXX-XXXX-XXXX)"
                    value={codeInput}
                    onChange={(e) => {
                      setCodeInput(e.target.value);
                      setCodeErr('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && recover()}
                  />
                  <button className="ghost-btn" onClick={recover}>
                    확인
                  </button>
                </div>
                {codeErr ? <div className="claim-err">{codeErr}</div> : null}
              </div>
            ) : null}
            <button className="start" disabled={!nick.trim() || checking} onClick={start}>
              {checking ? '닉네임 확인 중…' : '시작하기'}
            </button>
            {isShared() && nick.trim() && getToken(nick) && !nickTaken ? (
              <button className="link-btn" onClick={() => setShowCode((x) => !x)}>
                {showCode ? `복구 코드 ${formatCode(getToken(nick)!)}` : '내 닉네임 복구 코드 보기'}
              </button>
            ) : null}
            <SoundToggle />
            <Board mode={mode} me={nick} refresh={refresh} />
          </>
        ) : null}
        <div className="credit">
          3D 뼈 모델: BodyParts3D © DBCLS, CC BY-SA 2.1 JP (단위·경량화·이름 수정) · made by <a className="credit-link" href="https://www.instagram.com/iamnotwoodz/" target="_blank" rel="noopener noreferrer" onClick={() => logClick('follow_title')}>@iamnotwoodz</a>
        </div>
      </div>
    </div>
  );
}
