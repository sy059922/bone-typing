import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import {renderDemo} from './lib/sound'

// 개발용: 소리 미리듣기 WAV 생성기
if (import.meta.env.DEV) (window as unknown as {renderDemo: typeof renderDemo}).renderDemo = renderDemo

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
