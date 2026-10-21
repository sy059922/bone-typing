import confetti from 'canvas-confetti';
import {useEffect, useRef, useState} from 'react';
import type {Result} from '../Game';
import {canSystemShare, copyResult, downloadCard, systemShare} from '../lib/share';

const MODE_LABEL: Record<string, string> = {
  'ko-word': '한글 · 낱말',
  'ko-sentence': '한글 · 문장',
  'en-word': 'English · Word',
  'en-sentence': 'English · Sentence',
};

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
  best: boolean;
  onOk: () => void;
  onAgain: () => void;
}> = ({result, nick, saved, rank, scoreId, failReason, best, onOk, onAgain}) => {
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
    const r = await systemShare(result, nick, rank, scoreId);
    if (r === 'failed') say('공유창을 열 수 없어요. 결과 복사나 이미지 저장을 써 주세요.');
  };
  const doCopy = async () => say((await copyResult(result, nick, rank, scoreId)) ? '결과를 복사했어요. 카카오톡 대화창에 붙여 넣어 보세요.' : '복사가 막혀 있어요.');
  const doSave = async () => {
    await downloadCard(result, nick, rank);
    say('결과 카드 이미지를 저장했어요.');
  };

  return (
    <div className="modal-back" onKeyDown={(e) => e.key === 'Escape' && armed.current && onOk()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="게임 결과">
        <div className="modal-head">
          <span>{MODE_LABEL[result.mode]}</span>
          <span>{nick}</span>
        </div>
        {best ? <div className="modal-best">NEW BEST</div> : null}
        <div className="modal-score">{shown}</div>
        <div className="modal-sub">점수 = 타수 × 정확도²</div>
        <div className="result-grid">
          <div>
            <b>{result.cpm}</b>
            <span>{result.mode.startsWith('ko') ? '타수' : 'CPM'}</span>
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
        <div className="modal-rank">
          {saved === 'saving' ? '랭킹에 올리는 중…' : saved === 'fail' ? failReason || '랭킹 저장에 실패했어요' : rank ? (
            <>
              전체 <b>{rank}</b>위
            </>
          ) : (
            '랭킹에 올렸어요'
          )}
        </div>
        <div className="modal-btns">
          <button className={`ghost-btn ${sharing ? 'on' : ''}`} onClick={() => setSharing((x) => !x)}>
            공유하기
          </button>
          <button className="ghost-btn" onClick={() => armed.current && onAgain()}>
            다시 하기
          </button>
          <button ref={okBtn} className="start" onClick={() => armed.current && onOk()}>
            확인
          </button>
        </div>
        {sharing ? (
          <div className="share-row">
            {canSystemShare() ? (
              <button className="ghost-btn" onClick={doSystem}>
                카카오톡 · 공유창
              </button>
            ) : null}
            <button className="ghost-btn" onClick={doCopy}>
              결과 복사
            </button>
            <button className="ghost-btn" onClick={doSave}>
              이미지 저장
            </button>
          </div>
        ) : null}
        {toast ? <div className="modal-toast">{toast}</div> : null}
      </div>
    </div>
  );
};
