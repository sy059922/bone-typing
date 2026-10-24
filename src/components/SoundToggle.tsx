import {useState} from 'react';
import {t} from '../lib/i18n';
import {initSound, setPref, soundPrefs, startBgm} from '../lib/sound';

// 배경음 · 효과음 켜고 끄기 (이 브라우저에 기억)
export const SoundToggle: React.FC = () => {
  const [p, setP] = useState(soundPrefs);
  const flip = (k: 'bgm' | 'sfx') => {
    initSound();
    startBgm();
    setPref(k, !p[k]);
    setP(soundPrefs());
  };
  return (
    <div className="sound-toggle">
      <button className={p.bgm ? 'on' : ''} onClick={() => flip('bgm')} title={t('bgmTitle')}>
        BGM {p.bgm ? 'ON' : 'OFF'}
      </button>
      <button className={p.sfx ? 'on' : ''} onClick={() => flip('sfx')} title={t('sfxTitle')}>
        SFX {p.sfx ? 'ON' : 'OFF'}
      </button>
    </div>
  );
};
