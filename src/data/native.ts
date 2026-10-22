// 우리말 해부학 용어 (대한해부학회 해부학용어 · 대한의사협회 의학용어집의 우리말 용어)
// 한자어 낱말 → 우리말 낱말. 문장은 아래 사전으로 바꾸고 뒤따르는 조사를 받침에 맞게 고침

// 게임 낱말 (id → 우리말)
export const NATIVE_NAME: Record<string, string> = {
  // 뼈 — 척추
  atlas: '고리뼈', axis: '중쇠뼈', cervical: '목뼈', thoracic: '등뼈', lumbar: '허리뼈', sacrum: '엉치뼈', coccyx: '꼬리뼈',
  // 뼈 — 어깨와 팔
  clavicle: '빗장뼈', scapula: '어깨뼈', humerus: '위팔뼈', radius: '노뼈', ulna: '자뼈',
  scaphoid: '손배뼈', lunate: '반달뼈', triquetrum: '세모뼈', pisiform: '콩알뼈', trapezium: '큰마름뼈', trapezoid: '작은마름뼈', capitate: '알머리뼈', hamate: '갈고리뼈',
  metacarpal: '손허리뼈', hand_pp: '첫마디뼈', hand_mp: '중간마디뼈', hand_dp: '끝마디뼈',
  // 뼈 — 골반과 다리
  hip: '볼기뼈', femur: '넙다리뼈', patella: '무릎뼈', tibia: '정강뼈', fibula: '종아리뼈',
  talus: '목말뼈', calcaneus: '발꿈치뼈', navicular: '발배뼈', cuboid: '입방뼈', cun_med: '안쪽쐐기뼈', cun_int: '중간쐐기뼈', cun_lat: '가쪽쐐기뼈',
  metatarsal: '발허리뼈', foot_pp: '첫마디뼈', foot_mp: '중간마디뼈', foot_dp: '끝마디뼈',
  // 뼈 — 묶음
  spine: '척주', carpals: '손목뼈', tarsals: '발목뼈', phalanges: '손가락뼈', ilium: '엉덩뼈', ischium: '궁둥뼈', pubis: '두덩뼈', pelvis: '골반',
  // 근육 — 어깨
  deltoid: '어깨세모근', supraspinatus: '가시위근', infraspinatus: '가시아래근', teres_minor: '작은원근', teres_major: '큰원근', subscapularis: '어깨밑근',
  pec_major: '큰가슴근', pec_minor: '작은가슴근', trapezius: '등세모근', rhomboid: '마름근', levator_scapulae: '어깨올림근', serratus_anterior: '앞톱니근',
  // 근육 — 위팔
  biceps_brachii: '위팔두갈래근', brachialis: '위팔근', coracobrachialis: '부리위팔근', triceps_brachii: '위팔세갈래근', anconeus: '팔꿈치근',
  // 근육 — 아래팔
  brachioradialis: '위팔노근', pronator_teres: '원엎침근', fcr: '노쪽손목굽힘근', palmaris_longus: '긴손바닥근', fcu: '자쪽손목굽힘근',
  fds: '얕은손가락굽힘근', fdp: '깊은손가락굽힘근', fpl: '긴엄지굽힘근', pronator_quadratus: '네모엎침근', supinator: '뒤침근',
  ecrl: '긴노쪽손목폄근', ecrb: '짧은노쪽손목폄근', ecu: '자쪽손목폄근', edc: '손가락폄근', apl: '긴엄지벌림근', epl: '긴엄지폄근', epb: '짧은엄지폄근',
  // 근육 — 손
  apb: '짧은엄지벌림근', adductor_pollicis: '엄지모음근', opponens_pollicis: '엄지맞섬근', lumbricals: '벌레근', interossei: '뼈사이근',
  // 근육 — 엉덩이
  gluteus_maximus: '큰볼기근', gluteus_medius: '중간볼기근', gluteus_minimus: '작은볼기근', piriformis: '궁둥구멍근', tfl: '넙다리근막긴장근',
  psoas_major: '큰허리근', iliacus: '엉덩근', obturator_internus: '속폐쇄근', quadratus_femoris: '넙다리네모근',
  // 근육 — 허벅지
  sartorius: '넙다리빗근', rectus_femoris: '넙다리곧은근', vastus_lateralis: '가쪽넓은근', vastus_medialis: '안쪽넓은근', vastus_intermedius: '중간넓은근',
  adductor_longus: '긴모음근', adductor_brevis: '짧은모음근', adductor_magnus: '큰모음근', gracilis: '두덩정강근', pectineus: '두덩근',
  biceps_femoris: '넙다리두갈래근', semitendinosus: '반힘줄근', semimembranosus: '반막근',
  // 근육 — 종아리
  gastrocnemius: '장딴지근', soleus: '가자미근', plantaris: '장딴지빗근', popliteus: '오금근', tibialis_anterior: '앞정강근', tibialis_posterior: '뒤정강근',
  fibularis_longus: '긴종아리근', fibularis_brevis: '짧은종아리근', ehl: '긴엄지폄근', fhl: '긴엄지굽힘근', edl: '긴발가락폄근', fdl: '긴발가락굽힘근',
  // 근육 — 발 · 목 · 몸통
  abductor_hallucis: '엄지벌림근', fdb: '짧은발가락굽힘근', scm: '목빗근', external_oblique: '배바깥빗근',
  // 근육 — 묶음
  rotator_cuff: '돌림근띠', quadriceps: '넙다리네갈래근', hamstrings: '뒤넙다리근', adductor_group: '모음근무리', triceps_surae: '종아리세갈래근', iliopsoas: '엉덩허리근',
};

// 문장 속 용어 (게임 낱말 + 신경 · 관절 · 구조물). 긴 낱말부터 바꿈
const TERMS: Record<string, string> = {
  // 문장 단위로 먼저 (같은 이름의 손·발 뼈 등)
  '손의 주상골': '손배뼈', '발의 주상골': '발배뼈', '손과 발의 지골': '손가락뼈와 발가락뼈', '원위 요골 골절': '먼쪽 노뼈 골절',
  // 동작 · 방향 (문장 끝 동사 그대로 바꿈)
  '내전하고 내회전시킨다': '모으고 안쪽으로 돌린다', '팔 외전의 시작': '팔 벌림의 시작', 외회전시킨다: '가쪽으로 돌린다', 내회전시킨다: '안쪽으로 돌린다',
  외전시킨다: '벌린다', 내전시킨다: '모은다', '굽히고 회외시킨다': '굽히고 뒤친다', 굴곡근: '굽힘근', '내측과 외측': '안쪽과 가쪽', 척측: '자쪽', 경부: '목',
  '손의 장무지굴근': '손의 긴엄지굽힘근', '발의 장무지굴근': '발의 긴엄지굽힘근', '손의 장무지신근': '손의 긴엄지폄근', '발의 장무지신근': '발의 긴엄지폄근',
  // 신경
  액와신경: '겨드랑신경', 견갑상신경: '어깨위신경', 하견갑하신경: '아래어깨밑신경', 흉근신경: '가슴근신경', 부신경: '더부신경', 견갑배신경: '등쪽어깨신경',
  장흉신경: '긴가슴신경', 근피신경: '근육피부신경', 요골신경: '노신경', 척골신경: '자신경', 전골간신경: '앞뼈사이신경', 후골간신경: '뒤뼈사이신경',
  하둔신경: '아래볼기신경', 상둔신경: '위볼기신경', 좌골신경: '궁둥신경', 대퇴신경: '넙다리신경', 경골신경: '정강신경', 총비골신경: '온종아리신경',
  // 관절 · 구조물 · 임상
  근위지절간관절: '몸쪽손가락뼈사이관절', 원위지절간관절: '먼쪽손가락뼈사이관절', 지절간관절: '손가락뼈사이관절', 고관절: '엉덩관절',
  추체: '척추뼈몸통', 치돌기: '치아돌기', 횡돌기: '가로돌기', 천추: '엉치척추뼈', 늑골: '갈비뼈', 오훼돌기: '부리돌기', 상각: '위각', 익상견갑: '날개어깨뼈',
  기시부: '이는곳', '신전 구획': '폄근칸', '수근관 증후군': '손목굴증후군', 장경인대: '엉덩정강띠', 소전자: '작은돌기', 소좌골공: '작은궁둥구멍',
  전방십자인대: '앞십자인대', 좌골결절: '궁둥뼈결절', 장골능: '엉덩뼈능선', 치골결합: '두덩결합', 사경: '기운목', 복벽: '배벽', 아킬레스건: '발꿈치힘줄',
  천지굴근: '얕은손가락굽힘근', 심지굴근: '깊은손가락굽힘근', 설상골: '쐐기뼈', 비골두: '종아리뼈머리', 원위부: '먼쪽 부분', 근위부: '몸쪽 부분', 기저부: '바닥',
  장두: '긴갈래', 단두: '짧은갈래', 간부: '몸통', 천골: '엉치뼈', 미골: '꼬리뼈', 경추: '목뼈', 흉추: '등뼈', 요추: '허리뼈', 환추: '고리뼈', 축추: '중쇠뼈',
  중수골: '손허리뼈', 중족골: '발허리뼈', 대퇴골: '넙다리뼈', 수근골: '손목뼈', 족근골: '발목뼈', 장골: '엉덩뼈', 좌골: '궁둥뼈', 치골: '두덩뼈', 관골: '볼기뼈',
  쇄골: '빗장뼈', 견갑골: '어깨뼈', 상완골: '위팔뼈', 요골: '노뼈', 척골: '자뼈', 경골: '정강뼈', 비골: '종아리뼈', 슬개골: '무릎뼈', 거골: '목말뼈', 종골: '발꿈치뼈',
  주상골: '배뼈', 월상골: '반달뼈', 삼각골: '세모뼈', 두상골: '콩알뼈', 대능형골: '큰마름뼈', 소능형골: '작은마름뼈', 유두골: '알머리뼈', 유구골: '갈고리뼈', 입방골: '입방뼈',
  내측설상골: '안쪽쐐기뼈', 중간설상골: '중간쐐기뼈', 외측설상골: '가쪽쐐기뼈', 근위지골: '첫마디뼈', 중위지골: '중간마디뼈', 원위지골: '끝마디뼈', 지골: '손발가락뼈',
  척추: '척주', 종자골: '종자뼈', 손톱: '손톱',
  // 근육 (문장 안)
  삼각근: '어깨세모근', 극상근: '가시위근', 극하근: '가시아래근', 소원근: '작은원근', 대원근: '큰원근', 견갑하근: '어깨밑근', 대흉근: '큰가슴근', 소흉근: '작은가슴근',
  승모근: '등세모근', 능형근: '마름근', 견갑거근: '어깨올림근', 전거근: '앞톱니근', 상완이두근: '위팔두갈래근', 상완근: '위팔근', 오훼완근: '부리위팔근',
  상완삼두근: '위팔세갈래근', 주근: '팔꿈치근', 완요골근: '위팔노근', 원회내근: '원엎침근', 요측수근굴근: '노쪽손목굽힘근', 장장근: '긴손바닥근',
  척측수근굴근: '자쪽손목굽힘근', 장무지굴근: '긴엄지굽힘근', 방형회내근: '네모엎침근', 회외근: '뒤침근', 장요측수근신근: '긴노쪽손목폄근',
  단요측수근신근: '짧은노쪽손목폄근', 척측수근신근: '자쪽손목폄근', 총지신근: '손가락폄근', 장무지외전근: '긴엄지벌림근', 장무지신근: '긴엄지폄근',
  단무지신근: '짧은엄지폄근', 단무지외전근: '짧은엄지벌림근', 무지내전근: '엄지모음근', 무지대립근: '엄지맞섬근', 충양근: '벌레근', 골간근: '뼈사이근',
  '배측 골간근': '등쪽뼈사이근', '장측 골간근': '바닥쪽뼈사이근', 대둔근: '큰볼기근', 중둔근: '중간볼기근', 소둔근: '작은볼기근', 이상근: '궁둥구멍근',
  대퇴근막장근: '넙다리근막긴장근', 대요근: '큰허리근', 장골근: '엉덩근', 내폐쇄근: '속폐쇄근', 대퇴방형근: '넙다리네모근', 봉공근: '넙다리빗근',
  대퇴직근: '넙다리곧은근', 외측광근: '가쪽넓은근', 내측광근: '안쪽넓은근', 중간광근: '중간넓은근', 장내전근: '긴모음근', 단내전근: '짧은모음근',
  대내전근: '큰모음근', 박근: '두덩정강근', 치골근: '두덩근', 대퇴이두근: '넙다리두갈래근', 반건양근: '반힘줄근', 반막양근: '반막근', 비복근: '장딴지근',
  족저근: '장딴지빗근', 슬와근: '오금근', 전경골근: '앞정강근', 후경골근: '뒤정강근', 장비골근: '긴종아리근', 단비골근: '짧은종아리근', 장지신근: '긴발가락폄근',
  장지굴근: '긴발가락굽힘근', 무지외전근: '엄지벌림근', 단지굴근: '짧은발가락굽힘근', 흉쇄유돌근: '목빗근', 외복사근: '배바깥빗근', 회전근개: '돌림근띠',
  대퇴사두근: '넙다리네갈래근', 슬괵근: '뒤넙다리근', 내전근군: '모음근무리', 하퇴삼두근: '종아리세갈래근', 장요근: '엉덩허리근',
};

const KEYS = Object.keys(TERMS).sort((a, b) => b.length - a.length);
const RE = new RegExp(`(${KEYS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');

const hasBatchim = (word: string) => {
  const c = word.charCodeAt(word.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
};
const rieulBatchim = (word: string) => {
  const c = word.charCodeAt(word.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 === 8;
};

// 바뀐 낱말 뒤 조사를 받침에 맞게: 은/는 · 이/가 · 을/를 · 과/와 · 으로/로 · 이며/며 · 이다/다 · 이고/고
// 돌려주는 값: [새 조사, 원문에서 먹은 길이]
const PAIRS: [string, string][] = [
  ['으로', '로'],
  ['이며', '며'],
  ['이다', '다'],
  ['이고', '고'],
  ['은', '는'],
  ['이', '가'],
  ['을', '를'],
  ['과', '와'],
];
const fixParticle = (word: string, rest: string): [string, number] => {
  const b = hasBatchim(word);
  for (const [withB, noB] of PAIRS) {
    for (const p of [withB, noB]) {
      if (!rest.startsWith(p)) continue;
      // 주격 '이·가' 는 바로 뒤가 띄어쓰기·문장부호일 때만 (이식 · 가운데 같은 낱말 보호)
      if ((p === '이' || p === '가') && rest[1] && !/[\s,.]/.test(rest[1])) continue;
      const want = withB === '으로' ? (b && !rieulBatchim(word) ? '으로' : '로') : b ? withB : noB;
      return [want, p.length];
    }
  }
  return ['', 0];
};

// 그대로 바꾸면 어색한 문장은 통째로 (id → 우리말 문장)
export const NATIVE_SENTENCE: Record<string, string> = {
  coccyx: '꼬리뼈는 엉덩방아를 찧으면 다치기 쉬운 작은 뼈다.',
};

export function toNative(text: string): string {
  let out = '';
  let i = 0;
  RE.lastIndex = 0;
  for (let m = RE.exec(text); m; m = RE.exec(text)) {
    const native = TERMS[m[1]];
    const end = m.index + m[1].length;
    const [particle, used] = fixParticle(native, text.slice(end));
    out += text.slice(i, m.index) + native + particle;
    i = end + used;
    RE.lastIndex = i;
  }
  return out + text.slice(i);
}
