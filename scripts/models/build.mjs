// BodyParts3D (DBCLS, CC BY-SA 2.1 JP) OBJ -> 조립 단위 GLB (meshopt 압축)
//
// 사용법:
//   npm i   (이 폴더에서 한 번)
//   node build.mjs <BP3D obj 폴더> <이름 목록 파일> <출력 폴더>
//
// 사용한 원본 (고해상도, 폴리곤 95% 감축판):
//   https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/
//   - BodyParts3D_3.0_obj_95.zip  (파일 이름 = FMAxxxx.obj)
//   - parts_list_e.txt            (FMA ID <TAB> 영어 이름)
//   node build.mjs <...>/BodyParts3D_3.0_obj_95 <...>/parts_list_e.txt ../../public/models
//   node verify.mjs ../../public/models <미리보기 PNG 폴더>   # 노드 이름·좌우 점검 + 렌더
//
// 4.0 판(99% 감축, 저해상도)도 읽을 수 있다 (단 미골 절단 높이 34 mm 는 3.0 기준으로 맞춘 값):
//   https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
//   - partof_BP3D_4.0_obj_99.zip, partof_element_parts.txt (FMA ID <TAB> 이름 <TAB> FJxxxx)
//
// 좌표계:
//   BodyParts3D: 단위 mm, +X = 환자 왼쪽, +Y = 뒤쪽(posterior), +Z = 위쪽(superior)
//   출력 glTF : 단위 m,  +X = 환자 왼쪽, +Y = 위쪽,            +Z = 앞쪽(anterior)
//   (gx, gy, gz) = (X, Z, -Y) / 1000  -- 회전만 (det=+1), 좌우 반전 없음.
//   환자가 +Z 를 바라보므로 three.js 기본 카메라(+Z 에서 -Z 를 봄)로 보면 정면이 보인다.

import fs from 'node:fs';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplifyPrimitive, meshopt, prune, dedup } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const [objDir, elementList, outDir] = process.argv.slice(2);
if (!objDir || !elementList || !outDir) {
  console.error('usage: node build.mjs <objDir> <partof_element_parts.txt> <outDir>');
  process.exit(1);
}

// ---------------------------------------------------------------- 뼈 목록
// [노드 이름, BodyParts3D 영어 이름(partof), 목표 삼각형 수]
const SMALL = 3000; // 수근골·지골 등 작은 뼈: 원본 그대로 (대부분 3000 미만)
const VERT = 6000; // 척추뼈
const LONG = 10000; // 긴뼈·큰 뼈

// BodyParts3D 에는 미골(coccyx) 이 따로 없고 'sacrum' 메시 아래 끝에 미골 마디들이 붙어 있다.
// 3.0 obj_95 의 sacrum 메시는 아래 끝에서 약 32~36 mm 높이가 가장 가는 목(천미관절)이라,
// 아래 끝 + 34 mm 높이의 수평면에서 잘라 아래쪽을 coccyx 노드로 만들고 잘린 면은 막는다.
const COCCYX_FROM_SACRUM = { splitFrom: 'sacrum', cutAboveBottom: 0.034 };

const ASSEMBLIES = {
  spine: [
    ['C1', 'atlas', VERT],
    ['C2', 'axis', VERT],
    ['C3', 'third cervical vertebra', VERT],
    ['C4', 'fourth cervical vertebra', VERT],
    ['C5', 'fifth cervical vertebra', VERT],
    ['C6', 'sixth cervical vertebra', VERT],
    ['C7', 'seventh cervical vertebra', VERT],
    ['T1', 'first thoracic vertebra', VERT],
    ['T2', 'second thoracic vertebra', VERT],
    ['T3', 'third thoracic vertebra', VERT],
    ['T4', 'fourth thoracic vertebra', VERT],
    ['T5', 'fifth thoracic vertebra', VERT],
    ['T6', 'sixth thoracic vertebra', VERT],
    ['T7', 'seventh thoracic vertebra', VERT],
    ['T8', 'eighth thoracic vertebra', VERT],
    ['T9', 'ninth thoracic vertebra', VERT],
    ['T10', 'tenth thoracic vertebra', VERT],
    ['T11', 'eleventh thoracic vertebra', VERT],
    ['T12', 'twelfth thoracic vertebra', VERT],
    ['L1', 'first lumbar vertebra', VERT],
    ['L2', 'second lumbar vertebra', VERT],
    ['L3', 'third lumbar vertebra', VERT],
    ['L4', 'fourth lumbar vertebra', VERT],
    ['L5', 'fifth lumbar vertebra', VERT],
    ['sacrum', 'sacrum', LONG],
    ['coccyx', COCCYX_FROM_SACRUM, 0],
  ],
  arm: [
    ['clavicle', 'right clavicle', LONG],
    ['scapula', 'right scapula', LONG],
    ['humerus', 'right humerus', LONG],
    ['radius', 'right radius', LONG],
    ['ulna', 'right ulna', LONG],
  ],
  hand: [
    ['scaphoid', 'right scaphoid', SMALL],
    ['lunate', 'right lunate', SMALL],
    ['triquetrum', 'right triquetral', SMALL],
    ['pisiform', 'right pisiform', SMALL],
    ['trapezium', 'right trapezium', SMALL],
    ['trapezoid', 'right trapezoid', SMALL],
    ['capitate', 'right capitate', SMALL],
    ['hamate', 'right hamate', SMALL],
    ['mc1', 'right first metacarpal bone', SMALL],
    ['mc2', 'right second metacarpal bone', SMALL],
    ['mc3', 'right third metacarpal bone', SMALL],
    ['mc4', 'right fourth metacarpal bone', SMALL],
    ['mc5', 'right fifth metacarpal bone', SMALL],
    ['pp1', 'proximal phalanx of right thumb', SMALL],
    ['pp2', 'proximal phalanx of right index finger', SMALL],
    ['pp3', 'proximal phalanx of right middle finger', SMALL],
    ['pp4', 'proximal phalanx of right ring finger', SMALL],
    ['pp5', 'proximal phalanx of right little finger', SMALL],
    ['mp2', 'middle phalanx of right index finger', SMALL],
    ['mp3', 'middle phalanx of right middle finger', SMALL],
    ['mp4', 'middle phalanx of right ring finger', SMALL],
    ['mp5', 'middle phalanx of right little finger', SMALL],
    ['dp1', 'distal phalanx of right thumb', SMALL],
    ['dp2', 'distal phalanx of right index finger', SMALL],
    ['dp3', 'distal phalanx of right middle finger', SMALL],
    ['dp4', 'distal phalanx of right ring finger', SMALL],
    ['dp5', 'distal phalanx of right little finger', SMALL],
  ],
  pelvis: [
    // BodyParts3D 에는 장골·좌골·치골이 나뉜 메시가 없어 관골 전체로 넣는다.
    ['hip_r', 'right hip bone', LONG],
    ['hip_l', 'left hip bone', LONG],
    ['sacrum', 'sacrum', LONG],
    ['coccyx', COCCYX_FROM_SACRUM, 0],
  ],
  leg: [
    ['femur', 'right femur', LONG],
    ['patella', 'right patella', SMALL],
    ['tibia', 'right tibia', LONG],
    ['fibula', 'right fibula', LONG],
  ],
  foot: [
    ['talus', 'right talus', SMALL],
    ['calcaneus', 'right calcaneus', 5000],
    ['navicular', 'navicular bone of right foot', SMALL],
    ['cuboid', 'right cuboid bone', SMALL],
    ['cuneiform_med', 'right medial cuneiform bone', SMALL],
    ['cuneiform_int', 'right intermediate cuneiform bone', SMALL],
    ['cuneiform_lat', 'right lateral cuneiform bone', SMALL],
    ['mt1', 'right first metatarsal bone', SMALL],
    ['mt2', 'right second metatarsal bone', SMALL],
    ['mt3', 'right third metatarsal bone', SMALL],
    ['mt4', 'right fourth metatarsal bone', SMALL],
    ['mt5', 'right fifth metatarsal bone', SMALL],
    ['fpp1', 'proximal phalanx of right big toe', SMALL],
    ['fpp2', 'proximal phalanx of right second toe', SMALL],
    ['fpp3', 'proximal phalanx of right third toe', SMALL],
    ['fpp4', 'proximal phalanx of right fourth toe', SMALL],
    ['fpp5', 'proximal phalanx of right little toe', SMALL],
    ['fmp2', 'middle phalanx of right second toe', SMALL],
    ['fmp3', 'middle phalanx of right third toe', SMALL],
    ['fmp4', 'middle phalanx of right fourth toe', SMALL],
    ['fmp5', 'middle phalanx of right little toe', SMALL],
    ['fdp1', 'distal phalanx of right big toe', SMALL],
    ['fdp2', 'distal phalanx of right second toe', SMALL],
    ['fdp3', 'distal phalanx of right third toe', SMALL],
    ['fdp4', 'distal phalanx of right fourth toe', SMALL],
    ['fdp5', 'distal phalanx of right little toe', SMALL],
  ],
};

// 단순화 오차 한계 (메시 크기 대비 비율). 이보다 모양이 무너지면 목표 삼각형 수에 못 미쳐도 멈춘다.
const SIMPLIFY_ERROR = 0.004;

// ---------------------------------------------------------------- 이름 -> 요소 파일
// 3.0: "FMA id <TAB> name"            -> <objDir>/<FMA id>.obj
// 4.0: "FMA id <TAB> name <TAB> FJ id" -> <objDir>/<FJ id>.obj (한 개념에 여러 파일 가능)
const elements = new Map(); // name -> {fma, files[]}
for (const line of fs.readFileSync(elementList, 'utf8').split(/\r?\n/).slice(1)) {
  const cols = line.split('\t').map((c) => c.trim().replace(/^"|"$/g, ''));
  const [fma, name, fj] = cols;
  if (!fma || !name) continue;
  const file = fj || fma;
  if (!fs.existsSync(path.join(objDir, `${file}.obj`))) continue;
  if (!elements.has(name)) elements.set(name, { fma, files: [] });
  elements.get(name).files.push(file);
}

// ---------------------------------------------------------------- OBJ 읽기
function readObj(file) {
  const pos = [];
  const idx = [];
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.startsWith('v ')) {
      const [, x, y, z] = line.trim().split(/\s+/).map(Number);
      // BP3D(mm, X=L, Y=P, Z=S) -> glTF(m, X=L, Y=S, Z=A)
      pos.push(x / 1000, z / 1000, -y / 1000);
    } else if (line.startsWith('f ')) {
      const vs = line.trim().split(/\s+/).slice(1).map((t) => {
        const i = parseInt(t.split('/')[0], 10);
        return i < 0 ? pos.length / 3 + i : i - 1;
      });
      for (let k = 1; k + 1 < vs.length; k++) idx.push(vs[0], vs[k], vs[k + 1]);
    }
  }
  return { pos, idx };
}

function loadBone(enName) {
  const el = elements.get(enName);
  if (!el) throw new Error(`BodyParts3D 에 없음: ${enName}`);
  const pos = [];
  const idx = [];
  for (const fj of el.files) {
    const m = readObj(path.join(objDir, `${fj}.obj`));
    const base = pos.length / 3;
    for (const v of m.pos) pos.push(v);
    for (const i of m.idx) idx.push(i + base);
  }
  return { fma: el.fma, files: el.files, pos: new Float32Array(pos), idx: new Uint32Array(idx) };
}

// 면적 가중 매끈한 정점 법선 (용접된 메시 기준)
function smoothNormals(pos, idx) {
  const n = new Float32Array(pos.length);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) { n[v] += nx; n[v + 1] += ny; n[v + 2] += nz; }
  }
  for (let v = 0; v < n.length; v += 3) {
    const l = Math.hypot(n[v], n[v + 1], n[v + 2]) || 1;
    n[v] /= l; n[v + 1] /= l; n[v + 2] /= l;
  }
  return n;
}

// 수평면 y = cutY 로 메시를 정확히 잘라(걸친 삼각형은 평면에서 쪼갬) 둘로 나누고,
// 잘린 테두리를 부채꼴로 막는다. 막은 면은 정점을 따로 두어 법선이 옆면과 섞이지 않게 한다.
function splitByPlane(pos0, idx, cutY) {
  const pos = Array.from(pos0);
  const side = (v) => (pos[v * 3 + 1] < cutY ? 'lower' : 'upper');
  const cache = new Map();
  const cutVertex = (a, b) => {
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    if (cache.has(key)) return cache.get(key);
    const ya = pos[a * 3 + 1], yb = pos[b * 3 + 1];
    const t = (cutY - ya) / (yb - ya);
    const v = pos.length / 3;
    pos.push(pos[a * 3] + t * (pos[b * 3] - pos[a * 3]), cutY, pos[a * 3 + 2] + t * (pos[b * 3 + 2] - pos[a * 3 + 2]));
    cache.set(key, v);
    return v;
  };
  const parts = { upper: [], lower: [] };
  for (let t = 0; t < idx.length; t += 3) {
    const v = [idx[t], idx[t + 1], idx[t + 2]];
    const sd = v.map(side);
    if (sd[0] === sd[1] && sd[1] === sd[2]) { parts[sd[0]].push(...v); continue; }
    // 혼자 다른 쪽에 있는 정점을 맨 앞으로 돌린다 (감김 방향 유지)
    const lone = sd[0] !== sd[1] && sd[0] !== sd[2] ? 0 : sd[1] !== sd[0] && sd[1] !== sd[2] ? 1 : 2;
    const [v0, v1, v2] = [v[lone], v[(lone + 1) % 3], v[(lone + 2) % 3]];
    const p01 = cutVertex(v0, v1), p02 = cutVertex(v0, v2);
    parts[side(v0)].push(v0, p01, p02);
    parts[side(v1)].push(p01, v1, v2, p01, v2, p02);
  }
  const out = {};
  for (const [k, tri] of Object.entries(parts)) {
    // 테두리 변: 반대 방향 변이 없는 방향 변
    const edges = new Set();
    for (let t = 0; t < tri.length; t += 3) for (let e = 0; e < 3; e++) edges.add(`${tri[t + e]},${tri[t + (e + 1) % 3]}`);
    const border = [];
    for (const e of edges) { const [a, b] = e.split(',').map(Number); if (!edges.has(`${b},${a}`)) border.push([a, b]); }
    const par = new Map();
    const find = (x) => { while (par.get(x) !== x) { par.set(x, par.get(par.get(x))); x = par.get(x); } return x; };
    for (const [a, b] of border) { if (!par.has(a)) par.set(a, a); if (!par.has(b)) par.set(b, b); par.set(find(a), find(b)); }
    const remap = new Map();
    const P = [];
    const I = [];
    const vid = (v) => { if (!remap.has(v)) { remap.set(v, P.length / 3); P.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); } return remap.get(v); };
    for (const v of tri) I.push(vid(v));
    const loops = new Map();
    let capped = 0;
    for (const [a, b] of border) { const r = find(a); if (!loops.has(r)) loops.set(r, []); loops.get(r).push([a, b]); }
    for (const loopEdges of loops.values()) {
      const vs = [...new Set(loopEdges.flat())];
      // 자른 면 위의 고리만 막는다
      if (vs.some((v) => Math.abs(pos[v * 3 + 1] - cutY) > 1e-6)) continue;
      capped++;
      const c = [0, 0, 0];
      for (const v of vs) for (let i = 0; i < 3; i++) c[i] += pos[v * 3 + i] / vs.length;
      const cap = new Map();
      const capVid = (v) => { if (!cap.has(v)) { cap.set(v, P.length / 3); P.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); } return cap.get(v); };
      const ci = P.length / 3; P.push(...c);
      for (const [a, b] of loopEdges) I.push(capVid(b), capVid(a), ci);
    }
    out[k] = { pos: new Float32Array(P), idx: new Uint32Array(I), capped: `${capped}/${loops.size}` };
  }
  return out;
}

function bbox(pos, idx) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const i of idx) for (let k = 0; k < 3; k++) {
    const v = pos[i * 3 + k];
    if (v < min[k]) min[k] = v;
    if (v > max[k]) max[k] = v;
  }
  const r = (x) => Math.round(x * 1e5) / 1e5;
  return { min: min.map(r), max: max.map(r) };
}

// ---------------------------------------------------------------- 빌드
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
fs.mkdirSync(outDir, { recursive: true });

const manifest = {
  source: 'BodyParts3D 3.0 obj_95 (DBCLS), CC BY-SA 2.1 JP',
  units: 'meters',
  upAxis: '+Y',
  axes: { x: "+X = patient's left", y: '+Y = superior (up)', z: '+Z = anterior (front)' },
  note: 'All nodes keep original anatomical positions (world space). Every node carries the same dequantization transform (KHR_mesh_quantization, scene volume); use world-space bounds (Box3.setFromObject). Requires MeshoptDecoder.',
  remarks: [
    'BodyParts3D has no separate coccyx mesh: its sacrum mesh includes the coccygeal segments. "coccyx" was cut from it with a horizontal plane at the sacrococcygeal level and both cut faces were capped.',
    'BodyParts3D has no separate ilium/ischium/pubis meshes: pelvis.glb uses whole hip bones (hip_r, hip_l).',
    'Thumb has no middle phalanx (mp1) and big toe has no middle phalanx (fmp1), as in real anatomy. Little toe middle and distal phalanges are separate meshes (fmp5, fdp5).',
  ],
  files: {},
};
const report = [];

for (const [file, bones] of Object.entries(ASSEMBLIES)) {
  const doc = new Document();
  doc.createBuffer();
  const scene = doc.createScene(file);
  const mat = doc.createMaterial('bone')
    .setBaseColorFactor([0.89, 0.85, 0.76, 1])
    .setRoughnessFactor(0.75)
    .setMetallicFactor(0);

  const entry = { nodes: {}, missing: [] };
  const splits = [];
  for (const [nodeName, enName, target] of bones) {
    if (!enName) { entry.missing.push(nodeName); continue; }
    if (enName.splitFrom) { splits.push({ nodeName, ...enName }); continue; }
    const bone = loadBone(enName);
    const prim = doc.createPrimitive()
      .setMaterial(mat)
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(bone.pos))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(bone.idx));
    const mesh = doc.createMesh(nodeName).addPrimitive(prim);
    const node = doc.createNode(nodeName).setMesh(mesh).setExtras({ fma: bone.fma, name_en: enName, bp3d: bone.files });
    scene.addChild(node);
    entry.nodes[nodeName] = { srcTris: bone.idx.length / 3, target };
  }

  // 용접 -> 뼈별 단순화 -> (미골 분리) -> 매끈한 법선
  await doc.transform(weld());
  for (const node of scene.listChildren()) {
    const prim = node.getMesh().listPrimitives()[0];
    const info = entry.nodes[node.getName()];
    const ratio = Math.min(1, info.target / info.srcTris);
    if (ratio < 1) simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio, error: SIMPLIFY_ERROR });
  }
  for (const sp of splits) {
    const srcNode = scene.listChildren().find((n) => n.getName() === sp.splitFrom);
    const srcPrim = srcNode.getMesh().listPrimitives()[0];
    const pos = srcPrim.getAttribute('POSITION').getArray();
    const idx = srcPrim.getIndices().getArray();
    let minY = Infinity;
    for (let i = 1; i < pos.length; i += 3) minY = Math.min(minY, pos[i]);
    const cutY = minY + sp.cutAboveBottom;
    const { upper, lower } = splitByPlane(pos, idx, cutY);
    srcPrim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(upper.pos))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(upper.idx));
    const prim = doc.createPrimitive().setMaterial(mat)
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(lower.pos))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(lower.idx));
    const src = srcNode.getExtras();
    const node = doc.createNode(sp.nodeName).setMesh(doc.createMesh(sp.nodeName).addPrimitive(prim)).setExtras({
      name_en: 'coccyx',
      note: `cut from BodyParts3D '${src.name_en}' (${src.fma}) at y=${cutY.toFixed(4)} m (sacrococcygeal level)`,
      bp3d: src.bp3d,
    });
    scene.addChild(node);
    entry.nodes[sp.nodeName] = { srcTris: lower.idx.length / 3, target: 0, splitFrom: sp.splitFrom };
    console.log(`${file}: ${sp.nodeName} cut from ${sp.splitFrom} at y=${cutY.toFixed(4)} m, caps: upper ${upper.capped} loop(s), lower ${lower.capped} loop(s)`);
  }
  for (const node of scene.listChildren()) {
    const prim = node.getMesh().listPrimitives()[0];
    const info = entry.nodes[node.getName()];
    const pos = prim.getAttribute('POSITION').getArray();
    const idx = prim.getIndices().getArray();
    prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(smoothNormals(pos, idx)));
    info.triangles = idx.length / 3;
    info.vertices = pos.length / 3;
    info.bbox = bbox(pos, idx);
  }

  await doc.transform(
    dedup(),
    prune(),
    meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizationVolume: 'scene', quantizePosition: 14, quantizeNormal: 10 }),
  );

  const outPath = path.join(outDir, `${file}.glb`);
  await io.write(outPath, doc);
  const bytes = fs.statSync(outPath).size;
  const totalTris = Object.values(entry.nodes).reduce((s, n) => s + n.triangles, 0);
  manifest.files[`${file}.glb`] = {
    bytes,
    triangles: totalTris,
    nodes: Object.fromEntries(Object.entries(entry.nodes).map(([k, v]) => [k, { bbox: v.bbox, triangles: v.triangles, ...(v.splitFrom ? { splitFrom: v.splitFrom } : {}) }])),
    missing: entry.missing,
  };
  report.push(`${file}.glb  ${(bytes / 1024).toFixed(0)} KB  tris=${totalTris}  missing=[${entry.missing.join(',')}]`);
  for (const [k, v] of Object.entries(entry.nodes)) report.push(`   ${k.padEnd(14)} ${String(v.srcTris).padStart(6)} -> ${String(v.triangles).padStart(6)}`);
}

const json = JSON.stringify(manifest, null, 2).replace(/\[\s+(-?[\d.e-]+),\s+(-?[\d.e-]+),\s+(-?[\d.e-]+)\s+\]/g, '[$1, $2, $3]');
fs.writeFileSync(path.join(outDir, 'manifest.json'), json + '\n');
console.log(report.join('\n'));
const total = Object.values(manifest.files).reduce((s, f) => s + f.bytes, 0);
console.log(`total ${(total / 1024 / 1024).toFixed(2)} MB`);
