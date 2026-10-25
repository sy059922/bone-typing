import confetti from 'canvas-confetti';
import {useEffect, useRef, useState} from 'react';
import type {Result} from '../Game';
import {modeLabel} from '../lib/modes';
import {t} from '../lib/i18n';
import {logClick} from '../lib/ranking';
import {canSystemShare, copyResult, downloadCard, systemShare} from '../lib/share';
import {formatTime} from '../lib/study';


// 무채색 폭죽 — 흰색·뼈색·회색 조각
const COLORS = ['#FFFFFF', '#F7F5F0', '#D4D4D4', '#9A9A9A', '#5C5C5C'];

const celebrate = () => {
  const end = performance.now() + 1400;
  const side = () => {
    confetti({particleCount: 7, angle: 60, spread: 70, startVelocity: 62, origin: {x: 0, y: 0.75}, colors: COLORS, scalar: 1.1, zIndex: 50});
    confetti({particleCount: 7, angle: 120, spread: 70, startVelocity: 62, origin: {x: 1, y: 0.75}, colors: COLORS, scalar: 1.1, zIndex: 50});
    if (performance.now() < end) requestAnimationFrame(side);
  };
  confetti({particleCount: 140, spread: 100, startVelocity: 48, origin: {x: 0.5, y: 0.42}, colors: COLORS, scalar: 1.2, zIndex: 50});
  side();
};

export const ResultModal: React.FC<{
  result: Result;
  nick: string;
  saved: 'idle' | 'saving' | 'ok' | 'fail';
  rank: number | null;
  scoreId: number | null;
  failReason?: string;
  claimCode?: string;
  best: boolean;
  onOk: () => void;
  onAgain: () => void;
}> = ({result, nick, saved, rank, scoreId, failReason, claimCode, best, onOk, onAgain}) => {
  const [shown, setShown] = useState(0);
  const [toast, setToast] = useState('');
  const armed = useRef(false);
  const okBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    celebrate();
    // 점수 올라가는 연출
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / 900);
      setShown(Math.round(result.score * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // 마지막 확정 키(엔터)가 바로 '확인'을 누르지 않게 잠깐 잠금
    const arm = setTimeout(() => {
      armed.current = true;
      okBtn.current?.focus();
    }, 900);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(arm);
    };
  }, [result.score]);

  const [sharing, setSharing] = useState(false);
  const say = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 3000);
  };
  const doSystem = async () => {
    logClick('share_system');
    const r = await systemShare(result, nick, rank, scoreId);
    if (r === 'failed') say(t('shareFail'));
  };
  const doCopy = async () => {
    logClick('share_copy');
    say((await copyResult(result, nick, rank, scoreId)) ? t('copied') : t('copyBlocked'));
  };
  const doSave = async () => {
    logClick('share_image');
    await downloadCard(result, nick, rank);
    say(t('imgSaved'));
  };

  return (
    <div className="modal-back" onKeyDown={(e) => e.key === 'Escape' && armed.current && onOk()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={t('resultAria')}>
        <div className="modal-head">
          <span>{modeLabel(result.mode)}</span>
          <span>{nick}</span>
        </div>
        {best ? <div className="modal-best">NEW BEST</div> : null}
        <div className="modal-score">{shown}</div>
        <div className="modal-sub">{t('formula')}{result.passes ? t('passes', {n: result.passes}) : ''}</div>
        <div className="result-grid">
          <div>
            <b>{result.cpm}</b>
            <span>{result.mode.includes('ko-') ? t('cpm') : 'CPM'}</span>
          </div>
          <div>
            <b>{result.accuracy.toFixed(1)}%</b>
            <span>{t('acc')}</span>
          </div>
          <div>
            <b>{(result.duration_ms / 1000).toFixed(1)}s</b>
            <span>{t('time')}</span>
          </div>
        </div>
        <div className="modal-rank">
          {saved === 'saving' ? t('saving') : saved === 'fail' ? failReason || t('saveFail') : result.review ? t('review') : rank ? (
            <>
              {t('rankPre')}
              <b>{rank}</b>
              {t('rankPost')}
            </>
          ) : (
            t('savedOk')
          )}
        </div>
        {/* 게임 유입 → 인스타 팔로우 */}
        <a className="follow" href="https://www.instagram.com/iamnotwoodz/" target="_blank" rel="noopener noreferrer" onClick={() => logClick('follow')}>
          <span className="follow-handle">@iamnotwoodz</span>
          <span className="follow-text">{t('follow')}</span>
          <span className="follow-arrow">→</span>
        </a>
        {claimCode ? (
          <div className="claim">
            <div>
              {t('claimed', {n: nick})}
            </div>
            <div className="claim-row">
              <code className="claim-code">{claimCode}</code>
              <button className="ghost-btn" onClick={() => navigator.clipboard.writeText(claimCode).then(() => say(t('codeCopied')), () => say(t('copyBlocked')))}>
                {t('copy')}
              </button>
            </div>
          </div>
        ) : null}
        <div className="modal-btns">
          <button className={`ghost-btn ${sharing ? 'on' : ''}`} onClick={() => setSharing((x) => !x)}>
            {t('share')}
          </button>
          <button className="ghost-btn" onClick={() => armed.current && onAgain()}>
            {t('again')}
          </button>
          <button ref={okBtn} className="start" onClick={() => armed.current && onOk()}>
            {t('ok')}
          </button>
        </div>
        {sharing ? (
          <div className="share-row">
            {canSystemShare() ? (
              <button className="ghost-btn" onClick={doSystem}>
                {t('shareSys')}
              </button>
            ) : null}
            <button className="ghost-btn" onClick={doCopy}>
              {t('shareCopy')}
            </button>
            <button className="ghost-btn" onClick={doSave}>
              {t('shareImg')}
            </button>
          </div>
        ) : null}
        {toast ? <div className="modal-toast">{toast}</div> : null}
      </div>
    </div>
  );
};

// 학습 모드 결과: 걸린 시간 (스톱워치) · 이 기기 최고 기록
export const StudyResult: React.FC<{result: Result; label: string; best: number | null; newBest: boolean; onOk: () => void; onAgain: () => void}> = ({
  result,
  label,
  best,
  newBest,
  onOk,
  onAgain,
}) => {
  const [armed, setArmed] = useState(false);
  const okBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    celebrate();
    // 마지막 확정 키(엔터)가 바로 버튼을 누르지 않게 잠깐 잠금
    const arm = setTimeout(() => {
      setArmed(true);
      okBtn.current?.focus();
    }, 900);
    return () => clearTimeout(arm);
  }, []);
  const st = result.study ?? {misses: 0, rounds: 1};
  return (
    <div className="modal-back" role="dialog" aria-label={t('resultAria')}>
      <div className="modal study-result">
        <div className="modal-head">
          <span>{t('studyDone')}</span>
          <span>{label}</span>
        </div>
        {newBest ? <div className="modal-best">{t('newBest')}</div> : null}
        <div className="modal-score">{formatTime(result.duration_ms)}</div>
        <div className="modal-sub">{t('studySub', {n: result.items, m: st.misses, r: st.rounds})}</div>
        <div className="modal-rank">
          {st.misses === 0 ? t('studyPerfect') : null}
          {best != null && !newBest ? (
            <>
              {t('studyBest')} <b>{formatTime(best)}</b>
            </>
          ) : null}
        </div>
        <div className="modal-btns study-btns">
          <button className="ghost-btn" onClick={() => armed && onOk()}>
            {t('toTitle')}
          </button>
          <button ref={okBtn} className="start" onClick={() => armed && onAgain()}>
            {t('again')}
          </button>
        </div>
      </div>
    </div>
  );
};
