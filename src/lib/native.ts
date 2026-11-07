// 뼈쟁이 앱(Capacitor) 안에서만 쓰는 기기 기능: 진동 · 공유창. 웹에서는 모두 아무것도 안 함
type Plugin = Record<string, (o?: object) => Promise<unknown>>;
type Cap = {isNativePlatform?: () => boolean; Plugins?: Record<string, Plugin>; registerPlugin?: (n: string) => Plugin};
const cap = (window as unknown as {Capacitor?: Cap}).Capacitor;
const native = !!cap?.isNativePlatform?.();
const plugin = (n: string): Plugin | null => (native ? (cap!.Plugins?.[n] ?? cap!.registerPlugin?.(n) ?? null) : null);

export const isApp = () => native;

// 진동 — 첫 화면에서 끌 수 있음 (bonegeek:haptics = '0')
export type Buzz = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
let last = 0;
export function buzz(k: Buzz) {
  const h = plugin('Haptics');
  if (!h) return;
  try {
    if (localStorage.getItem('bonegeek:haptics') === '0') return;
  } catch {
    /* 무시 */
  }
  const t = performance.now();
  if (t - last < 45) return; // 너무 잦으면 뭉개져서 한 번만
  last = t;
  const p = k === 'success' || k === 'warning' || k === 'error' ? h.notification({type: k.toUpperCase()}) : h.impact({style: k.toUpperCase()});
  p.catch(() => undefined);
}

// 기기 공유창 (안드로이드 웹뷰엔 navigator.share 가 없음) — 앱이 아니면 null
export async function appShare(o: {title?: string; text?: string; url?: string}): Promise<'shared' | 'cancelled' | null> {
  const s = plugin('Share');
  if (!s) return null;
  try {
    await s.share(o);
    return 'shared';
  } catch {
    return 'cancelled';
  }
}

// 그림 공유: 앱 임시 폴더에 PNG 로 저장한 뒤 공유창 (웹뷰는 a.download 가 안 됨)
export async function appShareImage(blob: Blob, name: string): Promise<'shared' | 'cancelled' | null> {
  const s = plugin('Share');
  const fs = plugin('Filesystem');
  if (!s || !fs) return null;
  const data = await new Promise<string>((ok, no) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1]);
    r.onerror = no;
    r.readAsDataURL(blob);
  });
  const {uri} = (await fs.writeFile({path: name, data, directory: 'CACHE'})) as {uri: string};
  try {
    await s.share({files: [uri]});
    return 'shared';
  } catch {
    return 'cancelled';
  }
}
