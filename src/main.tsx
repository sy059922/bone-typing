import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 글꼴은 직접 담아 둠 (Google Fonts 없이 오프라인에서도 같은 모양)
import '@fontsource-variable/noto-sans-kr'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import App from './App.tsx'
import {Analytics} from '@vercel/analytics/react'
import {renderDemo, renderTrack} from './lib/sound'

// 개발용: 소리 미리듣기 WAV 생성기
if (import.meta.env.DEV) Object.assign(window, {renderDemo, renderTrack})

// 화면 키보드가 올라오면 보이는 높이만큼만 쓰게 (--app-h). 아이폰은 레이아웃 높이가 안 줄어서 직접 맞춤
const vv = window.visualViewport;
const syncHeight = () => {
  document.documentElement.style.setProperty('--app-h', `${Math.round(vv ? vv.height : window.innerHeight)}px`);
  // 게임 중에만: 화면 키보드 때문에 페이지가 밀리면 원위치 (타이틀 화면은 자유롭게 스크롤)
  if (vv && vv.offsetTop > 0 && document.documentElement.classList.contains('in-game')) window.scrollTo(0, 0);
};
syncHeight();
vv?.addEventListener('resize', syncHeight);
vv?.addEventListener('scroll', syncHeight);
window.addEventListener('resize', syncHeight);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {import.meta.env.VITE_APP ? null : <Analytics />}
  </StrictMode>,
)
