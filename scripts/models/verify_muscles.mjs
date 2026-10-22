// 근육 GLB 검증: three.js GLTFLoader + MeshoptDecoder 로 읽어 노드 이름·해부학 위치를 확인하고,
// 소프트웨어 래스터라이저로 미리보기 PNG 를 만든다 (근육 = 빨강, 뼈 = 반투명 흰색, 확대 컷은 대상 근육만 색을 달리해서).
//   node verify_muscles.mjs <models 폴더> [미리보기 PNG 출력 폴더]
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { PNG } from 'pngjs';

const [modelDir, previewDir] = process.argv.slice(2);
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
await MeshoptDecoder.ready;

function load(file) {
  const buf = fs.readFileSync(file);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Promise((res, rej) => loader.parse(ab, '', res, rej));
}

const EXPECT = {
  muscle_upper: ['deltoid', 'supraspinatus', 'infraspinatus', 'teres_minor', 'teres_major', 'subscapularis', 'pectoralis_major',
    'pectoralis_minor', 'trapezius', 'rhomboid', 'levator_scapulae', 'serratus_anterior', 'biceps_brachii', 'brachialis',
    'coracobrachialis', 'triceps_brachii', 'anconeus', 'brachioradialis', 'pronator_teres', 'flexor_carpi_radialis', 'palmaris_longus',
    'flexor_carpi_ulnaris', 'flexor_digitorum_superficialis', 'flexor_digitorum_profundus', 'flexor_pollicis_longus', 'pronator_quadratus',
    'supinator', 'extensor_carpi_radialis_longus', 'extensor_carpi_radialis_brevis', 'extensor_carpi_ulnaris', 'extensor_digitorum',
    'abductor_pollicis_longus', 'extensor_pollicis_longus', 'extensor_pollicis_brevis', 'abductor_pollicis_brevis', 'adductor_pollicis',
    'opponens_pollicis', 'lumbricals', 'interossei',
    'b_clavicle', 'b_scapula', 'b_humerus', 'b_radius', 'b_ulna', 'b_hand', 'b_thorax', 'b_spine_ct', 'b_skull'],
  muscle_lower: ['gluteus_maximus', 'gluteus_medius', 'gluteus_minimus', 'piriformis', 'tensor_fasciae_latae', 'psoas_major', 'iliacus',
    'obturator_internus', 'quadratus_femoris', 'sartorius', 'rectus_femoris', 'vastus_lateralis', 'vastus_medialis', 'vastus_intermedius',
    'adductor_longus', 'adductor_brevis', 'adductor_magnus', 'gracilis', 'pectineus', 'biceps_femoris', 'semitendinosus', 'semimembranosus',
    'gastrocnemius', 'soleus', 'plantaris', 'popliteus', 'tibialis_anterior', 'tibialis_posterior', 'fibularis_longus', 'fibularis_brevis',
    'extensor_hallucis_longus', 'flexor_hallucis_longus', 'extensor_digitorum_longus', 'flexor_digitorum_longus', 'abductor_hallucis',
    'flexor_digitorum_brevis',
    'b_pelvis', 'b_lumbar', 'b_femur', 'b_patella', 'b_tibia', 'b_fibula', 'b_foot'],
  muscle_trunk: ['sternocleidomastoid', 'external_oblique', 'b_skull', 'b_cervical', 'b_thorax', 'b_pelvis'],
};

// ---------------------------------------------------------------- 래스터라이저
const W = 520, H = 680;
const VIEWS = {
  front: { right: [1, 0, 0], up: [0, 1, 0], label: '정면' },
  back: { right: [-1, 0, 0], up: [0, 1, 0], label: '뒤' },
  rightSide: { right: [0, 0, 1], up: [0, 1, 0], label: '오른쪽 옆(앞=화면 오른쪽)' },
  top: { right: [-1, 0, 0], up: [0, 0, 1], label: '위(앞=화면 위)' },
  bottom: { right: [-1, 0, 0], up: [0, 0, -1], label: '아래(발바닥, 앞=화면 아래)' },
  palm: { right: [1, 0, 0], up: [0, 1, 0], label: '손바닥(정면)' },
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const isBone = (n) => n.startsWith('b_');

function collect(scene) {
  scene.updateMatrixWorld(true);
  const meshes = [];
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    const p = g.attributes.position;
    const nrm = g.attributes.normal;
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
    meshes.push({ name: o.name, pos, nor, idx: g.index.array });
  });
  return meshes;
}

// 메시들을 z-버퍼로 그린다. 반환: {col(rgb), z}
function raster(meshes, view, frame, colorOf) {
  const fwd = cross(view.up, view.right);
  const light = fwd.map((c) => -c);
  const col = new Float32Array(W * H * 3);
  const zb = new Float32Array(W * H).fill(Infinity);
  for (const m of meshes) {
    const c = colorOf(m.name);
    const n = m.pos.length / 3;
    const sx = new Float32Array(n), sy = new Float32Array(n), sz = new Float32Array(n), sh = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const p = [m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]];
      sx[i] = (dot(p, view.right) - frame.cx) * frame.s + W / 2;
      sy[i] = H / 2 - (dot(p, view.up) - frame.cy) * frame.s;
      sz[i] = dot(p, fwd);
      const nn = [m.nor[i * 3], m.nor[i * 3 + 1], m.nor[i * 3 + 2]];
      const d = dot(nn, light);
      sh[i] = 0.22 + 0.68 * Math.max(0, d) + 0.25 * Math.pow(Math.max(0, d), 24); // 확산 + 약한 하이라이트
    }
    const idx = m.idx;
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], cc = idx[t + 2];
      const x0 = sx[a], y0 = sy[a], x1 = sx[b], y1 = sy[b], x2 = sx[cc], y2 = sy[cc];
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
        const z = w0 * sz[a] + w1 * sz[b] + w2 * sz[cc];
        const k = y * W + x;
        if (z >= zb[k]) continue;
        zb[k] = z;
        const L = w0 * sh[a] + w1 * sh[b] + w2 * sh[cc];
        col[k * 3] = c[0] * L; col[k * 3 + 1] = c[1] * L; col[k * 3 + 2] = c[2] * L;
      }
    }
  }
  return { col, zb };
}

function frameFor(meshes, view, margin = 0.06) {
  let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
  for (const m of meshes) for (let i = 0; i < m.pos.length; i += 3) {
    const p = [m.pos[i], m.pos[i + 1], m.pos[i + 2]];
    const x = dot(p, view.right), y = dot(p, view.up);
    minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y);
  }
  const s = Math.min((W * (1 - 2 * margin)) / (maxx - minx), (H * (1 - 2 * margin)) / (maxy - miny));
  return { s, cx: (minx + maxx) / 2, cy: (miny + maxy) / 2 };
}

const RED = [0.86, 0.2, 0.17];
const YELLOW = [1.0, 0.85, 0.2];
const BONE = [0.97, 0.96, 0.92];
const BONE_ALPHA = 0.42;

// 확대 컷: 대상 근육만 (순서대로 빨강·주황·노랑·분홍·자주) 뼈와 함께 그린다
const FOCUS_COLORS = [RED, [1.0, 0.55, 0.15], YELLOW, [1.0, 0.45, 0.7], [0.7, 0.3, 0.9]];
const FOCUS_NAMES = ['빨강', '주황', '노랑', '분홍', '자주'];

// 근육은 불투명, 뼈는 근육보다 앞에 있을 때만 반투명으로 덮는다.
function render(meshes, view, { focus } = {}) {
  const framing = focus ? meshes.filter((m) => focus.includes(m.name)) : meshes;
  const frame = frameFor(framing, view, focus ? 0.12 : 0.05);
  const colorOf = (n) => (focus ? FOCUS_COLORS[focus.indexOf(n) % FOCUS_COLORS.length] : RED);
  const mus = raster(meshes.filter((m) => !isBone(m.name) && (!focus || focus.includes(m.name))), view, frame, colorOf);
  const bon = raster(meshes.filter((m) => isBone(m.name)), view, frame, () => BONE);
  const img = new Float32Array(W * H * 3);
  for (let k = 0; k < W * H; k++) {
    for (let i = 0; i < 3; i++) img[k * 3 + i] = mus.zb[k] < Infinity ? mus.col[k * 3 + i] : 0.1;
    if (bon.zb[k] < mus.zb[k]) for (let i = 0; i < 3; i++) img[k * 3 + i] = img[k * 3 + i] * (1 - BONE_ALPHA) + bon.col[k * 3 + i] * BONE_ALPHA;
  }
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
      if (x === 0 && pi > 0) png.data[o] = png.data[o + 1] = png.data[o + 2] = 90;
    }
  });
  fs.writeFileSync(file, PNG.sync.write(png));
}

// ---------------------------------------------------------------- 검사
let ok = true;
const C = {}; // "file/node" -> 월드 bbox 중심
const BOX = {}; // "file/node" -> 월드 bbox
const scenes = {};
for (const [file, expected] of Object.entries(EXPECT)) {
  const gltf = await load(path.join(modelDir, `${file}.glb`));
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  scenes[file] = scene;
  const names = [];
  let tris = 0;
  scene.traverse((o) => {
    if (!o.isMesh) return;
    names.push(o.name);
    tris += o.geometry.index.count / 3;
    BOX[`${file}/${o.name}`] = new THREE.Box3().setFromObject(o);
    C[`${file}/${o.name}`] = BOX[`${file}/${o.name}`].getCenter(new THREE.Vector3());
  });
  const missing = expected.filter((n) => !names.includes(n));
  const extra = names.filter((n) => !expected.includes(n));
  if (missing.length || extra.length) ok = false;
  const bytes = fs.statSync(path.join(modelDir, `${file}.glb`)).size;
  console.log(`${file}.glb: ${(bytes / 1024).toFixed(0)} KB, ${names.length} meshes, ${tris} tris, missing=[${missing}], extra=[${extra}]`);
}

const c = (k) => C[k];
const U = (n) => c(`muscle_upper/${n}`), L = (n) => c(`muscle_lower/${n}`), T = (n) => c(`muscle_trunk/${n}`);
const allMuscles = Object.entries(EXPECT).flatMap(([f, ns]) => ns.filter((n) => !isBone(n)).map((n) => c(`${f}/${n}`)));
const checks = [
  ['모든 근육이 오른쪽(-X)', allMuscles.every((p) => p.x < 0)],
  ['극상근이 극하근보다 위', U('supraspinatus').y > U('infraspinatus').y],
  ['극상근이 견갑골 중심보다 위', U('supraspinatus').y > U('b_scapula').y],
  ['극하근이 견갑골보다 뒤(-Z)', U('infraspinatus').z < U('b_scapula').z],
  ['견갑하근이 극하근보다 앞(+Z, 견갑골 앞면)', U('subscapularis').z > U('infraspinatus').z],
  ['삼각근이 상완골 위쪽 끝 높이', U('deltoid').y > U('b_humerus').y],
  ['이두근이 상완골 앞, 삼두근이 뒤', U('biceps_brachii').z > U('b_humerus').z && U('triceps_brachii').z < U('b_humerus').z],
  ['대흉근이 흉곽 앞, 승모근이 척추 뒤', U('pectoralis_major').z > U('b_thorax').z && U('trapezius').z < U('b_spine_ct').z],
  // 승모근은 목을 감싸 bbox 중심이 앞으로 쏠리므로 가장 뒤쪽 면(min z)·위 끝(max y)으로 비교
  ['승모근 겉면이 능형근보다 뒤, 위 끝이 더 높음', BOX['muscle_upper/trapezius'].min.z < BOX['muscle_upper/rhomboid'].min.z && BOX['muscle_upper/trapezius'].max.y > BOX['muscle_upper/rhomboid'].max.y],
  ['전완 굴근이 신근보다 앞(+Z)', U('flexor_digitorum_superficialis').z > U('extensor_digitorum').z],
  ['충양근·골간근이 손 높이(요골보다 아래)', U('lumbricals').y < U('b_radius').y && U('interossei').y < U('b_radius').y],
  ['대퇴직근이 대퇴골 앞', L('rectus_femoris').z > L('b_femur').z],
  ['대퇴이두근·반건양근이 대퇴골 뒤', L('biceps_femoris').z < L('b_femur').z && L('semitendinosus').z < L('b_femur').z],
  ['외측광근이 내측광근보다 바깥(-X)', L('vastus_lateralis').x < L('vastus_medialis').x],
  ['대퇴이두근이 반건양근보다 바깥(-X)', L('biceps_femoris').x < L('semitendinosus').x],
  ['대둔근이 골반 뒤', L('gluteus_maximus').z < L('b_pelvis').z],
  ['비복근이 경골 뒤, 전경골근이 앞', L('gastrocnemius').z < L('b_tibia').z && L('tibialis_anterior').z > L('b_tibia').z],
  ['비골근이 경골보다 바깥(-X)', L('fibularis_longus').x < L('b_tibia').x],
  ['단지굴근이 발 아래(발바닥)', L('flexor_digitorum_brevis').y < L('b_foot').y],
  ['흉쇄유돌근이 목 높이·경추 앞', T('sternocleidomastoid').y > T('b_thorax').y && T('sternocleidomastoid').z > T('b_cervical').z],
  ['외복사근이 흉곽과 골반 사이', T('external_oblique').y < T('b_thorax').y && T('external_oblique').y > T('b_pelvis').y],
];

// 기존 3.0 뼈 GLB 와 같은 좌표에 있는지 (근육 파일 뼈 중심 vs arm/leg.glb 뼈 중심)
const cmp = [];
for (const [bf, bn, mf, mn] of [['arm', 'humerus', 'muscle_upper', 'b_humerus'], ['arm', 'scapula', 'muscle_upper', 'b_scapula'], ['leg', 'femur', 'muscle_lower', 'b_femur'], ['leg', 'tibia', 'muscle_lower', 'b_tibia']]) {
  const f = path.join(modelDir, `${bf}.glb`);
  if (!fs.existsSync(f)) continue;
  const g = await load(f);
  g.scene.updateMatrixWorld(true);
  const o = g.scene.getObjectByName(bn);
  const d = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).distanceTo(c(`${mf}/${mn}`));
  cmp.push(`${bf}.glb/${bn} vs ${mf}/${mn}: ${(d * 1000).toFixed(1)} mm`);
}
for (const [label, pass] of checks) { console.log(`${pass ? 'OK  ' : 'FAIL'} ${label}`); if (!pass) ok = false; }
if (cmp.length) console.log('3.0 뼈 GLB 와 중심 거리: ' + cmp.join(', '));

// ---------------------------------------------------------------- 미리보기
if (previewDir) {
  fs.mkdirSync(previewDir, { recursive: true });
  const shots = [
    ['muscle_upper', 'upper_overview', ['front', 'back', 'rightSide']],
    ['muscle_upper', 'upper_rotator_cuff', ['back', 'rightSide', 'top'], ['supraspinatus', 'infraspinatus', 'teres_minor']],
    ['muscle_upper', 'upper_subscapularis', ['front', 'rightSide'], ['subscapularis']],
    ['muscle_upper', 'upper_arm_biceps_triceps', ['front', 'rightSide'], ['biceps_brachii', 'triceps_brachii']],
    ['muscle_upper', 'upper_forearm_flexors', ['front', 'back'], ['flexor_carpi_radialis', 'palmaris_longus', 'flexor_carpi_ulnaris', 'pronator_teres']],
    ['muscle_upper', 'upper_hand_intrinsics', ['front', 'back'], ['lumbricals', 'interossei', 'abductor_pollicis_brevis', 'opponens_pollicis', 'adductor_pollicis']],
    ['muscle_lower', 'lower_overview', ['front', 'back', 'rightSide']],
    ['muscle_lower', 'lower_thigh_front_back', ['front', 'back', 'rightSide'], ['rectus_femoris', 'biceps_femoris']],
    ['muscle_lower', 'lower_hip_deep', ['back', 'rightSide'], ['piriformis', 'gluteus_minimus', 'obturator_internus', 'quadratus_femoris']],
    ['muscle_lower', 'lower_leg', ['front', 'back', 'rightSide'], ['tibialis_anterior', 'gastrocnemius', 'fibularis_longus', 'popliteus']],
    ['muscle_lower', 'lower_foot', ['bottom', 'rightSide'], ['abductor_hallucis', 'flexor_digitorum_brevis']],
    ['muscle_trunk', 'trunk_overview', ['front', 'rightSide', 'back']],
  ];
  for (const [file, name, views, focus] of shots) {
    const meshes = collect(scenes[file]);
    const panels = views.map((v) => render(meshes, VIEWS[v], { focus }));
    const out = path.join(previewDir, `${name}.png`);
    savePng(panels, out);
    console.log(`preview ${out}  (${views.map((v) => VIEWS[v].label).join(' | ')}${focus ? `; ${focus.map((f, i) => `${FOCUS_NAMES[i % 5]}=${f}`).join(', ')}` : ''})`);
  }
}

console.log(ok ? 'ALL OK' : 'SOME CHECKS FAILED');
process.exit(ok ? 0 : 1);
