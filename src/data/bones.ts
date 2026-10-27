// 게임에 나오는 뼈 73개 — 척추 · 어깨와 팔 · 골반과 다리 (사용자 확정 48개) + 머리 · 가슴 (2026-10-25 추가)
// ko = 옛 한자어 용어, tag = 같은 이름이 둘일 때 화면에만 붙는 꼬리표
// model = 3D 조립 파일(public/models/<file>.glb)의 노드 — hl 은 강조, show 는 흐린 맥락(없으면 hl 만), showPhone 은 폰에서 더 넓게 보여 줄 맥락

export type ModelFile = 'spine' | 'arm' | 'hand' | 'pelvis' | 'leg' | 'foot' | 'skull' | 'thorax' | 'muscle_upper' | 'muscle_lower' | 'muscle_trunk' | 'muscle_head' | 'nerve_upper' | 'nerve_lower' | 'nerve_spine' | 'nerve_head';
export type ModelRef = {file: ModelFile; hl: string[]; show?: string[]; showPhone?: string[]};
export type Bone = {
  id: string;
  ko: string;
  en: string;
  tag?: {ko: string; en: string};
  region: string;
  model: ModelRef;
  sentence: {ko: string; en: string};
  // 문장 문제로 뽑힌 것: sid = 문장 번호가 붙은 문제 이름(id 또는 id#k), nat = 우리말 문장
  sid?: string;
  nat?: string;
};

const r = (a: number, b: number, p: string) => Array.from({length: b - a + 1}, (_, i) => `${p}${a + i}`);
const C = r(1, 7, 'C');
const T = r(1, 12, 'T');
const L = r(1, 5, 'L');
const CARPALS = ['scaphoid', 'lunate', 'triquetrum', 'pisiform', 'trapezium', 'trapezoid', 'capitate', 'hamate'];
const MC = r(1, 5, 'mc');
const PP = r(1, 5, 'pp');
const MP = r(2, 5, 'mp');
const DP = r(1, 5, 'dp');
const HAND = [...CARPALS, ...MC, ...PP, ...MP, ...DP];
const TARSALS = ['talus', 'calcaneus', 'navicular', 'cuboid', 'cuneiform_med', 'cuneiform_int', 'cuneiform_lat'];
const MT = r(1, 5, 'mt');
const FPP = r(1, 5, 'fpp');
const FMP = r(2, 5, 'fmp');
const FDP = r(1, 5, 'fdp');
const FOOT = [...TARSALS, ...MT, ...FPP, ...FMP, ...FDP];
const WRIST = [...CARPALS, ...MC];
// 머리 (skull.glb) — 좌우 짝은 _r/_l
const LR = (n: string) => [`${n}_r`, `${n}_l`];
const SKULL = ['frontal', ...LR('parietal'), ...LR('temporal'), 'occipital', 'sphenoid', 'ethmoid', ...LR('nasal'), ...LR('lacrimal'), ...LR('zygomatic'),
  ...LR('maxilla'), 'mandible', ...LR('palatine'), 'vomer', ...LR('concha')];
const HEAD = [...SKULL, 'teeth_upper', 'teeth_lower', 'hyoid', 'C1', 'C2', 'C3', 'C4'];
const FACE = [...LR('maxilla'), ...LR('zygomatic'), ...LR('nasal'), ...LR('lacrimal'), 'ethmoid', 'vomer', ...LR('palatine'), ...LR('concha'), 'teeth_upper'];
// 가슴 (thorax.glb) — 갈비뼈 r1..r12 / l1..l12, 갈비연골 cc_r1..7 / cc_l1..7
const STERNUM = ['manubrium', 'sternum_body', 'xiphoid'];
const RIBS = [...r(1, 12, 'r'), ...r(1, 12, 'l')];
const CC = [...r(1, 7, 'cc_r'), ...r(1, 7, 'cc_l')];
const THORAX = [...STERNUM, ...RIBS, ...CC, ...T, 'clavicle_r', 'clavicle_l'];
const CHEST_FRONT = [...STERNUM, ...CC, ...r(1, 7, 'r'), ...r(1, 7, 'l'), 'clavicle_r', 'clavicle_l'];
const FACE_T = {ko: '얼굴', en: 'face'};
const MIDFOOT = [...TARSALS, ...MT];

export const BONES: Bone[] = [
  // ── 척추
  {id: 'atlas', ko: '환추', en: 'Atlas', region: 'spine', model: {file: 'spine', hl: ['C1'], show: ['C1', 'C2']},
    sentence: {ko: '환추는 머리를 받치는 첫 번째 경추로, 추체가 없다.', en: 'The atlas is the first cervical vertebra and has no vertebral body.'}},
  {id: 'axis', ko: '축추', en: 'Axis', region: 'spine', model: {file: 'spine', hl: ['C2'], show: ['C1', 'C2']},
    sentence: {ko: '축추의 치돌기를 축으로 환추가 돌며 고개를 좌우로 돌린다.', en: 'The atlas pivots around the dens of the axis to turn the head.'}},
  {id: 'cervical', ko: '경추', en: 'Cervical vertebrae', region: 'spine', model: {file: 'spine', hl: C},
    sentence: {ko: '경추는 일곱 개이며, 횡돌기에 구멍이 있는 것이 특징이다.', en: 'There are seven cervical vertebrae, each with a hole in its transverse process.'}},
  {id: 'thoracic', ko: '흉추', en: 'Thoracic vertebrae', region: 'spine', model: {file: 'spine', hl: T},
    sentence: {ko: '흉추는 열두 개이며, 늑골과 관절을 이룬다.', en: 'There are twelve thoracic vertebrae, and they articulate with the ribs.'}},
  {id: 'lumbar', ko: '요추', en: 'Lumbar vertebrae', region: 'spine', model: {file: 'spine', hl: L},
    sentence: {ko: '요추는 다섯 개로, 체중을 가장 많이 받아 추체가 가장 크다.', en: 'The five lumbar vertebrae carry the most weight and have the largest bodies.'}},
  {id: 'sacrum', ko: '천골', en: 'Sacrum', region: 'spine', model: {file: 'spine', hl: ['sacrum'], show: ['sacrum', 'coccyx']},
    sentence: {ko: '천골은 다섯 개의 천추가 하나로 붙어 만들어진다.', en: 'The sacrum is formed by five fused sacral vertebrae.'}},
  {id: 'coccyx', ko: '미골', en: 'Coccyx', region: 'spine', model: {file: 'spine', hl: ['coccyx'], show: ['sacrum', 'coccyx']},
    sentence: {ko: '미골은 흔히 꼬리뼈라고 부르며, 엉덩방아를 찧으면 다치기 쉽다.', en: 'The coccyx, or tailbone, is easily injured when you fall on your bottom.'}},

  // ── 어깨와 팔
  {id: 'clavicle', ko: '쇄골', en: 'Clavicle', region: 'upper', model: {file: 'arm', hl: ['clavicle']},
    sentence: {ko: '쇄골 골절은 대부분 뼈의 중간 부분에서 생긴다.', en: 'Most clavicle fractures happen in the middle part of the bone.'}},
  {id: 'scapula', ko: '견갑골', en: 'Scapula', region: 'upper', model: {file: 'arm', hl: ['scapula']},
    sentence: {ko: '견갑골은 열일곱 개의 근육이 붙는 넓적한 뼈다.', en: 'The scapula is a flat bone with seventeen muscle attachments.'}},
  {id: 'humerus', ko: '상완골', en: 'Humerus', region: 'upper', model: {file: 'arm', hl: ['humerus']},
    sentence: {ko: '상완골 간부 골절은 요골신경 손상을 동반할 수 있다.', en: 'A humeral shaft fracture can injure the radial nerve.'}},
  {id: 'radius', ko: '요골', en: 'Radius', region: 'upper', model: {file: 'arm', hl: ['radius'], show: ['radius', 'ulna']},
    sentence: {ko: '요골 원위부 골절은 넘어지며 손을 짚을 때 흔히 생긴다.', en: 'Distal radius fractures often happen when you fall on an outstretched hand.'}},
  {id: 'ulna', ko: '척골', en: 'Ulna', region: 'upper', model: {file: 'arm', hl: ['ulna'], show: ['radius', 'ulna']},
    sentence: {ko: '척골은 팔꿈치 쪽에서 크고 손목 쪽으로 갈수록 가늘어진다.', en: 'The ulna is large at the elbow and narrows toward the wrist.'}},
  {id: 'scaphoid', ko: '주상골', en: 'Scaphoid', tag: {ko: '손', en: 'hand'}, region: 'upper', model: {file: 'hand', hl: ['scaphoid'], show: WRIST, showPhone: HAND},
    sentence: {ko: '손의 주상골은 혈액 공급이 나빠 골절 뒤 잘 붙지 않는다.', en: 'The scaphoid has a poor blood supply, so its fractures often fail to heal.'}},
  {id: 'lunate', ko: '월상골', en: 'Lunate', region: 'upper', model: {file: 'hand', hl: ['lunate'], show: WRIST, showPhone: HAND},
    sentence: {ko: '월상골은 반달 모양이며, 탈구되면 정중신경을 누를 수 있다.', en: 'The lunate is crescent shaped and can press on the median nerve when dislocated.'}},
  {id: 'triquetrum', ko: '삼각골', en: 'Triquetrum', region: 'upper', model: {file: 'hand', hl: ['triquetrum'], show: WRIST, showPhone: HAND},
    sentence: {ko: '삼각골은 손목의 척측에 있으며 두상골과 관절을 이룬다.', en: 'The triquetrum sits on the ulnar side of the wrist and meets the pisiform.'}},
  {id: 'pisiform', ko: '두상골', en: 'Pisiform', region: 'upper', model: {file: 'hand', hl: ['pisiform'], show: WRIST, showPhone: HAND},
    sentence: {ko: '두상골은 척측수근굴근 힘줄 속에 있는 종자골이다.', en: 'The pisiform is a sesamoid bone inside the flexor carpi ulnaris tendon.'}},
  {id: 'trapezium', ko: '대능형골', en: 'Trapezium', region: 'upper', model: {file: 'hand', hl: ['trapezium'], show: WRIST, showPhone: HAND},
    sentence: {ko: '대능형골은 엄지 중수골과 안장관절을 이룬다.', en: 'The trapezium forms a saddle joint with the thumb metacarpal.'}},
  {id: 'trapezoid', ko: '소능형골', en: 'Trapezoid', region: 'upper', model: {file: 'hand', hl: ['trapezoid'], show: WRIST, showPhone: HAND},
    sentence: {ko: '소능형골은 둘째 중수골과 관절을 이룬다.', en: 'The trapezoid articulates with the second metacarpal.'}},
  {id: 'capitate', ko: '유두골', en: 'Capitate', region: 'upper', model: {file: 'hand', hl: ['capitate'], show: WRIST, showPhone: HAND},
    sentence: {ko: '유두골은 수근골 가운데 가장 큰 뼈다.', en: 'The capitate is the largest carpal bone.'}},
  {id: 'hamate', ko: '유구골', en: 'Hamate', region: 'upper', model: {file: 'hand', hl: ['hamate'], show: WRIST, showPhone: HAND},
    sentence: {ko: '유구골의 갈고리는 골프채를 휘두르다 부러지기도 한다.', en: 'The hook of the hamate can break when you swing a golf club.'}},
  {id: 'metacarpal', ko: '중수골', en: 'Metacarpals', region: 'upper', model: {file: 'hand', hl: MC, show: HAND},
    sentence: {ko: '다섯째 중수골 경부 골절을 흔히 복서 골절이라 부른다.', en: 'A fracture of the fifth metacarpal neck is called a boxer’s fracture.'}},
  {id: 'hand_pp', ko: '근위지골', en: 'Proximal phalanges', tag: {ko: '손', en: 'hand'}, region: 'upper', model: {file: 'hand', hl: PP, show: HAND},
    sentence: {ko: '손가락의 근위지골은 손가락뼈 가운데 가장 길다.', en: 'The proximal phalanges are the longest bones of the fingers.'}},
  {id: 'hand_mp', ko: '중위지골', en: 'Middle phalanges', tag: {ko: '손', en: 'hand'}, region: 'upper', model: {file: 'hand', hl: MP, show: HAND},
    sentence: {ko: '엄지에는 중위지골이 없어 손가락뼈가 두 개뿐이다.', en: 'The thumb has no middle phalanx, only two phalanges.'}},
  {id: 'hand_dp', ko: '원위지골', en: 'Distal phalanges', tag: {ko: '손', en: 'hand'}, region: 'upper', model: {file: 'hand', hl: DP, show: HAND},
    sentence: {ko: '원위지골 끝의 넓은 부분이 손톱을 받친다.', en: 'The wide tip of the distal phalanx supports the fingernail.'}},

  // ── 골반과 다리
  {id: 'hip', ko: '관골', en: 'Hip bone', tag: {ko: '골반', en: 'pelvis'}, region: 'lower', model: {file: 'pelvis', hl: ['hip_r']},
    sentence: {ko: '관골은 장골, 좌골, 치골이 청소년기에 하나로 붙어 만들어진다.', en: 'The hip bone forms when the ilium, ischium, and pubis fuse in adolescence.'}},
  {id: 'femur', ko: '대퇴골', en: 'Femur', region: 'lower', model: {file: 'leg', hl: ['femur']},
    sentence: {ko: '대퇴골은 인체에서 가장 길고 튼튼한 뼈다.', en: 'The femur is the longest and strongest bone in the body.'}},
  {id: 'patella', ko: '슬개골', en: 'Patella', region: 'lower', model: {file: 'leg', hl: ['patella'], show: ['femur', 'patella', 'tibia', 'fibula']},
    sentence: {ko: '슬개골은 인체에서 가장 큰 종자골이다.', en: 'The patella is the largest sesamoid bone in the body.'}},
  {id: 'tibia', ko: '경골', en: 'Tibia', region: 'lower', model: {file: 'leg', hl: ['tibia'], show: ['tibia', 'fibula']},
    sentence: {ko: '경골은 정강이 앞쪽 피부 바로 아래에서 만져진다.', en: 'The tibia can be felt just under the skin at the front of the shin.'}},
  {id: 'fibula', ko: '비골', en: 'Fibula', tag: {ko: '다리', en: 'leg'}, region: 'lower', model: {file: 'leg', hl: ['fibula'], show: ['tibia', 'fibula']},
    sentence: {ko: '비골은 체중을 거의 받지 않아 뼈 이식에 쓰이기도 한다.', en: 'The fibula bears little weight, so it is sometimes used as a bone graft.'}},
  {id: 'talus', ko: '거골', en: 'Talus', region: 'lower', model: {file: 'foot', hl: ['talus'], show: MIDFOOT},
    sentence: {ko: '거골에는 근육이 하나도 붙지 않는다.', en: 'No muscles attach to the talus.'}},
  {id: 'calcaneus', ko: '종골', en: 'Calcaneus', region: 'lower', model: {file: 'foot', hl: ['calcaneus'], show: MIDFOOT},
    sentence: {ko: '종골은 발에서 가장 큰 뼈로, 아킬레스건이 붙는다.', en: 'The calcaneus is the largest bone of the foot, where the Achilles tendon attaches.'}},
  {id: 'navicular', ko: '주상골', en: 'Navicular', tag: {ko: '발', en: 'foot'}, region: 'lower', model: {file: 'foot', hl: ['navicular'], show: MIDFOOT},
    sentence: {ko: '발의 주상골은 거골과 세 개의 설상골 사이에 있다.', en: 'The navicular sits between the talus and the three cuneiforms.'}},
  {id: 'cuboid', ko: '입방골', en: 'Cuboid', region: 'lower', model: {file: 'foot', hl: ['cuboid'], show: MIDFOOT},
    sentence: {ko: '입방골은 넷째와 다섯째 중족골과 관절을 이룬다.', en: 'The cuboid articulates with the fourth and fifth metatarsals.'}},
  {id: 'cun_med', ko: '내측설상골', en: 'Medial cuneiform', region: 'lower', model: {file: 'foot', hl: ['cuneiform_med'], show: MIDFOOT},
    sentence: {ko: '내측설상골은 설상골 가운데 가장 크며 첫째 중족골과 이어진다.', en: 'The medial cuneiform is the largest cuneiform and joins the first metatarsal.'}},
  {id: 'cun_int', ko: '중간설상골', en: 'Intermediate cuneiform', region: 'lower', model: {file: 'foot', hl: ['cuneiform_int'], show: MIDFOOT},
    sentence: {ko: '중간설상골은 설상골 가운데 가장 작다.', en: 'The intermediate cuneiform is the smallest cuneiform.'}},
  {id: 'cun_lat', ko: '외측설상골', en: 'Lateral cuneiform', region: 'lower', model: {file: 'foot', hl: ['cuneiform_lat'], show: MIDFOOT},
    sentence: {ko: '외측설상골은 셋째 중족골과 관절을 이룬다.', en: 'The lateral cuneiform articulates with the third metatarsal.'}},
  {id: 'metatarsal', ko: '중족골', en: 'Metatarsals', region: 'lower', model: {file: 'foot', hl: MT, show: FOOT},
    sentence: {ko: '다섯째 중족골 근위부의 골절 가운데 하나를 존스 골절이라 부른다.', en: 'A Jones fracture is a break near the base of the fifth metatarsal.'}},
  {id: 'foot_pp', ko: '근위지골', en: 'Proximal phalanges', tag: {ko: '발', en: 'foot'}, region: 'lower', model: {file: 'foot', hl: FPP, show: FOOT},
    sentence: {ko: '엄지발가락의 근위지골은 발가락뼈 가운데 가장 크다.', en: 'The proximal phalanx of the big toe is the largest toe bone.'}},
  {id: 'foot_mp', ko: '중위지골', en: 'Middle phalanges', tag: {ko: '발', en: 'foot'}, region: 'lower', model: {file: 'foot', hl: FMP, show: FOOT},
    sentence: {ko: '엄지발가락에는 중위지골이 없다.', en: 'The big toe has no middle phalanx.'}},
  {id: 'foot_dp', ko: '원위지골', en: 'Distal phalanges', tag: {ko: '발', en: 'foot'}, region: 'lower', model: {file: 'foot', hl: FDP, show: FOOT},
    sentence: {ko: '새끼발가락의 중위지골과 원위지골은 붙어 있는 경우가 많다.', en: 'In the little toe, the middle and distal phalanges are often fused.'}},

  // ── 머리
  {id: 'frontal', ko: '전두골', en: 'Frontal bone', region: 'head', model: {file: 'skull', hl: ['frontal'], show: HEAD},
    sentence: {ko: '전두골은 이마를 이루며, 안에 전두동이 있다.', en: 'The frontal bone forms the forehead and contains the frontal sinus.'}},
  {id: 'parietal', ko: '두정골', en: 'Parietal bone', region: 'head', model: {file: 'skull', hl: LR('parietal'), show: HEAD},
    sentence: {ko: '좌우 두정골은 정수리에서 시상봉합으로 만난다.', en: 'The two parietal bones meet at the sagittal suture on top of the head.'}},
  {id: 'temporal', ko: '측두골', en: 'Temporal bone', region: 'head', model: {file: 'skull', hl: LR('temporal'), show: HEAD},
    sentence: {ko: '측두골 안에는 듣고 균형을 잡는 내이가 들어 있다.', en: 'The temporal bone houses the inner ear for hearing and balance.'}},
  {id: 'occipital', ko: '후두골', en: 'Occipital bone', region: 'head', model: {file: 'skull', hl: ['occipital'], show: HEAD},
    sentence: {ko: '후두골의 대후두공으로 척수가 지나간다.', en: 'The spinal cord passes through the foramen magnum of the occipital bone.'}},
  {id: 'sphenoid', ko: '접형골', en: 'Sphenoid bone', region: 'head', model: {file: 'skull', hl: ['sphenoid'], show: HEAD},
    sentence: {ko: '접형골의 터키안에 뇌하수체가 놓인다.', en: 'The pituitary gland sits in the sella turcica of the sphenoid bone.'}},
  {id: 'ethmoid', ko: '사골', en: 'Ethmoid bone', region: 'head', model: {file: 'skull', hl: ['ethmoid'], show: FACE, showPhone: HEAD},
    sentence: {ko: '후각신경은 사골의 사판을 뚫고 지나간다.', en: 'The olfactory nerves pass through the cribriform plate of the ethmoid bone.'}},
  {id: 'nasal', ko: '비골', en: 'Nasal bone', tag: {ko: '코', en: 'nose'}, region: 'head', model: {file: 'skull', hl: LR('nasal'), show: FACE, showPhone: HEAD},
    sentence: {ko: '비골 골절은 안면골 골절 가운데 가장 흔하다.', en: 'Nasal bone fractures are the most common facial fractures.'}},
  {id: 'lacrimal', ko: '누골', en: 'Lacrimal bone', region: 'head', model: {file: 'skull', hl: LR('lacrimal'), show: FACE, showPhone: HEAD},
    sentence: {ko: '누골은 안면골 가운데 가장 작고 얇다.', en: 'The lacrimal bone is the smallest and thinnest facial bone.'}},
  {id: 'zygomatic', ko: '관골', en: 'Zygomatic bone', tag: FACE_T, region: 'head', model: {file: 'skull', hl: LR('zygomatic'), show: HEAD},
    sentence: {ko: '관골은 뺨의 도드라진 부분을 이룬다.', en: 'The zygomatic bone forms the prominence of the cheek.'}},
  {id: 'maxilla', ko: '상악골', en: 'Maxilla', region: 'head', model: {file: 'skull', hl: LR('maxilla'), show: HEAD},
    sentence: {ko: '상악골에는 위쪽 치아가 박혀 있고, 안에 상악동이 있다.', en: 'The maxilla holds the upper teeth and contains the maxillary sinus.'}},
  {id: 'mandible', ko: '하악골', en: 'Mandible', region: 'head', model: {file: 'skull', hl: ['mandible'], show: HEAD},
    sentence: {ko: '하악골은 측두하악관절로 두개골과 이어진다.', en: 'The mandible joins the skull at the temporomandibular joint.'}},
  {id: 'palatine', ko: '구개골', en: 'Palatine bone', region: 'head', model: {file: 'skull', hl: LR('palatine'), show: FACE, showPhone: HEAD},
    sentence: {ko: '구개골은 경구개의 뒷부분을 이룬다.', en: 'The palatine bone forms the back part of the hard palate.'}},
  {id: 'vomer', ko: '서골', en: 'Vomer', region: 'head', model: {file: 'skull', hl: ['vomer'], show: FACE, showPhone: HEAD},
    sentence: {ko: '서골은 비중격의 아래 뒷부분을 이룬다.', en: 'The vomer forms the lower back part of the nasal septum.'}},
  {id: 'concha', ko: '하비갑개', en: 'Inferior nasal concha', region: 'head', model: {file: 'skull', hl: LR('concha'), show: FACE, showPhone: HEAD},
    sentence: {ko: '하비갑개는 비강 외측벽에 붙은 독립된 뼈다.', en: 'The inferior nasal concha is a separate bone on the lateral wall of the nasal cavity.'}},
  {id: 'hyoid', ko: '설골', en: 'Hyoid bone', region: 'head', model: {file: 'skull', hl: ['hyoid'], show: HEAD},
    sentence: {ko: '설골은 다른 뼈와 관절을 이루지 않는 유일한 뼈다.', en: 'The hyoid is the only bone that does not articulate with another bone.'}},

  // ── 가슴
  {id: 'sternum', ko: '흉골', en: 'Sternum', region: 'thorax', model: {file: 'thorax', hl: STERNUM, show: CHEST_FRONT},
    sentence: {ko: '흉골은 흉골병, 흉골체, 검상돌기로 이루어진다.', en: 'The sternum consists of the manubrium, the body, and the xiphoid process.'}},
  {id: 'manubrium', ko: '흉골병', en: 'Manubrium', region: 'thorax', model: {file: 'thorax', hl: ['manubrium'], show: CHEST_FRONT},
    sentence: {ko: '흉골병과 흉골체가 만나는 흉골각은 제2늑골의 높이다.', en: 'The sternal angle, where the manubrium meets the body, is level with the second rib.'}},
  {id: 'sternal_body', ko: '흉골체', en: 'Body of sternum', region: 'thorax', model: {file: 'thorax', hl: ['sternum_body'], show: CHEST_FRONT},
    sentence: {ko: '심폐소생술의 가슴 압박은 흉골체의 아래쪽 절반을 누른다.', en: 'Chest compressions in CPR press on the lower half of the body of the sternum.'}},
  {id: 'xiphoid', ko: '검상돌기', en: 'Xiphoid process', region: 'thorax', model: {file: 'thorax', hl: ['xiphoid'], show: CHEST_FRONT},
    sentence: {ko: '검상돌기는 흉골의 가장 아래 끝으로, 나이가 들면 뼈로 굳는다.', en: 'The xiphoid process is the lowest tip of the sternum and ossifies with age.'}},
  {id: 'ribs', ko: '늑골', en: 'Ribs', region: 'thorax', model: {file: 'thorax', hl: RIBS, show: THORAX},
    sentence: {ko: '늑골은 좌우 열두 쌍이며, 뒤쪽에서 흉추와 관절을 이룬다.', en: 'There are twelve pairs of ribs, and they articulate with the thoracic vertebrae at the back.'}},
  {id: 'first_rib', ko: '제1늑골', en: 'First rib', region: 'thorax', model: {file: 'thorax', hl: ['r1', 'l1'], show: THORAX},
    sentence: {ko: '제1늑골은 가장 짧고 넓으며, 그 위로 쇄골하동맥이 지나간다.', en: 'The first rib is the shortest and broadest, and the subclavian artery passes over it.'}},
  {id: 'floating_ribs', ko: '부유늑골', en: 'Floating ribs', region: 'thorax', model: {file: 'thorax', hl: ['r11', 'r12', 'l11', 'l12'], show: THORAX},
    sentence: {ko: '제11늑골과 제12늑골은 앞쪽 끝이 흉골에 닿지 않는 부유늑골이다.', en: 'The eleventh and twelfth ribs are floating ribs because their front ends do not reach the sternum.'}},
  {id: 'costal_cartilage', ko: '늑연골', en: 'Costal cartilage', region: 'thorax', model: {file: 'thorax', hl: CC, show: CHEST_FRONT},
    sentence: {ko: '늑연골은 늑골과 흉골을 이어 숨 쉴 때 흉곽이 움직이게 한다.', en: 'Costal cartilages join the ribs to the sternum and let the chest move as you breathe.'}},

  // ── 묶음 이름
  {id: 'spine', ko: '척추', en: 'Spine', region: 'group', model: {file: 'spine', hl: [...C, ...T, ...L, 'sacrum', 'coccyx']},
    sentence: {ko: '척추는 경추, 흉추, 요추, 천골, 미골로 이루어진다.', en: 'The spine is made of cervical, thoracic, lumbar, sacral, and coccygeal parts.'}},
  {id: 'carpals', ko: '수근골', en: 'Carpal bones', region: 'group', model: {file: 'hand', hl: CARPALS, show: WRIST},
    sentence: {ko: '수근골은 두 줄로 늘어선 여덟 개의 뼈다.', en: 'The eight carpal bones are arranged in two rows.'}},
  {id: 'tarsals', ko: '족근골', en: 'Tarsal bones', region: 'group', model: {file: 'foot', hl: TARSALS, show: MIDFOOT},
    sentence: {ko: '족근골은 일곱 개이며, 거골과 종골이 가장 크다.', en: 'There are seven tarsal bones, and the talus and calcaneus are the largest.'}},
  {id: 'phalanges', ko: '지골', en: 'Phalanges', region: 'group', model: {file: 'hand', hl: [...PP, ...MP, ...DP], show: HAND},
    sentence: {ko: '손과 발의 지골은 모두 쉰여섯 개다.', en: 'There are fifty-six phalanges in the hands and feet.'}},
  {id: 'ilium', ko: '장골', en: 'Ilium', region: 'group', model: {file: 'pelvis', hl: ['ilium_r'], show: ['ilium_r', 'ischium_r', 'pubis_r']},
    sentence: {ko: '장골능은 골수 채취와 뼈 이식에 자주 쓰인다.', en: 'The iliac crest is a common site for bone marrow and bone graft harvest.'}},
  {id: 'ischium', ko: '좌골', en: 'Ischium', region: 'group', model: {file: 'pelvis', hl: ['ischium_r'], show: ['ilium_r', 'ischium_r', 'pubis_r']},
    sentence: {ko: '앉아 있을 때 체중은 좌골결절이 받친다.', en: 'When you sit, your weight rests on the ischial tuberosities.'}},
  {id: 'pubis', ko: '치골', en: 'Pubis', region: 'group', model: {file: 'pelvis', hl: ['pubis_r'], show: ['ilium_r', 'ischium_r', 'pubis_r']},
    sentence: {ko: '좌우 치골은 앞쪽에서 치골결합으로 이어진다.', en: 'The left and right pubic bones meet at the pubic symphysis.'}},
  {id: 'pelvis', ko: '골반', en: 'Pelvis', region: 'group', model: {file: 'pelvis', hl: ['hip_r', 'hip_l', 'sacrum', 'coccyx']},
    sentence: {ko: '골반은 좌우 관골과 천골, 미골로 이루어진다.', en: 'The pelvis is made of the two hip bones, the sacrum, and the coccyx.'}},
  {id: 'skull', ko: '두개골', en: 'Skull', region: 'group', model: {file: 'skull', hl: SKULL, show: HEAD},
    sentence: {ko: '두개골은 뇌를 감싸는 뇌두개와 얼굴을 이루는 안면두개로 나뉜다.', en: 'The skull is divided into the braincase and the facial skeleton.'}},
  {id: 'rib_cage', ko: '흉곽', en: 'Rib cage', region: 'group', model: {file: 'thorax', hl: [...STERNUM, ...RIBS, ...CC], show: THORAX},
    sentence: {ko: '흉곽은 흉추, 늑골, 흉골로 이루어져 심장과 폐를 보호한다.', en: 'The rib cage, made of the thoracic vertebrae, ribs, and sternum, protects the heart and lungs.'}},
];
