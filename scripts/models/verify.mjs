// GLB 검증: three.js GLTFLoader + MeshoptDecoder 로 읽어 노드 이름·좌우 방향을 확인하고,
// 소프트웨어 래스터라이저로 미리보기 PNG 를 만든다.
//   node verify.mjs <models 폴더> [미리보기 PNG 출력 폴더]
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { PNG } from 'pngjs';

const [modelDir, previewDir] = process.argv.slice(2);
const manifest = JSON.parse(fs.readFileSync(path.join(modelDir, 'manifest.json'), 'utf8'));

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
await MeshoptDecoder.ready;

function load(file) {
  const buf = fs.readFileSync(file);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise((res, rej) => loader.parse(ab, '', res, rej));
}

const EXPECT = {
  spine: [...Array(7)].map((_, i) => `C${i + 1}`).concat([...Array(12)].map((_, i) => `T${i + 1}`), [...Array(5)].map((_, i) => `L${i + 1}`), ['sacrum', 'coccyx']),
  arm: ['clavicle', 'scapula', 'humerus', 'radius', 'ulna'],
  hand: ['scaphoid', 'lunate', 'triquetrum', 'pisiform', 'trapezium', 'trapezoid', 'capitate', 'hamate',
    ...[1, 2, 3, 4, 5].map((i) => `mc${i}`), ...[1, 2, 3, 4, 5].map((i) => `pp${i}`), ...[2, 3, 4, 5].map((i) => `mp${i}`), ...[1, 2, 3, 4, 5].map((i) => `dp${i}`)],
  pelvis: ['hip_r', 'hip_l', 'sacrum', 'coccyx'],
  leg: ['femur', 'patella', 'tibia', 'fibula'],
  foot: ['talus', 'calcaneus', 'navicular', 'cuboid', 'cuneiform_med', 'cuneiform_int', 'cuneiform_lat',
    ...[1, 2, 3, 4, 5].map((i) => `mt${i}`), ...[1, 2, 3, 4, 5].map((i) => `fpp${i}`), ...[2, 3, 4, 5].map((i) => `fmp${i}`), ...[1, 2, 3, 4, 5].map((i) => `fdp${i}`)],
};

// ---------------------------------------------------------------- 래스터라이저
const W = 520, H = 640;
// 화면 기준: right = 화면 오른쪽, up = 화면 위, fwd = 카메라가 보는 방향
const VIEWS = {
  front: { right: [1, 0, 0], up: [0, 1, 0], label: '정면(환자 앞에서)' },
  rightSide: { right: [0, 0, 1], up: [0, 1, 0], label: '오른쪽 옆' },
  top: { right: [-1, 0, 0], up: [0, 0, 1], label: '위에서(앞쪽이 화면 위)' },
  back: { right: [-1, 0, 0], up: [0, 1, 0], label: '뒤에서' },
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function palette(i, n) {
  const c = new THREE.Color().setHSL((i / n) * 0.85, 0.55, 0.62);
  return [c.r, c.g, c.b];
}

function collect(scene) {
  scene.updateMatrixWorld(true);
  const meshes = [];
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    const p = g.attributes.position;
    const nrm = g.attributes.normal;
    const idx = g.index;
    const nm = new THREE.Matrix3().getNormalMatrix(o.matrixWorld);
    const v = new THREE.Vector3();
    const pos = new Float32Array(p.count * 3);
    const nor = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      pos.set([v.x, v.y, v.z], i * 3);
      v.fromBufferAttribute(nrm, i).applyMatrix3(nm).normalize();
      nor.set([v.x, v.y, v.z], i * 3);
    }
    meshes.push({ name: o.name, pos, nor, idx: idx ? idx.array : null });
  });
  return meshes;
}

function render(meshes, view, highlight) {
  const fwd = cross(view.up, view.right); // right = fwd x up  ->  fwd = up x right
  // 화면 투영 범위
  let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
  for (const m of meshes) for (let i = 0; i < m.pos.length; i += 3) {
    const p = [m.pos[i], m.pos[i + 1], m.pos[i + 2]];
    const x = dot(p, view.right), y = dot(p, view.up);
    minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y);
  }
  const s = Math.min((W * 0.9) / (maxx - minx), (H * 0.9) / (maxy - miny));
  const cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
  const img = new Float32Array(W * H * 3).fill(0.12);
  const zb = new Float32Array(W * H).fill(Infinity);
  const light = fwd.map((c) => -c);
  meshes.forEach((m, mi) => {
    const col = highlight ? highlight(m.name, mi) : [0.89, 0.85, 0.76];
    const sx = [], sy = [], sz = [], sh = [];
    for (let i = 0; i < m.pos.length; i += 3) {
      const p = [m.pos[i], m.pos[i + 1], m.pos[i + 2]];
      sx.push((dot(p, view.right) - cx) * s + W / 2);
      sy.push(H / 2 - (dot(p, view.up) - cy) * s);
      sz.push(dot(p, fwd));
      const n = [m.nor[i], m.nor[i + 1], m.nor[i + 2]];
      sh.push(0.25 + 0.75 * Math.max(0, dot(n, light)));
    }
    const idx = m.idx;
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2];
      const x0 = sx[a], y0 = sy[a], x1 = sx[b], y1 = sy[b], x2 = sx[c], y2 = sy[c];
      const area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
      if (area === 0) continue;
      const xa = Math.max(0, Math.floor(Math.min(x0, x1, x2))), xb = Math.min(W - 1, Math.ceil(Math.max(x0, x1, x2)));
      const ya = Math.max(0, Math.floor(Math.min(y0, y1, y2))), yb = Math.min(H - 1, Math.ceil(Math.max(y0, y1, y2)));
      for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
        const px = x + 0.5, py = y + 0.5;
        const w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) / area;
        const w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const z = w0 * sz[a] + w1 * sz[b] + w2 * sz[c];
        const k = y * W + x;
        if (z >= zb[k]) continue;
        zb[k] = z;
        const L = w0 * sh[a] + w1 * sh[b] + w2 * sh[c];
        img[k * 3] = col[0] * L; img[k * 3 + 1] = col[1] * L; img[k * 3 + 2] = col[2] * L;
      }
    }
  });
  return img;
}

function savePng(panels, file) {
  const png = new PNG({ width: W * panels.length, height: H });
  panels.forEach((img, pi) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = y * W + x, o = (y * W * panels.length + pi * W + x) * 4;
      png.data[o] = Math.min(255, img[k * 3] * 255);
      png.data[o + 1] = Math.min(255, img[k * 3 + 1] * 255);
      png.data[o + 2] = Math.min(255, img[k * 3 + 2] * 255);
      png.data[o + 3] = 255;
      if (x === 0 && pi > 0) png.data[o] = png.data[o + 1] = png.data[o + 2] = 80;
    }
  });
  fs.writeFileSync(file, PNG.sync.write(png));
}

// ---------------------------------------------------------------- 검사
let ok = true;
const center = {};
for (const [name, expected] of Object.entries(EXPECT)) {
  const gltf = await load(path.join(modelDir, `${name}.glb`));
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  const names = new Set();
  scene.traverse((o) => { if (o.isMesh) names.add(o.name); });
  const missing = expected.filter((n) => !names.has(n));
  const extra = [...names].filter((n) => !expected.includes(n));
  const declaredMissing = manifest.files[`${name}.glb`].missing;
  const unexpectedMissing = missing.filter((n) => !declaredMissing.includes(n));
  if (unexpectedMissing.length || extra.length) ok = false;
  // 월드 바운딩 박스 중심 (manifest 와 비교)
  let maxDiff = 0;
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const b = new THREE.Box3().setFromObject(o);
    const c = b.getCenter(new THREE.Vector3());
    center[`${name}/${o.name}`] = c;
    const mb = manifest.files[`${name}.glb`].nodes[o.name].bbox;
    for (let k = 0; k < 3; k++) {
      maxDiff = Math.max(maxDiff, Math.abs(b.min.getComponent(k) - mb.min[k]), Math.abs(b.max.getComponent(k) - mb.max[k]));
    }
  });
  console.log(`${name}.glb: ${names.size} meshes, missing=[${missing}] (declared [${declaredMissing}]), extra=[${extra}], bbox vs manifest max diff=${(maxDiff * 1000).toFixed(2)} mm`);

  if (previewDir) {
    fs.mkdirSync(previewDir, { recursive: true });
    const meshes = collect(scene).filter((m) => !process.env.ONLY || process.env.ONLY.split(',').includes(m.name));
    const views = { spine: ['front', 'rightSide'], arm: ['front', 'back'], hand: ['front', 'back'], pelvis: ['front', 'top'], leg: ['front', 'rightSide'], foot: ['top', 'rightSide'] }[name];
    const panels = views.map((v) => render(meshes, VIEWS[v], (n, i) => palette(i, meshes.length)));
    savePng(panels, path.join(previewDir, `${name}.png`));
    console.log(`   preview: ${path.join(previewDir, `${name}.png`)}  (${views.map((v) => VIEWS[v].label).join(' | ')})`);
  }
}

// 좌우·순서 점검 (월드 좌표: +X = 환자 왼쪽, +Y = 위, +Z = 앞)
const c = (k) => center[k];
const checks = [
  ['척추: C1 → 미골 순서로 위에서 아래', EXPECT.spine.every((n, i, a) => i === 0 || c(`spine/${a[i - 1]}`).y > c(`spine/${n}`).y)],
  ['골반: 미골이 천골 아래', c('pelvis/coccyx').y < c('pelvis/sacrum').y],
  ['팔: 상완골이 오른쪽(-X)', c('arm/humerus').x < 0],
  ['팔: 요골이 척골보다 바깥(-X 쪽, 해부학적 자세)', c('arm/radius').x < c('arm/ulna').x],
  ['손: 엄지(mc1)가 새끼(mc5)보다 바깥(-X)', c('hand/mc1').x < c('hand/mc5').x],
  ['손: 손가락 끝이 아래', c('hand/dp3').y < c('hand/mc3').y],
  ['골반: hip_r 은 -X, hip_l 은 +X', c('pelvis/hip_r').x < 0 && c('pelvis/hip_l').x > 0],
  ['다리: 슬개골이 앞(+Z)', c('leg/patella').z > c('leg/femur').z],
  ['다리: 비골이 경골보다 바깥(-X)', c('leg/fibula').x < c('leg/tibia').x],
  ['발: 엄지발가락(mt1)이 안쪽(+X), 새끼(mt5)가 바깥(-X)', c('foot/mt1').x > c('foot/mt5').x],
  ['발: 발가락이 앞(+Z), 종골이 뒤', c('foot/fdp2').z > c('foot/calcaneus').z],
];
for (const [label, pass] of checks) { console.log(`${pass ? 'OK  ' : 'FAIL'} ${label}`); if (!pass) ok = false; }
console.log(ok ? 'ALL OK' : 'SOME CHECKS FAILED');
process.exit(ok ? 0 : 1);
