import type {Result} from '../Game';

export const SITE = 'https://bone-typing.vercel.app';

const MODE_KO: Record<string, string> = {
  'ko-word': '한글 낱말',
  'ko-sentence': '한글 문장',
  'en-word': '영어 낱말',
  'en-sentence': '영어 문장',
};

export const shareText = (r: Result, nick: string, rank: number | null) =>
  `🦴 뼈이름으로 타자연습\n${nick} · ${MODE_KO[r.mode]} ${r.score}점 (${r.cpm}타 · 정확도 ${r.accuracy.toFixed(1)}%)${rank ? ` · 전체 ${rank}위` : ''}\n나도 도전하기 👉 ${SITE}`;

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
  g.fillText('뼈이름으로', 90, 250);
  g.fillStyle = '#FFFFFF';
  g.fillText('타자연습', 90, 350);
  g.fillStyle = '#9A9A9A';
  g.font = `500 40px ${sans}`;
  g.fillText(`${nick} · ${MODE_KO[r.mode]}`, 90, 500);
  g.fillStyle = '#FFFFFF';
  g.font = `700 260px ${mono}`;
  g.fillText(String(r.score), 80, 760);
  g.fillStyle = '#5C5C5C';
  g.font = `400 30px ${mono}`;
  g.fillText('SCORE = CPM × ACCURACY²', 90, 820);
  // 숫자 셋
  const stats: [string, string][] = [
    [String(r.cpm), r.mode.startsWith('ko') ? '타수' : 'CPM'],
    [`${r.accuracy.toFixed(1)}%`, '정확도'],
    [rank ? `${rank}위` : '—', '전체 순위'],
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

// 시스템 공유창 (폰: 카카오톡·인스타·메시지 … / 맥: 메시지·AirDrop …) — 카드 그림 + 글
export async function systemShare(r: Result, nick: string, rank: number | null): Promise<'shared' | 'cancelled' | 'failed'> {
  const text = shareText(r, nick, rank);
  const nav = navigator as Navigator & {canShare?: (d: ShareData) => boolean};
  try {
    const file = new File([await resultCard(r, nick, rank)], 'bone-typing-result.png', {type: 'image/png'});
    if (nav.canShare?.({files: [file]})) await nav.share({files: [file], text, title: '뼈이름으로 타자연습'});
    else await nav.share({text, title: '뼈이름으로 타자연습', url: SITE});
    return 'shared';
  } catch (e) {
    return (e as DOMException).name === 'AbortError' ? 'cancelled' : 'failed';
  }
}

export async function copyResult(r: Result, nick: string, rank: number | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(shareText(r, nick, rank));
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
