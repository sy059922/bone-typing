import {useEffect, useState} from 'react';
import {BoneStage, IconStage, preloadModels} from './components/BoneStage';
import {BONES} from './data/bones';
import {MUSCLES} from './data/muscles';
import {NERVES} from './data/nerves';
import {MORE} from './data/sentences';
import {modeLabel, modeOf, parseMode, type Category} from './lib/modes';
import {setUi, t, useUi, type Ui} from './lib/i18n';
import {Game, type Kind, type Result, type Term} from './Game';
import {ResultModal, StudyResult} from './components/ResultModal';
import {PARTS, formatTime, getBest, partLabel, partOf, saveBest, studyKey, type Part} from './lib/study';
import {SoundToggle} from './components/SoundToggle';
import {beginRound, startRound, logClick, checkNickname, formatCode, getShared, getToken, isShared, newToken, parseCode, setToken, submitScore, topScores, type Mode, type Score} from './lib/ranking';
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
  // 온라인·오프라인이 바뀌면 랭킹판을 다시 읽음 (전체 ↔ 이 기기)
  const [net, setNet] = useState(0);
  useEffect(() => {
    const bump = () => setNet((x) => x + 1);
    window.addEventListener('online', bump);
    window.addEventListener('offline', bump);
    return () => {
      window.removeEventListener('online', bump);
      window.removeEventListener('offline', bump);
    };
  }, []);
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
  }, [mode, refresh, net]);
  return (
    <div className="board">
      <div className="board-head">
        RANKING · {modeLabel(mode)}
        <span className="board-scope">{isShared() ? t('scopeAll') : t('scopeLocal')}</span>
      </div>
      {err ? <div className="board-empty">{t('boardErr')}</div> : null}
      {rows && rows.length === 0 ? <div className="board-empty">{t('boardEmpty')}</div> : null}
      {rows?.map((r, i) => (
        <div key={`${r.nickname}-${i}`} className={`board-row ${me && r.nickname === me ? 'me' : ''}`}>
          <span className="rank">{String(i + 1).padStart(2, '0')}</span>
          <span className="nick">{r.nickname}</span>
          <span className="score">{r.score}</span>
          <span className="meta">
            {r.cpm}
            {t('cpmUnit')} · {Number(r.accuracy).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  );
};

const IDLE = [{key: 'title-spine', model: BONES.find((b) => b.id === 'spine')!.model, slot: 'cur' as const}];
const IDLE_NERVE = [{key: 'title-plexus', model: NERVES.find((b) => b.id === 'brachial_plexus')!.model, slot: 'cur' as const}];
const IDLE_MUSCLE = [{key: 'title-quads', model: MUSCLES.find((b) => b.id === 'quadriceps')!.model, slot: 'cur' as const}];

export default function App() {
  const [screen, setScreen] = useState<'title' | 'game'>('title');
  const ui = useUi();
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
    try {
      localStorage.setItem('bone-typing:blind', on ? '1' : '0');
    } catch {
      /* 무시 */
    }
  };
  // 학습 모드 (낱말만 · 고른 영역 전부 · 시간 기록) — 이 브라우저에 기억. 영역은 처음엔 전부 선택
  const [study, setStudyState] = useState(() => {
    try {
      return localStorage.getItem('bone-typing:study') === '1';
    } catch {
      return false;
    }
  });
  const setStudy = (on: boolean) => {
    setStudyState(on);
    try {
      localStorage.setItem('bone-typing:study', on ? '1' : '0');
    } catch {
      /* 무시 */
    }
  };
  const [parts, setParts] = useState<Record<Category, Part[]>>(() => ({bone: [...PARTS.bone], muscle: [...PARTS.muscle], nerve: [...PARTS.nerve]}));
  const [studyRes, setStudyRes] = useState<{result: Result; best: number | null; newBest: boolean} | null>(null);
  const [lang, setLang] = useState<Lang>(() => (ui === 'en' ? 'en' : 'ko'));
  const [kind, setKind] = useState<Kind>('word');
  const [nick, setNick] = useState(readNick);
  const [result, setResult] = useState<Result | null>(null);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'ok' | 'fail'>('idle');
  const [refresh, setRefresh] = useState(0);
  const [round, setRound] = useState(0);
  const [rank, setRank] = useState<number | null>(null);
  const [best, setBest] = useState(false);
  const [scoreId, setScoreId] = useState<number | null>(null);
  const [roundInfo, setRoundInfo] = useState<{round: string; items: string[]} | null>(null);
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
      setBlindState(m.blind);
    });
  }, []);
  // 블라인드는 낱말 연습에서만 (문장은 외워 칠 수 없음) — 켜 둔 설정은 낱말로 돌아오면 다시 적용
  const blindOn = blind && kind === 'word' && !study;
  // 곡: 학습 모드 = 로파이, 블라인드 = 살벌한 곡, 그 밖 = 칩튠
  useEffect(() => setTheme(study ? 'study' : blindOn ? 'blind' : 'normal'), [study, blindOn]);
  const fullPool = cat === 'muscle' ? MUSCLES : cat === 'nerve' ? NERVES : BONES;
  const studyPool = fullPool.filter((b) => parts[cat].includes(partOf(b, cat)));
  // 학습 모드 블라인드는 낱말에서만
  const studyBlind = blind && kind === 'word';
  const studyId = studyKey(cat, lang, term, parts[cat], studyBlind, kind);
  const studyBest = getBest(studyId);
  const togglePart = (p: Part) =>
    setParts((all) => {
      const cur = all[cat];
      const next = cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p];
      return next.length ? {...all, [cat]: next} : all; // 하나는 남김
    });

  const mode = modeOf(cat, lang, kind, blindOn);

  useEffect(() => preloadModels(cat === 'muscle' ? ['muscle_upper', 'muscle_lower', 'muscle_trunk', 'muscle_head'] : cat === 'nerve' ? ['nerve_upper', 'nerve_lower', 'nerve_spine', 'nerve_head'] : ['spine', 'arm', 'hand', 'pelvis', 'leg', 'foot', 'skull', 'thorax']), [cat]);

  const start = async () => {
    if (study) {
      if (!studyPool.length) return;
      initSound();
      startBgm();
      setStudyRes(null);
      setResult(null);
      setRoundInfo(null);
      setRound((r) => r + 1);
      setScreen('game');
      return;
    }
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
    // 서버에서 판(문제 목록) 받기 — 실패하면 랭킹 없이 연습만
    let r: {round: string; items: string[]} | null = null;
    try {
      r = await startRound(mode, term);
    } catch {
      r = null;
    }
    setRoundInfo(r);
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
      setCodeErr(t('code12'));
      return;
    }
    try {
      if ((await checkNickname(nick.trim(), code)) === 'mine') {
        setToken(nick.trim(), code);
        setNickTaken(false);
        setCodeInput('');
        start();
      } else setCodeErr(t('codeWrong'));
    } catch {
      setCodeErr(t('codeFail'));
    }
  };

  // 끝나면 게임 화면 위에 결과 팝업 (확인을 눌러야 메인으로)
  const done = async (res: Result) => {
    if (res.study) {
      const before = getBest(studyId);
      const newBest = saveBest(studyId, res.duration_ms);
      setStudyRes({result: res, best: before, newBest});
      return;
    }
    let r = res;
    setResult(r);
    setSaved('saving');
    try {
      const sv = await submitScore({nickname: nick, ...r}, getToken(nick), roundInfo?.round ?? null, r.errors ?? 0);
      if (sv) {
        // 화면 점수도 서버가 계산한 값으로
        r = {...r, cpm: sv.cpm, accuracy: sv.accuracy, score: sv.score, duration_ms: sv.duration_ms, review: sv.status === 'review'};
        setResult(r);
        setScoreId(sv.id);
      } else setScoreId(null);
      setSaved('ok');
      const top = await topScores(r.mode, 500);
      const i = top.findIndex((x) => x.nickname.toLowerCase() === nick.toLowerCase());
      setRank(i >= 0 ? i + 1 : null);
      setBest(i >= 0 && top[i].score === r.score);
    } catch (e) {
      const code = (e as {code?: string; message?: string}).code;
      const msg = (e as {message?: string}).message ?? '';
      setFailReason(
        code === '23514' || msg.includes('too fast')
          ? t('errFast')
          : msg.includes('bad round')
            ? t('errRound')
            : msg.includes('bad nickname')
              ? t('errNick')
              : msg.includes('too many')
                ? t('errMany')
                : msg.includes('nickname taken')
                  ? t('errTaken')
                  : '',
      );
      setClaimed(false);
      setSaved('fail');
    }
    setRefresh((x) => x + 1);
  };

  // 개발용: ?bone=<id> 로 뼈 하나만 띄워 3D 확인
  const peek = new URLSearchParams(location.search).get('bone');
  const peekBone = peek ? [...BONES, ...MUSCLES, ...NERVES].find((b) => b.id === peek) : null;
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
          <div className="og-desc">뼈 73개 · 근육 113개 · 신경 71개를 3D로 보며 타자 연습 · 랭킹 도전</div>
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
        {study ? (
          <Game key={round} cat={cat} pool={studyPool} lang={lang} kind={kind} term={term} blind={studyBlind} study onDone={done} onQuit={() => setScreen('title')} />
        ) : (
          <Game key={round} cat={cat} pool={fullPool} lang={lang} kind={kind} term={term} blind={blindOn} order={roundInfo?.items} onFirstKey={() => roundInfo && beginRound(roundInfo.round)} onDone={done} onQuit={() => setScreen('title')} />
        )}
        {studyRes ? (
          <StudyResult
            result={studyRes.result}
            label={[t(cat), lang === 'ko' ? t(term) : 'English', parts[cat].length === PARTS[cat].length ? t('scopeAll') : parts[cat].map((p) => partLabel(p, cat)).join('·'), t(kind), ...(studyBlind ? ['BLIND'] : [])].join(' · ')}
            best={studyRes.best}
            newBest={studyRes.newBest}
            onOk={() => {
              setStudyRes(null);
              setScreen('title');
            }}
            onAgain={start}
          />
        ) : null}
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
        <BoneStage items={cat === 'muscle' ? IDLE_MUSCLE : cat === 'nerve' ? IDLE_NERVE : IDLE} bad={false} bursts={[]} />
      </div>
      <div className={`title-panel ${study ? 'study' : ''}`}>
        {screen === 'title' ? (
          <>
            {/* 뼈쟁이 앱 안에서만: 게임 고르는 첫 화면으로 */}
            {import.meta.env.VITE_APP ? (
              <a className="app-home" href="/">
                ‹ {t('appHome')}
              </a>
            ) : null}
            {/* 화면 언어 */}
            <div className="ui-lang" role="group" aria-label="Language">
              {(['ko', 'en'] as Ui[]).map((u) => (
                <button
                  key={u}
                  className={ui === u ? 'on' : ''}
                  onClick={() => {
                    setUi(u);
                    setLang(u);
                  }}
                >
                  {u === 'ko' ? '한국어' : 'EN'}
                </button>
              ))}
            </div>
            <div className="logo">
              {t('logo1')}
              <br />
              <span className="logo-king">{t('logo2')}</span>
              <span className="logo-sub">{cat === 'muscle' ? 'BONE NAME TYPING · MUSCLE EDITION' : cat === 'nerve' ? 'BONE NAME TYPING · NERVE EDITION' : 'BONE NAME TYPING'}</span>
            </div>
            <div className="seg mode">
              <button className={!study ? 'on' : ''} onClick={() => setStudy(false)}>
                {t('modeRanked')}
              </button>
              <button className={study ? 'on' : ''} onClick={() => setStudy(true)}>
                {t('modeStudy')}
              </button>
            </div>
            {vs && !study ? <div className="vs">{t('vs', {n: vs.nickname, s: vs.score, m: modeLabel(vs.mode), r: vs.rank})}</div> : null}
            <div className="seg three">
              <button className={cat === 'bone' ? 'on' : ''} onClick={() => setCat('bone')}>
                {t('bone')}
              </button>
              <button className={cat === 'muscle' ? 'on' : ''} onClick={() => setCat('muscle')}>
                {t('muscle')}
              </button>
              <button className={cat === 'nerve' ? 'on' : ''} onClick={() => setCat('nerve')}>
                {t('nerve')}
              </button>
            </div>
            <div className="seg">
              <button className={lang === 'ko' ? 'on' : ''} onClick={() => setLang('ko')}>
                {t('langKo')}
              </button>
              <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>
                English
              </button>
            </div>
            {lang === 'en' ? <div className="note">{t('caseNote')}</div> : null}
            {lang === 'ko' ? (
              <div className="seg term">
                <button className={term === 'hanja' ? 'on' : ''} onClick={() => setTerm('hanja')}>
                  {t('hanja')} <small>쇄골</small>
                </button>
                <button className={term === 'native' ? 'on' : ''} onClick={() => setTerm('native')}>
                  {t('native')} <small>빗장뼈</small>
                </button>
              </div>
            ) : null}
            {study ? (
              <>
                <div className="seg">
                  <button className={kind === 'word' ? 'on' : ''} onClick={() => setKind('word')}>
                    {t('word')}
                  </button>
                  <button className={kind === 'sentence' ? 'on' : ''} onClick={() => setKind('sentence')}>
                    {t('sentence')}
                  </button>
                </div>
                <div className="note study-note">{t('studyNote')}</div>
                <div className="parts" role="group" aria-label={t('studyParts')}>
                  {PARTS[cat].map((p) => {
                    const n = fullPool.filter((b) => partOf(b, cat) === p).length;
                    const on = parts[cat].includes(p);
                    return (
                      <button key={p} className={on ? 'on' : ''} aria-pressed={on} onClick={() => togglePart(p)}>
                        <span className="part-check">{on ? '✓' : ''}</span>
                        {partLabel(p, cat)}
                        <small>{n}</small>
                      </button>
                    );
                  })}
                </div>
                <button className={`blind-toggle ${studyBlind ? 'on' : ''}`} onClick={() => setBlind(!blind)} role="switch" aria-checked={studyBlind} disabled={kind !== 'word'}>
                  <span className="blind-knob" />
                  <span className="blind-text">
                    <b>{t('blind')}</b>
                    <small>{kind === 'word' ? t('blindSub') : t('blindWordOnly')}</small>
                  </span>
                </button>
                {kind === 'sentence' && (
                  <div className="study-pick">
                    {t('studyPick', {total: studyPool.reduce((s, b) => s + 1 + (MORE[b.id]?.length ?? 0), 0).toLocaleString(), n: studyPool.length})}
                  </div>
                )}
                <button className="start" onClick={start}>
                  {t('studyStart', {n: studyPool.length})}
                </button>
                <div className="study-best">
                  {t('studyBest')} <b>{studyBest != null ? formatTime(studyBest) : '—'}</b>
                </div>
                <SoundToggle />
              </>
            ) : (
              <>
            <div className="seg">
              <button className={kind === 'word' ? 'on' : ''} onClick={() => setKind('word')}>
                {t('word')}
              </button>
              <button className={kind === 'sentence' ? 'on' : ''} onClick={() => setKind('sentence')}>
                {t('sentence')}
              </button>
            </div>
            <button className={`blind-toggle ${blindOn ? 'on' : ''}`} onClick={() => setBlind(!blind)} role="switch" aria-checked={blindOn} disabled={kind !== 'word'}>
              <span className="blind-knob" />
              <span className="blind-text">
                <b>{t('blind')}</b>
                <small>{kind === 'word' ? t('blindSub') : t('blindWordOnly')}</small>
              </span>
            </button>
            <input
              className="nick-input"
              placeholder={t('nickPh')}
              name="bone-nickname"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-form-type="other"
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
                <div>{t('taken', {n: nick.trim()})}</div>
                <div className="claim-row">
                  <input
                    className="nick-input"
                    placeholder={t('codePh')}
                    value={codeInput}
                    onChange={(e) => {
                      setCodeInput(e.target.value);
                      setCodeErr('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && recover()}
                  />
                  <button className="ghost-btn" onClick={recover}>
                    {t('ok')}
                  </button>
                </div>
                {codeErr ? <div className="claim-err">{codeErr}</div> : null}
              </div>
            ) : null}
            <button className="start" disabled={!nick.trim() || checking} onClick={start}>
              {checking ? t('checking') : t('start')}
            </button>
            {isShared() && nick.trim() && getToken(nick) && !nickTaken ? (
              <button className="link-btn" onClick={() => setShowCode((x) => !x)}>
                {showCode ? `${t('codeIs')} ${formatCode(getToken(nick)!)}` : t('showCode')}
              </button>
            ) : null}
            <SoundToggle />
            <Board mode={mode} me={nick} refresh={refresh} />
              </>
            )}
          </>
        ) : null}
        <div className="credit">
          {t('credit')} · made by <a className="credit-link" href="https://www.instagram.com/iamnotwoodz/" target="_blank" rel="noopener noreferrer" onClick={() => logClick('follow_title')}>@iamnotwoodz</a>
          {' · '}<a className="credit-link" href="https://github.com/sy059922/bone-typing" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
      </div>
    </div>
  );
}
