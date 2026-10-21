import {getScore, MODE_KO} from './_score.js';

// 공유 링크 /r/<id> — 카톡·SNS 가 읽을 미리보기 태그(그 사람의 기록 썸네일)를 주고, 사람은 메인으로 보냄
export const config = {runtime: 'edge'};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]!);

export default async function handler(req: Request) {
  const u = new URL(req.url);
  const id = u.searchParams.get('id');
  const s = await getScore(id);
  const origin = u.origin;
  const title = s ? `${s.nickname}님 ${s.score}점 · 뼈이름으로 타자연습` : '뼈이름으로 타자연습';
  const desc = s
    ? `${MODE_KO[s.mode]} ${s.cpm}타 · 정확도 ${s.accuracy.toFixed(1)}% · 전체 ${s.rank}위. 이 기록에 도전해 보세요!`
    : '척추·팔·다리 뼈 48개를 3D로 보며 타자 연습. 랭킹에 도전해 보세요!';
  const image = s ? `${origin}/api/og?id=${id}` : `${origin}/og.png`;
  const dest = s ? `/?vs=${id}` : '/';
  const html = `<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta property="og:type" content="website" />
<meta property="og:url" content="${origin}/r/${s ? id : ''}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:image" content="${image}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<style>body{background:#0d0d0d;color:#ededed;font-family:sans-serif;display:grid;place-items:center;height:100vh;margin:0}a{color:#fff}</style>
<script>location.replace(${JSON.stringify(dest)})</script>
</head><body><a href="${dest}">뼈이름으로 타자연습 열기</a></body></html>`;
  return new Response(html, {
    headers: {'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300, s-maxage=86400'},
  });
}
