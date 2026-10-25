import type {Result} from '../Game';
import {modeShort, parseMode} from './modes';
import {getUi} from './i18n';

export const SITE = 'https://bone-typing.vercel.app';


// 기록 번호가 있으면 그 기록 썸네일이 뜨는 공유 링크
export const shareUrl = (id: number | null) => (id ? `${SITE}/r/${id}` : SITE);

export const shareText = (r: Result, nick: string, rank: number | null, id: number | null = null) =>
  getUi() === 'en'
    ? `🦴 Bone Typing${{muscle: ' · Muscles', nerve: ' · Nerves', bone: ''}[parseMode(r.mode).cat]}\n${nick} · ${modeShort(r.mode)} ${r.score} pts (${r.cpm} CPM · ${r.accuracy.toFixed(1)}%)${rank ? ` · #${rank}` : ''}\nCan you beat it? 👉 ${shareUrl(id)}`
    : `🦴 뼈쟁이 타자연습${{muscle: ' · 근육편', nerve: ' · 신경편', bone: ''}[parseMode(r.mode).cat]}\n${nick} · ${modeShort(r.mode)} ${r.score}점 (${r.cpm}타 · 정확도 ${r.accuracy.toFixed(1)}%)${rank ? ` · 전체 ${rank}위` : ''}\n나도 도전하기 👉 ${shareUrl(id)}`;

// 결과 카드 그림 (1080×1350, 인스타·카톡 공유용) — 게임과 같은 무채색
export async function resultCard(r: Result, nick: string, rank: number | null): Promise<Blob> {
  await document.fonts.ready;
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0D0D0D';
  g.fillRect(0, 0, W, H);
  // 옅은 격자
  g.strokeStyle = 'rgba(255,255,255,0.04)';
  for (let x = 0; x < W; x += 60) g.strokeRect(x, 0, 0, H);
  for (let y = 0; y < H; y += 60) g.strokeRect(0, y, W, 0);
  const sans = "'Noto Sans KR', sans-serif";
  const mono = "'JetBrains Mono', monospace";
  g.fillStyle = '#5C5C5C';
  g.font = `400 30px ${mono}`;
  g.fillText('BONE NAME TYPING', 90, 140);
  g.fillStyle = '#EDEDED';
  g.font = `900 84px ${sans}`;
  g.fillText(getUi() === 'en' ? 'Bone' : '뼈쟁이', 90, 250);
  g.fillStyle = '#FFFFFF';
  g.fillText(getUi() === 'en' ? 'Typing' : '타자연습', 90, 350);
  g.fillStyle = '#9A9A9A';
  g.font = `500 40px ${sans}`;
  g.fillText(`${nick} · ${modeShort(r.mode)}`, 90, 500);
  g.fillStyle = '#FFFFFF';
  g.font = `700 260px ${mono}`;
  g.fillText(String(r.score), 80, 760);
  g.fillStyle = '#5C5C5C';
  g.font = `400 30px ${mono}`;
  g.fillText('SCORE = CPM × ACCURACY²', 90, 820);
  // 숫자 셋
  const stats: [string, string][] = [
    [String(r.cpm), r.mode.includes('ko-') && getUi() === 'ko' ? '타수' : 'CPM'],
    [`${r.accuracy.toFixed(1)}%`, getUi() === 'en' ? 'Accuracy' : '정확도'],
    [rank ? (getUi() === 'en' ? `#${rank}` : `${rank}위`) : '—', getUi() === 'en' ? 'Overall rank' : '전체 순위'],
  ];
  stats.forEach(([v, k], i) => {
    const x = 90 + i * 310;
    g.strokeStyle = '#262626';
    g.lineWidth = 2;
    g.strokeRect(x, 900, 280, 180);
    g.fillStyle = '#EDEDED';
    g.font = `700 64px ${mono}`;
    g.fillText(v, x + 26, 1000);
    g.fillStyle = '#5C5C5C';
    g.font = `500 30px ${sans}`;
    g.fillText(k, x + 26, 1050);
  });
  g.fillStyle = '#9A9A9A';
  g.font = `400 32px ${mono}`;
  g.fillText(SITE.replace('https://', ''), 90, 1240);
  g.fillStyle = '#5C5C5C';
  g.font = `400 28px ${mono}`;
  g.fillText('@iamnotwoodz', W - 90 - g.measureText('@iamnotwoodz').width, 1240);
  return new Promise((res) => c.toBlob((b) => res(b!), 'image/png'));
}

export const canSystemShare = () => typeof navigator.share === 'function';

// 시스템 공유창 (폰: 카카오톡·인스타·메시지 … / 맥: 메시지·AirDrop …) — 링크를 보내면 받는 쪽에 내 기록 썸네일이 뜸
export async function systemShare(r: Result, nick: string, rank: number | null, id: number | null): Promise<'shared' | 'cancelled' | 'failed'> {
  try {
    await navigator.share({title: getUi() === 'en' ? `${nick} · ${r.score} pts · Bone Typing` : `${nick}님 ${r.score}점 · 뼈쟁이 타자연습`, text: shareText(r, nick, rank, null).split('\n').slice(0, 2).join('\n'), url: shareUrl(id)});
    return 'shared';
  } catch (e) {
    return (e as DOMException).name === 'AbortError' ? 'cancelled' : 'failed';
  }
}

export async function copyResult(r: Result, nick: string, rank: number | null, id: number | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(shareText(r, nick, rank, id));
    return true;
  } catch {
    return false;
  }
}

export async function downloadCard(r: Result, nick: string, rank: number | null) {
  const blob = await resultCard(r, nick, rank);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bone-typing-result.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
