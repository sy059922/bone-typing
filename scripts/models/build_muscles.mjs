// BodyParts3D 4.0 (DBCLS, CC BY-SA 2.1 JP) is_a OBJ -> 근육 모드용 GLB 3개 (meshopt 압축)
//
// 사용법 (이 폴더에서, npm i 한 번):
//   node build_muscles.mjs <isa obj 폴더> <isa_element_parts.txt> <models 폴더>
//   node verify_muscles.mjs <models 폴더> <미리보기 PNG 폴더>
//
// 사용한 원본 (99% 감축판):
//   https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
//   - isa_BP3D_4.0_obj_99.zip  (파일 이름 = FJxxxx.obj, 헤더에 Concept ID·English name)
//   - isa_element_parts.txt    (FMA ID <TAB> 이름 <TAB> FJxxxx)
//
// 근육은 isa_element_parts 의 영어 개념 이름으로 찾는다. 갈래·부분으로만 있는 근육
// (삼각근 3부분, 이두근 두 갈래, 손 골간근 배측+장측 묶음 등)은 모두 모아 노드 하나로 합친다.
// 맥락 뼈는 같은 폴더 OBJ 헤더의 English name 으로 찾아 묶는다.
//
// 좌표계 (build.mjs 와 같음):
//   BodyParts3D: 단위 mm, +X = 환자 왼쪽, +Y = 뒤쪽, +Z = 위쪽
//   출력 glTF : 단위 m,  +X = 환자 왼쪽, +Y = 위쪽, +Z = 앞쪽   (gx, gy, gz) = (X, Z, -Y) / 1000
//
// 매끈하게: 4.0 obj_99 는 많이 감축돼 작은 근육이 각져 보인다. 근육은 파일(갈래)마다
//   용접 -> 바깥 방향 정리 -> 작으면 Loop 세분화(1~2단계) -> 노드 상한 넘으면 meshopt 단순화
//   -> 면적 가중 매끈한 법선. 뼈는 흐린 맥락용이라 세분화 없이 단순화만 한다.

import fs from 'node:fs';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { simplifyPrimitive, meshopt, prune, dedup } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

// --v3: BodyParts3D 3.0 obj_95 (뼈 파일과 같은 좌표·더 고운 메시)로 몸통·머리 근육 파일을 만든다.
//   node build_muscles.mjs --v3 <BodyParts3D_3.0_obj_95 폴더> <parts_list_e.txt> <models 폴더>
//   3.0 OBJ 머리말에는 이름이 없어 parts_list_e.txt (FMA id <TAB> 이름, 파일 = <id>.obj)로 뼈·근육을 모두 찾는다.
const V3 = process.argv.includes('--v3');
const [objDir, elementList, outDir] = process.argv.slice(2).filter((a) => a !== '--v3');
if (!objDir || !elementList || !outDir) {
  console.error('usage: node build_muscles.mjs <isa objDir> <isa_element_parts.txt> <outDir>');
  process.exit(1);
}

// ---------------------------------------------------------------- 목록
// 근육: [노드 이름, [isa 개념 이름...]]
const M = (node, ...concepts) => ({ node, kind: 'muscle', concepts });
// 뼈: [노드 이름, [OBJ 헤더 English name...]] (대소문자 무시)
const B = (node, names, opts = {}) => ({ node, kind: 'bone', names, ...opts });

const ORD = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
const FINGERS = ['thumb', 'index finger', 'middle finger', 'ring finger', 'little finger'];
const TOES = ['big toe', 'second toe', 'third toe', 'fourth toe', 'little toe'];

const SKULL = ['frontal bone', 'occipital bone', 'sphenoid bone', 'ethmoid', 'vomer', 'mandible',
  ...['parietal bone', 'temporal bone', 'maxilla', 'zygomatic bone', 'nasal bone', 'lacrimal bone', 'palatine bone', 'inferior nasal concha']
    .flatMap((b) => [`right ${b}`, `left ${b}`])];
const STERNUM = ['manubrium', 'body of sternum', 'xiphoid process'];
const ribs = (side) => [...ORD.map((o) => `${side} ${o} rib`), ...ORD.slice(0, 7).map((o) => `${side} ${o} costal cartilage`)];
const CERVICAL = ['atlas', 'axis', ...ORD.slice(2, 7).map((o) => `${o} cervical vertebra`)];
const THORACIC = ORD.map((o) => `${o} thoracic vertebra`);
const LUMBAR = ORD.slice(0, 5).map((o) => `${o} lumbar vertebra`);
const PELVIS = ['right hip bone', 'left hip bone', 'sacrum']; // 4.0 에도 미골 메시는 따로 없음 (sacrum 에 포함)
const HAND = [
  ...['scaphoid', 'lunate', 'triquetral', 'pisiform', 'trapezium', 'trapezoid', 'capitate', 'hamate'].map((b) => `right ${b}`),
  ...ORD.slice(0, 5).map((o) => `right ${o} metacarpal bone`),
  ...FINGERS.map((f) => `proximal phalanx of right ${f}`),
  ...FINGERS.slice(1).map((f) => `middle phalanx of right ${f}`),
  ...FINGERS.map((f) => `distal phalanx of right ${f}`),
];
const FOOT = [
  'right talus', 'right calcaneus', 'navicular bone of right foot', 'right cuboid bone',
  'right medial cuneiform bone', 'right intermediate cuneiform bone', 'right lateral cuneiform bone',
  ...ORD.slice(0, 5).map((o) => `right ${o} metatarsal bone`),
  ...TOES.map((t) => `proximal phalanx of right ${t}`),
  ...TOES.slice(1).map((t) => `middle phalanx of right ${t}`),
  ...TOES.map((t) => `distal phalanx of right ${t}`),
];

const ASSEMBLIES = {
  muscle_upper: [
    M('deltoid', 'clavicular part of right deltoid', 'acromial part of right deltoid', 'spinal part of right deltoid'),
    M('supraspinatus', 'right supraspinatus'),
    M('infraspinatus', 'right infraspinatus muscle'),
    M('teres_minor', 'right teres minor'),
    M('teres_major', 'right teres major'),
    M('subscapularis', 'right subscapularis'),
    M('pectoralis_major', 'clavicular part of right pectoralis major', 'sternocostal part of right pectoralis major', 'abdominal part of right pectoralis major'),
    M('pectoralis_minor', 'right pectoralis minor'),
    M('trapezius', 'descending part of right trapezius', 'transverse part of right trapezius', 'ascending part of right trapezius'),
    M('rhomboid', 'right rhomboid major', 'right rhomboid minor'),
    M('levator_scapulae', 'right levator scapulae'),
    M('serratus_anterior', 'right serratus anterior'),
    M('biceps_brachii', 'long head of right biceps brachii', 'short head of right biceps brachii'),
    M('brachialis', 'right brachialis'),
    M('coracobrachialis', 'right coracobrachialis'),
    M('triceps_brachii', 'long head of right triceps brachii', 'lateral head of right triceps brachii', 'medial head of right triceps brachii'),
    M('anconeus', 'right anconeus'),
    M('brachioradialis', 'right brachioradialis'),
    M('pronator_teres', 'humeral head of right pronator teres', 'ulnar head of right pronator teres'),
    M('flexor_carpi_radialis', 'right flexor carpi radialis'),
    M('palmaris_longus', 'right palmaris longus'),
    M('flexor_carpi_ulnaris', 'humeral head of right flexor carpi ulnaris', 'ulnar head of right flexor carpi ulnaris'),
    M('flexor_digitorum_superficialis', 'right flexor digitorum superficialis'),
    M('flexor_digitorum_profundus', 'right flexor digitorum profundus'),
    M('flexor_pollicis_longus', 'right flexor pollicis longus'),
    M('pronator_quadratus', 'right pronator quadratus'),
    M('supinator', 'right supinator'),
    M('extensor_carpi_radialis_longus', 'right extensor carpi radialis longus'),
    M('extensor_carpi_radialis_brevis', 'right extensor carpi radialis brevis'),
    M('extensor_carpi_ulnaris', 'right extensor carpi ulnaris'),
    M('extensor_digitorum', 'right extensor digitorum'),
    M('abductor_pollicis_longus', 'right abductor pollicis longus'),
    M('extensor_pollicis_longus', 'right extensor pollicis longus'),
    M('extensor_pollicis_brevis', 'right extensor pollicis brevis'),
    M('abductor_pollicis_brevis', 'right abductor pollicis brevis'),
    M('adductor_pollicis', 'oblique head of right adductor pollicis', 'transverse head of right adductor pollicis'),
    M('opponens_pollicis', 'right opponens pollicis'),
    M('lumbricals', 'set of lumbricals of right hand'),
    M('interossei', 'set of dorsal interossei of right hand', 'set of palmar interossei of right hand'),
    B('b_clavicle', ['right clavicle']),
    B('b_scapula', ['right scapula']),
    B('b_humerus', ['right humerus']),
    B('b_radius', ['right radius']),
    B('b_ulna', ['right ulna']),
    B('b_hand', HAND),
    B('b_thorax', [...STERNUM, ...ribs('right')], { note: 'sternum + right ribs and right costal cartilages' }),
    B('b_spine_ct', [...CERVICAL, ...THORACIC], { note: 'cervical + thoracic vertebrae (no disks)' }),
    B('b_skull', SKULL),
  ],
  muscle_lower: [
    M('gluteus_maximus', 'right gluteus maximus'),
    M('gluteus_medius', 'right gluteus medius'),
    M('gluteus_minimus', 'right gluteus minimus'),
    M('piriformis', 'right piriformis'),
    M('tensor_fasciae_latae', 'right tensor fasciae latae'),
    M('psoas_major', 'right psoas major'),
    M('iliacus', 'right iliacus'),
    M('obturator_internus', 'right obturator internus'),
    M('quadratus_femoris', 'right quadratus femoris'),
    M('sartorius', 'right sartorius'),
    M('rectus_femoris', 'right rectus femoris'),
    M('vastus_lateralis', 'right vastus lateralis'),
    M('vastus_medialis', 'right vastus medialis'),
    M('vastus_intermedius', 'right vastus intermedius'),
    M('adductor_longus', 'right adductor longus'),
    M('adductor_brevis', 'right adductor brevis'),
    // FMA 에서 adductor minimus 는 adductor magnus 의 윗부분 (BodyParts3D 는 따로 떼어 둠) -> 합침
    M('adductor_magnus', 'right adductor magnus', 'right adductor minimus'),
    M('gracilis', 'right gracilis'),
    M('pectineus', 'right pectineus'),
    M('biceps_femoris', 'long head of right biceps femoris', 'short head of right biceps femoris'),
    M('semitendinosus', 'right semitendinosus'),
    M('semimembranosus', 'right semimembranosus'),
    M('gastrocnemius', 'medial head of right gastrocnemius', 'lateral head of right gastrocnemius'),
    M('soleus', 'right soleus'),
    M('plantaris', 'right plantaris'),
    M('popliteus', 'right popliteus'),
    M('tibialis_anterior', 'right tibialis anterior'),
    M('tibialis_posterior', 'right tibialis posterior'),
    M('fibularis_longus', 'right fibularis longus'),
    M('fibularis_brevis', 'right fibularis brevis'),
    M('extensor_hallucis_longus', 'right extensor hallucis longus'),
    M('flexor_hallucis_longus', 'right flexor hallucis longus'),
    M('extensor_digitorum_longus', 'right extensor digitorum longus'),
    M('flexor_digitorum_longus', 'right flexor digitorum longus'),
    M('abductor_hallucis', 'right abductor hallucis'),
    M('flexor_digitorum_brevis', 'right flexor digitorum brevis'),
    B('b_pelvis', PELVIS, { note: 'both hip bones + sacrum (coccyx is part of the BodyParts3D sacrum mesh)' }),
    B('b_lumbar', LUMBAR),
    B('b_femur', ['right femur']),
    B('b_patella', ['right patella']),
    B('b_tibia', ['right tibia']),
    B('b_fibula', ['right fibula']),
    B('b_foot', FOOT),
  ],
};

// 3.0 판 몸통·머리 근육 (좌우 둘 다 한 노드로)
const LR = (n) => [`right ${n}`, `left ${n}`];
const SKULL3 = [...SKULL.filter((b) => b !== 'mandible')];
const TEETH = ['upper', 'lower'].flatMap((jaw) => ['right', 'left'].flatMap((side) => [
  `${side} ${jaw} central secondary incisor tooth`, `${side} ${jaw} lateral secondary incisor tooth`, `${side} ${jaw} secondary canine tooth`,
  `${side} ${jaw} first secondary premolar tooth`, `${side} ${jaw} second secondary premolar tooth`,
  `${side} ${jaw} first secondary molar tooth`, `${side} ${jaw} second secondary molar tooth`,
]));
const THORAX3 = [...STERNUM, ...ribs('right'), ...ribs('left'), 'right clavicle', 'left clavicle'];
const ASSEMBLIES_V3 = {
  muscle_trunk: [
    M('sternocleidomastoid', ...LR('sternocleidomastoid')),
    M('external_oblique', ...LR('external oblique')),
    M('internal_oblique', ...LR('internal oblique')),
    M('transversus_abdominis', ...LR('transversus abdominis')),
    M('rectus_abdominis', ...LR('rectus abdominis')),
    M('quadratus_lumborum', ...LR('quadratus lumborum')),
    M('latissimus_dorsi', ...LR('latissimus dorsi')),
    M('erector_spinae', ...['iliocostalis lumborum', 'iliocostalis thoracis', 'iliocostalis cervicis', 'longissimus thoracis', 'longissimus cervicis',
      'longissimus capitis', 'spinalis thoracis', 'spinalis cervicis'].flatMap(LR)),
    M('multifidus', ...LR('multifidus')),
    M('splenius_capitis', ...LR('splenius capitis')),
    M('semispinalis_capitis', ...LR('semispinalis capitis')),
    M('diaphragm', 'diaphragm'),
    M('external_intercostal', 'external intercostal muscle'),
    M('internal_intercostal', 'internal intercostal muscle'),
    M('scalenes', ...['scalenus anterior', 'scalenus medius', 'scalenus posterior'].flatMap(LR)),
    M('levator_ani', ...['pubococcygeus', 'puborectalis', 'iliococcygeus'].flatMap(LR)),
    B('b_skull', SKULL),
    B('b_cervical', CERVICAL),
    B('b_thorax', THORAX3, { note: 'sternum + both sides ribs/costal cartilages 1-7 + both clavicles' }),
    B('b_spine_tl', [...THORACIC, ...LUMBAR]),
    B('b_pelvis', PELVIS, { note: 'both hip bones + sacrum (coccyx is part of the BodyParts3D sacrum mesh)' }),
    B('b_arms', [...LR('scapula'), ...LR('humerus')]),
  ],
  muscle_head: [
    M('platysma', ...LR('platysma')),
    M('digastric', ...['anterior belly of', 'posterior belly of'].flatMap((b) => [`${b} right digastric`, `${b} left digastric`])),
    M('mylohyoid', ...LR('mylohyoid')),
    M('sternohyoid', ...LR('sternohyoid')),
    M('omohyoid', ...LR('omohyoid')),
    M('masseter', ...['superficial part of', 'deep part of'].flatMap((b) => [`${b} right masseter`, `${b} left masseter`])),
    M('temporalis', ...LR('temporalis')),
    M('medial_pterygoid', ...LR('medial pterygoid')),
    M('lateral_pterygoid', ...['upper head of', 'lower head of'].flatMap((b) => [`${b} right lateral pterygoid`, `${b} left lateral pterygoid`])),
    M('orbicularis_oculi', ...['orbital part of', 'palpebral part of'].flatMap((b) => [`${b} right orbicularis oculi`, `${b} left orbicularis oculi`])),
    M('orbicularis_oris', 'orbicularis oris'),
    M('zygomaticus_major', ...LR('zygomaticus major')),
    M('buccinator', ...LR('buccinator')),
    M('mentalis', ...LR('mentalis')),
    B('b_skull', SKULL3, { note: 'skull without mandible' }),
    B('b_mandible', ['mandible']),
    B('b_teeth', TEETH),
    B('b_hyoid', ['hyoid bone']),
    B('b_cervical', CERVICAL),
    B('b_shoulder', [...STERNUM, ...LR('clavicle'), ...LR('scapula'), 'right first rib', 'left first rib']),
  ],
};

// 근육 노드 삼각형 상한 / 세분화 기준 (파일=갈래 하나의 원본 삼각형 수)
const MUSCLE_CAP = V3 ? 7000 : 9000; // 노드 하나의 최대 삼각형 수 (넘으면 단순화)
const SUBDIV2_BELOW = 1200; // 이보다 작으면 Loop 2단계 (x16)
const SUBDIV1_BELOW = 4500; // 이보다 작으면 Loop 1단계 (x4)
const MUSCLE_ERROR = 0.002; // 단순화 오차 한계 (메시 크기 대비)
const BONE_CAP = { b_teeth: 6000, b_mandible: 6000, b_arms: 8000, b_spine_tl: 12000, b_shoulder: 8000, b_scapula: 6000, b_skull: 16000, b_thorax: 12000, b_spine_ct: 14000, b_cervical: 8000, b_pelvis: 10000, b_lumbar: 6000 };
const BONE_CAP_DEFAULT = 5000;
const BONE_ERROR = 0.01;

// ---------------------------------------------------------------- 원본 색인
const concepts = new Map(); // 개념 이름 -> {fma, files:Set}
for (const line of fs.readFileSync(elementList, 'utf8').split(/\r?\n/).slice(1)) {
  let [fma, name, fj] = line.split('\t').map((c) => c?.trim().replace(/^"|"$/g, ''));
  if (V3) fj = fma; // 3.0: 파일 이름 = 개념 id
  if (!fma || !name || !fj) continue;
  if (!concepts.has(name)) concepts.set(name, { fma, files: new Set() });
  concepts.get(name).files.add(fj);
}
const headers = new Map(); // English name (소문자) -> [{fj, fma, name}]
if (V3) {
  for (const [name, e] of concepts) for (const fj of e.files) {
    if (!fs.existsSync(path.join(objDir, `${fj}.obj`))) continue;
    const k = name.toLowerCase();
    if (!headers.has(k)) headers.set(k, []);
    headers.get(k).push({ fj, fma: e.fma, name });
  }
}
for (const f of V3 ? [] : fs.readdirSync(objDir)) {
  if (!f.endsWith('.obj')) continue;
  const fd = fs.openSync(path.join(objDir, f), 'r');
  const buf = Buffer.alloc(2048);
  fs.readSync(fd, buf, 0, 2048, 0);
  fs.closeSync(fd);
  const head = buf.toString('utf8');
  const name = (head.match(/# English name : (.*)/) || [])[1]?.trim();
  const fma = (head.match(/# Concept ID : (.*)/) || [])[1]?.trim();
  if (!name) continue;
  const k = name.toLowerCase();
  if (!headers.has(k)) headers.set(k, []);
  headers.get(k).push({ fj: f.slice(0, -4), fma, name });
}

// ---------------------------------------------------------------- 메시 도구
function readObj(file) {
  const pos = [];
  const idx = [];
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.startsWith('v ')) {
      const [, x, y, z] = line.trim().split(/\s+/).map(Number);
      pos.push(x / 1000, z / 1000, -y / 1000); // BP3D(mm, X=L, Y=P, Z=S) -> glTF(m, X=L, Y=S, Z=A)
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

// 같은 자리(0.1 µm 격자) 정점 합치기 + 퇴화·중복 삼각형 제거
function weldMesh(pos, idx) {
  const key = new Map();
  const remap = new Uint32Array(pos.length / 3);
  const P = [];
  for (let v = 0; v < pos.length / 3; v++) {
    const k = `${Math.round(pos[v * 3] * 1e7)},${Math.round(pos[v * 3 + 1] * 1e7)},${Math.round(pos[v * 3 + 2] * 1e7)}`;
    if (!key.has(k)) { key.set(k, P.length / 3); P.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); }
    remap[v] = key.get(k);
  }
  const I = [];
  const seen = new Set();
  for (let t = 0; t < idx.length; t += 3) {
    const a = remap[idx[t]], b = remap[idx[t + 1]], c = remap[idx[t + 2]];
    if (a === b || b === c || a === c) continue;
    const s = [a, b, c].sort((x, y) => x - y).join(',');
    if (seen.has(s)) continue;
    seen.add(s);
    I.push(a, b, c);
  }
  return { pos: P, idx: I };
}

// 연결 성분 정리. 원본 메시는 닫힌 다양체이고 감김도 일관되지만, 감축 과정에서 생긴
// 0.x mm 크기의 납작한 찌꺼기 조각(2~8 삼각형, 부피 ~0)이 수십 개씩 붙어 있다.
// 부피가 파일 전체의 0.3% 미만인 성분은 버린다. 부피가 음수인 성분은 큰 성분 안의 빈 공간(안쪽 껍질)이다
// (예: 대흉근 흉늑부 401.15 cc 바깥 껍질 + -4.04 cc 안쪽 껍질 = 헤더 부피 397.1 cc). 밖에서 보이지 않으니 버린다.
const MIN_COMPONENT_VOLUME = 0.003;
function cleanComponents(pos, idx) {
  const n = pos.length / 3;
  const par = new Int32Array(n).map((_, i) => i);
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  for (let t = 0; t < idx.length; t += 3) { par[find(idx[t])] = find(idx[t + 1]); par[find(idx[t + 1])] = find(idx[t + 2]); }
  const vol = new Map();
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [idx[t] * 3, idx[t + 1] * 3, idx[t + 2] * 3];
    const v = pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1])
      - pos[a + 1] * (pos[b] * pos[c + 2] - pos[b + 2] * pos[c])
      + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]);
    const r = find(idx[t]);
    vol.set(r, (vol.get(r) || 0) + v);
  }
  const total = [...vol.values()].reduce((s, v) => s + Math.abs(v), 0);
  const keep = new Map([...vol].filter(([, v]) => v >= MIN_COMPONENT_VOLUME * total));
  const I = [];
  let droppedTris = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const v = keep.get(find(idx[t]));
    if (v === undefined) { droppedTris++; continue; }
    I.push(idx[t], idx[t + 1], idx[t + 2]);
  }
  // 쓰지 않는 정점 제거
  const remap = new Map();
  const P = [];
  for (let i = 0; i < I.length; i++) {
    const v = I[i];
    if (!remap.has(v)) { remap.set(v, P.length / 3); P.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); }
    I[i] = remap.get(v);
  }
  return {
    pos: P, idx: I, components: vol.size, kept: keep.size, droppedTris,
    cavities: [...vol.values()].filter((v) => v < -MIN_COMPONENT_VOLUME * total).length,
  };
}

// Loop 세분화 한 단계. 테두리·비다양체 변(면이 2개가 아닌 변)은 주름(crease)으로 다룬다.
function loopSubdivide(pos, idx) {
  const nv = pos.length / 3;
  const edgeFaces = new Map(); // "a,b"(a<b) -> [대향 정점...]
  const ek = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);
  for (let t = 0; t < idx.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = idx[t + e], b = idx[t + (e + 1) % 3], c = idx[t + (e + 2) % 3];
    const k = ek(a, b);
    if (!edgeFaces.has(k)) edgeFaces.set(k, []);
    edgeFaces.get(k).push(c);
  }
  const nbr = Array.from({ length: nv }, () => new Set());
  const crease = Array.from({ length: nv }, () => []);
  for (const [k, opp] of edgeFaces) {
    const [a, b] = k.split(',').map(Number);
    nbr[a].add(b); nbr[b].add(a);
    if (opp.length !== 2) { crease[a].push(b); crease[b].push(a); }
  }
  const P = new Array(pos.length);
  for (let v = 0; v < nv; v++) {
    const p = [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]];
    let q;
    if (crease[v].length === 2) {
      const [a, b] = crease[v];
      q = p.map((x, i) => 0.75 * x + 0.125 * (pos[a * 3 + i] + pos[b * 3 + i]));
    } else if (crease[v].length > 0) {
      q = p; // 모서리(corner): 고정
    } else {
      const n = nbr[v].size;
      const beta = n === 3 ? 3 / 16 : 3 / (8 * n);
      const s = [0, 0, 0];
      for (const u of nbr[v]) for (let i = 0; i < 3; i++) s[i] += pos[u * 3 + i];
      q = p.map((x, i) => (1 - n * beta) * x + beta * s[i]);
    }
    P[v * 3] = q[0]; P[v * 3 + 1] = q[1]; P[v * 3 + 2] = q[2];
  }
  const mid = new Map();
  for (const [k, opp] of edgeFaces) {
    const [a, b] = k.split(',').map(Number);
    const m = P.length / 3;
    for (let i = 0; i < 3; i++) {
      P.push(opp.length === 2
        ? 0.375 * (pos[a * 3 + i] + pos[b * 3 + i]) + 0.125 * (pos[opp[0] * 3 + i] + pos[opp[1] * 3 + i])
        : 0.5 * (pos[a * 3 + i] + pos[b * 3 + i]));
    }
    mid.set(k, m);
  }
  const I = [];
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]];
    const ab = mid.get(ek(a, b)), bc = mid.get(ek(b, c)), ca = mid.get(ek(c, a));
    I.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
  }
  return { pos: P, idx: I };
}

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

function bbox(pos) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i++) { const k = i % 3; if (pos[i] < min[k]) min[k] = pos[i]; if (pos[i] > max[k]) max[k] = pos[i]; }
  const r = (x) => Math.round(x * 1e5) / 1e5;
  return { min: min.map(r), max: max.map(r) };
}

function append(dst, src) {
  const base = dst.pos.length / 3;
  for (const v of src.pos) dst.pos.push(v);
  for (const i of src.idx) dst.idx.push(i + base);
}

// ---------------------------------------------------------------- 노드 만들기
function resolveFiles(item) {
  const files = []; // {fj, fma, name}
  const missing = [];
  if (item.kind === 'muscle') {
    for (const c of item.concepts) {
      const e = concepts.get(c);
      if (!e) { missing.push(c); continue; }
      let found = 0;
      for (const fj of e.files) {
        if (!fs.existsSync(path.join(objDir, `${fj}.obj`))) continue;
        if (files.some((f) => f.fj === fj)) continue;
        files.push({ fj, fma: e.fma, name: c });
        found++;
      }
      if (!found) missing.push(c);
    }
  } else {
    for (const n of item.names) {
      const hs = headers.get(n.toLowerCase());
      if (!hs) { missing.push(n); continue; }
      for (const h of hs) files.push({ fj: h.fj, fma: h.fma, name: h.name });
    }
  }
  return { files, missing };
}

function buildMesh(item, files) {
  const out = { pos: [], idx: [] };
  const parts = [];
  for (const f of files) {
    const raw = readObj(path.join(objDir, `${f.fj}.obj`));
    const w = weldMesh(raw.pos, raw.idx);
    const m = cleanComponents(w.pos, w.idx);
    const src = m.idx.length / 3;
    let level = 0;
    if (item.kind === 'muscle') level = src < SUBDIV2_BELOW ? 2 : src < SUBDIV1_BELOW ? 1 : 0;
    let s = m;
    for (let l = 0; l < level; l++) s = loopSubdivide(s.pos, s.idx);
    parts.push({ fj: f.fj, name: f.name, srcTris: src, subdiv: level, components: m.components, kept: m.kept, droppedTris: m.droppedTris, cavities: m.cavities });
    append(out, s);
  }
  return { ...out, parts };
}

// ---------------------------------------------------------------- 빌드
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
fs.mkdirSync(outDir, { recursive: true });

const manifestPath = path.join(outDir, 'manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { files: {} };
const MUSCLE_REMARKS = [
  'muscle_trunk.glb and muscle_head.glb come from BodyParts3D 3.0 (obj_95), the same reconstruction as the bone files; both sides of each muscle are merged into one node.',
  'muscle_upper.glb and muscle_lower.glb come from BodyParts3D 4.0 (isa_BP3D_4.0_obj_99), a different reconstruction from the 3.0 bones in spine/arm/hand/pelvis/leg/foot.glb: upper-limb bones sit ~10-17 mm lower, leg bones are longer (femur 466 vs 440 mm, tibia 380 vs 347 mm). Show muscles with the context bones inside the same muscle file (nodes "b_*", extras.kind = "bone"), not over the 3.0 bone files.',
  'muscle_*.glb: muscle nodes have extras.kind = "muscle" and material "muscle"; branches/heads/parts of one muscle are merged into one node (extras.name_en lists them). Small muscles were Loop-subdivided for smooth shading (volume change <= 6%).',
];
manifest.remarks = [...(manifest.remarks || []).filter((r) => !r.startsWith('muscle_')), ...MUSCLE_REMARKS];
const report = [];
const notFound = [];

for (const [file, items] of Object.entries(V3 ? ASSEMBLIES_V3 : ASSEMBLIES)) {
  const doc = new Document();
  doc.createBuffer();
  const scene = doc.createScene(file);
  const muscleMat = doc.createMaterial('muscle').setBaseColorFactor([0.72, 0.2, 0.18, 1]).setRoughnessFactor(0.6).setMetallicFactor(0);
  const boneMat = doc.createMaterial('bone').setBaseColorFactor([0.89, 0.85, 0.76, 1]).setRoughnessFactor(0.75).setMetallicFactor(0);
  const entry = { nodes: {}, missing: [] };

  for (const item of items) {
    const { files, missing } = resolveFiles(item);
    if (missing.length) notFound.push(`${file}/${item.node}: ${missing.join(' | ')}`);
    if (!files.length) { entry.missing.push(item.node); continue; }
    const mesh = buildMesh(item, files);
    const srcTris = mesh.parts.reduce((s, p) => s + p.srcTris, 0);
    const prim = doc.createPrimitive()
      .setMaterial(item.kind === 'muscle' ? muscleMat : boneMat)
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(mesh.pos)))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(mesh.idx)));
    const cap = item.kind === 'muscle' ? MUSCLE_CAP : (BONE_CAP[item.node] ?? BONE_CAP_DEFAULT);
    const before = mesh.idx.length / 3;
    if (before > cap) {
      simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: cap / before, error: item.kind === 'muscle' ? MUSCLE_ERROR : BONE_ERROR });
    }
    const pos = prim.getAttribute('POSITION').getArray();
    const idx = prim.getIndices().getArray();
    prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(smoothNormals(pos, idx)));
    const extras = {
      kind: item.kind,
      fma: [...new Set(files.map((f) => f.fma))],
      name_en: [...new Set(files.map((f) => f.name))],
      bp3d: files.map((f) => f.fj),
      ...(item.note ? { note: item.note } : {}),
    };
    const node = doc.createNode(item.node).setMesh(doc.createMesh(item.node).addPrimitive(prim)).setExtras(extras);
    scene.addChild(node);
    entry.nodes[item.node] = {
      kind: item.kind, srcTris, afterSubdiv: before, triangles: idx.length / 3, bbox: bbox(pos),
      parts: mesh.parts,
    };
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
    source: V3 ? 'BodyParts3D 3.0 obj_95 (DBCLS), CC BY-SA 2.1 JP' : 'BodyParts3D 4.0 isa_BP3D_4.0_obj_99 (DBCLS), CC BY-SA 2.1 JP',
    bytes,
    triangles: totalTris,
    nodes: Object.fromEntries(Object.entries(entry.nodes).map(([k, v]) => [k, { kind: v.kind, bbox: v.bbox, triangles: v.triangles }])),
    missing: entry.missing,
  };
  report.push(`${file}.glb  ${(bytes / 1024).toFixed(0)} KB  tris=${totalTris}  missing=[${entry.missing.join(',')}]`);
  for (const [k, v] of Object.entries(entry.nodes)) {
    const sub = v.parts.map((p) => p.subdiv).join('/');
    const cav = v.parts.reduce((s, p) => s + p.cavities, 0);
    const kept = v.parts.reduce((s, p) => s + p.kept, 0);
    const comps = v.parts.reduce((s, p) => s + p.components, 0);
    const dropped = v.parts.reduce((s, p) => s + p.droppedTris, 0);
    report.push(`   ${k.padEnd(32)} src ${String(v.srcTris).padStart(6)}  subdiv ${sub.padEnd(6)} -> ${String(v.afterSubdiv).padStart(6)} -> ${String(v.triangles).padStart(6)}  files ${v.parts.length}  pieces ${kept}/${comps} (dropped ${dropped} tris)${cav ? `  incl. ${cav} inner cavity shell(s)` : ''}`);
  }
}

const json = JSON.stringify(manifest, null, 2).replace(/\[\s+(-?[\d.e-]+),\s+(-?[\d.e-]+),\s+(-?[\d.e-]+)\s+\]/g, '[$1, $2, $3]');
fs.writeFileSync(manifestPath, json + '\n');
console.log(report.join('\n'));
if (notFound.length) console.log('NOT FOUND:\n  ' + notFound.join('\n  '));
const total = Object.entries(manifest.files).filter(([k]) => k.startsWith('muscle_')).reduce((s, [, f]) => s + f.bytes, 0);
console.log(`muscle files total ${(total / 1024 / 1024).toFixed(2)} MB`);
