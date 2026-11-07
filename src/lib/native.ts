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

// 아이폰 Duo 를 반쯤 접으면 (앱 안 Fold 플러그인 → iOS 27.1 접힘 영역)
//   <html class="fold-book">   책처럼 좌우로 접힘 (세로 접힘 줄)
//   <html class="fold-laptop"> 노트북처럼 위아래로 접힘 (가로 접힘 줄)
//   --fold-a / --fold-b = 접힘 줄이 시작·끝나는 자리 (그 축의 px). 앞 화면 = 0~a, 뒤 화면 = b~끝
// 바뀔 때마다 resize 와 'bonegeek:fold' 이벤트를 쏴서 캔버스·레이아웃이 다시 잼
type Fold = {posture: string; axis?: 'book' | 'laptop'; x?: number; y?: number; width?: number; height?: number};
export function watchFold() {
  const f = plugin('Fold');
  if (!f) return;
  const apply = (s: Fold) => {
    const el = document.documentElement;
    el.classList.remove('fold-book', 'fold-laptop');
    if (s.posture === 'folded' && s.axis) {
      const book = s.axis === 'book';
      const a = book ? s.x! : s.y!;
      el.classList.add(book ? 'fold-book' : 'fold-laptop');
      el.style.setProperty('--fold-a', `${a}px`);
      el.style.setProperty('--fold-b', `${a + (book ? s.width! : s.height!)}px`);
    }
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('bonegeek:fold'));
  };
  f.get().then((s) => apply(s as Fold), () => undefined);
  (f as unknown as {addListener?: (e: string, cb: (s: Fold) => void) => unknown}).addListener?.('change', apply);
}
export const foldBook = () => document.documentElement.classList.contains('fold-book');
