import {ImageResponse} from '@vercel/og';
import React from 'react';
import {getScore, MODE_KO} from './_score.js';

// 공유 링크 썸네일 (1200×630) — 그 기록의 닉네임·점수·타수·정확도·순위를 그 자리에서 그림

// 필요한 글자만 담은 글꼴을 Google Fonts 에서 받아 옴 (한글 전체 글꼴은 너무 커서)
async function font(family: string, weight: number, text: string): Promise<ArrayBuffer> {
  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`, {
      headers: {'User-Agent': 'Mozilla/4.0'}, // 옛 브라우저로 보이면 ttf 를 줌 (satori 는 woff2 못 읽음)
    })
  ).text();
  const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype|woff)'\)/)?.[1];
  if (!src) throw new Error(`font not found: ${family}`);
  return (await fetch(src)).arrayBuffer();
}

// Node 런타임 (웹 표준 Request/Response 처리기) — @vercel/og 1.x 는 엣지에서 안 됨
export async function GET(req: Request) {
  const u = new URL(req.url);
  const s = await getScore(u.searchParams.get('id'));
  if (!s) return Response.redirect(`${u.origin}/og.png`, 302);

  const stats: [string, string][] = [
    [String(s.cpm), s.mode.startsWith('ko') ? '타수' : 'CPM'],
    [`${s.accuracy.toFixed(1)}%`, '정확도'],
    [`${s.rank}위`, '전체 순위'],
  ];
  const krText = `뼈이름으로타자연습${s.nickname}${MODE_KO[s.mode]}님의기록이에도전해보세요타수정확도전체순위위·`;
  const monoText = `0123456789.%,CPMBONENAMETYPINGbone-typing.vercelapp@iamnotwoodz${s.nickname}`;
  const [kr900, kr500, mono] = await Promise.all([
    font('Noto+Sans+KR', 900, krText),
    font('Noto+Sans+KR', 500, krText),
    font('JetBrains+Mono', 700, monoText),
  ]);

  // JSX 없이 요소 만들기 (Vercel 함수 컴파일 설정과 무관하게)
  const h = (style: Record<string, unknown>, ...children: React.ReactNode[]) => React.createElement('div', {style}, ...children);
  const card = React.createElement(
    'div',
    {style: {width: '100%', height: '100%', display: 'flex', background: '#0D0D0D', color: '#EDEDED', fontFamily: 'Kr'}},
    h(
      {display: 'flex', flexDirection: 'column', padding: '52px 0 0 80px', width: 700},
      h({fontFamily: 'Mono', fontSize: 22, letterSpacing: 4, color: '#5C5C5C'}, 'BONE NAME TYPING'),
      h({fontSize: 40, fontWeight: 900, marginTop: 10, color: '#FFFFFF'}, '뼈이름으로 타자연습'),
      h({fontSize: 34, fontWeight: 500, marginTop: 44, color: '#9A9A9A'}, `${s.nickname}님의 기록 · ${MODE_KO[s.mode]}`),
      h({fontFamily: 'Mono', fontSize: 170, lineHeight: 1, marginTop: 10, color: '#FFFFFF', letterSpacing: -6}, String(s.score)),
      h(
        {display: 'flex', marginTop: 34},
        ...stats.map(([v, k]) =>
          h(
            {display: 'flex', flexDirection: 'column', border: '2px solid #262626', padding: '16px 22px', marginRight: 14, width: 190},
            h({fontFamily: 'Mono', fontSize: 40, color: '#EDEDED'}, v),
            h({fontSize: 22, fontWeight: 500, color: '#5C5C5C', marginTop: 4}, k),
          ),
        ),
      ),
      h({fontSize: 26, fontWeight: 500, marginTop: 24, color: '#EDEDED'}, '이 기록에 도전해 보세요 · bone-typing.vercel.app'),
    ),
    React.createElement('img', {src: `${u.origin}/og-bone.png`, width: 500, height: 562, style: {marginTop: 34}}),
  );

  return new ImageResponse(
    card,
    {
      width: 1200,
      height: 630,
      fonts: [
        {name: 'Kr', data: kr900, weight: 900, style: 'normal'},
        {name: 'Kr', data: kr500, weight: 500, style: 'normal'},
        {name: 'Mono', data: mono, weight: 700, style: 'normal'},
      ],
      headers: {'cache-control': 'public, max-age=300, s-maxage=86400'},
    },
  );
}
