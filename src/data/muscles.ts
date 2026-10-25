import type {Bone, ModelRef} from './bones';

// 근육 모드 113개 — 옛 한자어 용어. 3D 는 muscle_*.glb 의 근육 노드(빨강) + b_* 맥락 뼈(흐리게)
// 몸통·목·머리 근육(muscle_trunk · muscle_head)은 좌우 둘 다 보임
// 문장은 신경 지배·작용 등 시험에 자주 나오는 사실 (사용자 사실 확인 대상)

type M = Omit<Bone, 'region' | 'model'> & {region: 'shoulder' | 'arm' | 'forearm' | 'hand' | 'hip' | 'thigh' | 'leg' | 'foot' | 'trunk' | 'neck' | 'head' | 'group'; model: ModelRef};

const SH = ['b_clavicle', 'b_scapula', 'b_humerus'];
const SH_T = [...SH, 'b_thorax'];
const SH_BACK = [...SH, 'b_thorax', 'b_spine_ct'];
const ARM = ['b_scapula', 'b_humerus', 'b_radius', 'b_ulna'];
const FA = ['b_humerus', 'b_radius', 'b_ulna', 'b_hand'];
const HAND = ['b_radius', 'b_ulna', 'b_hand'];
const HIP = ['b_pelvis', 'b_lumbar', 'b_femur'];
const THIGH = ['b_pelvis', 'b_femur', 'b_patella', 'b_tibia', 'b_fibula'];
const LEG = ['b_femur', 'b_patella', 'b_tibia', 'b_fibula', 'b_foot'];
const FOOT = ['b_tibia', 'b_fibula', 'b_foot'];

const up = (hl: string[], ctx: string[]): ModelRef => ({file: 'muscle_upper', hl, show: [...hl, ...ctx]});
const lo = (hl: string[], ctx: string[]): ModelRef => ({file: 'muscle_lower', hl, show: [...hl, ...ctx]});
const tr = (hl: string[], ctx: string[]): ModelRef => ({file: 'muscle_trunk', hl, show: [...hl, ...ctx]});
const hd = (hl: string[], ctx: string[]): ModelRef => ({file: 'muscle_head', hl, show: [...hl, ...ctx]});
const ABD = ['b_thorax', 'b_spine_tl', 'b_pelvis'];
const BACK = ['b_skull', 'b_cervical', 'b_thorax', 'b_spine_tl', 'b_pelvis'];
const NAPE = ['b_skull', 'b_cervical', 'b_thorax', 'b_spine_tl'];
const CHEST = ['b_thorax', 'b_spine_tl'];
const FACE = ['b_skull', 'b_mandible', 'b_teeth'];
const JAW = ['b_skull', 'b_mandible', 'b_teeth', 'b_hyoid', 'b_cervical'];
const NECK = ['b_skull', 'b_mandible', 'b_hyoid', 'b_cervical', 'b_shoulder'];
const s = (ko: string, en: string) => ({ko, en});
const HAND_T = {ko: '손', en: 'hand'};
const FOOT_T = {ko: '발', en: 'foot'};

export const MUSCLES: M[] = [
  // ── 어깨
  {id: 'deltoid', ko: '삼각근', en: 'Deltoid', region: 'shoulder', model: up(['deltoid'], SH),
    sentence: s('삼각근은 액와신경의 지배를 받으며 팔을 외전시킨다.', 'The deltoid is supplied by the axillary nerve and abducts the arm.')},
  {id: 'supraspinatus', ko: '극상근', en: 'Supraspinatus', region: 'shoulder', model: up(['supraspinatus'], SH),
    sentence: s('극상근은 견갑상신경의 지배를 받으며 팔 외전의 시작을 돕는다.', 'The supraspinatus, supplied by the suprascapular nerve, starts arm abduction.')},
  {id: 'infraspinatus', ko: '극하근', en: 'Infraspinatus', region: 'shoulder', model: up(['infraspinatus'], SH),
    sentence: s('극하근은 견갑상신경의 지배를 받으며 팔을 외회전시킨다.', 'The infraspinatus, supplied by the suprascapular nerve, externally rotates the arm.')},
  {id: 'teres_minor', ko: '소원근', en: 'Teres minor', region: 'shoulder', model: up(['teres_minor'], SH),
    sentence: s('소원근은 액와신경의 지배를 받으며 팔을 외회전시킨다.', 'The teres minor, supplied by the axillary nerve, externally rotates the arm.')},
  {id: 'teres_major', ko: '대원근', en: 'Teres major', region: 'shoulder', model: up(['teres_major'], SH),
    sentence: s('대원근은 하견갑하신경의 지배를 받으며 팔을 내전하고 내회전시킨다.', 'The teres major, supplied by the lower subscapular nerve, adducts and internally rotates the arm.')},
  {id: 'subscapularis', ko: '견갑하근', en: 'Subscapularis', region: 'shoulder', model: up(['subscapularis'], SH_T),
    sentence: s('견갑하근은 회전근개 가운데 유일하게 팔을 내회전시킨다.', 'The subscapularis is the only rotator cuff muscle that internally rotates the arm.')},
  {id: 'pec_major', ko: '대흉근', en: 'Pectoralis major', region: 'shoulder', model: up(['pectoralis_major'], SH_T),
    sentence: s('대흉근은 내측과 외측 흉근신경의 지배를 받으며 팔을 내전시킨다.', 'The pectoralis major, supplied by the medial and lateral pectoral nerves, adducts the arm.')},
  {id: 'pec_minor', ko: '소흉근', en: 'Pectoralis minor', region: 'shoulder', model: up(['pectoralis_minor'], SH_T),
    sentence: s('소흉근은 오훼돌기에 붙어 견갑골을 앞아래로 당긴다.', 'The pectoralis minor attaches to the coracoid process and pulls the scapula forward and down.')},
  {id: 'trapezius', ko: '승모근', en: 'Trapezius', region: 'shoulder', model: up(['trapezius'], SH_BACK),
    sentence: s('승모근은 부신경의 지배를 받으며 어깨를 으쓱 올린다.', 'The trapezius, supplied by the accessory nerve, shrugs the shoulder.')},
  {id: 'rhomboid', ko: '능형근', en: 'Rhomboids', region: 'shoulder', model: up(['rhomboid'], SH_BACK),
    sentence: s('능형근은 견갑배신경의 지배를 받으며 견갑골을 척추 쪽으로 당긴다.', 'The rhomboids, supplied by the dorsal scapular nerve, pull the scapula toward the spine.')},
  {id: 'levator_scapulae', ko: '견갑거근', en: 'Levator scapulae', region: 'shoulder', model: up(['levator_scapulae'], SH_BACK),
    sentence: s('견갑거근은 견갑골의 상각을 들어 올린다.', 'The levator scapulae lifts the superior angle of the scapula.')},
  {id: 'serratus_anterior', ko: '전거근', en: 'Serratus anterior', region: 'shoulder', model: up(['serratus_anterior'], SH_T),
    sentence: s('전거근은 장흉신경의 지배를 받으며, 마비되면 익상견갑이 생긴다.', 'The serratus anterior is supplied by the long thoracic nerve; its palsy causes a winged scapula.')},

  // ── 위팔
  {id: 'biceps_brachii', ko: '상완이두근', en: 'Biceps brachii', region: 'arm', model: up(['biceps_brachii'], ARM),
    sentence: s('상완이두근은 근피신경의 지배를 받으며 팔꿈치를 굽히고 회외시킨다.', 'The biceps brachii, supplied by the musculocutaneous nerve, flexes and supinates the elbow.')},
  {id: 'brachialis', ko: '상완근', en: 'Brachialis', region: 'arm', model: up(['brachialis'], ARM),
    sentence: s('상완근은 팔꿈치를 굽히는 가장 강한 굴곡근이다.', 'The brachialis is the strongest flexor of the elbow.')},
  {id: 'coracobrachialis', ko: '오훼완근', en: 'Coracobrachialis', region: 'arm', model: up(['coracobrachialis'], ARM),
    sentence: s('근피신경은 오훼완근을 뚫고 지나간다.', 'The musculocutaneous nerve pierces the coracobrachialis.')},
  {id: 'triceps_brachii', ko: '상완삼두근', en: 'Triceps brachii', region: 'arm', model: up(['triceps_brachii'], ARM),
    sentence: s('상완삼두근은 요골신경의 지배를 받으며 팔꿈치를 편다.', 'The triceps brachii, supplied by the radial nerve, extends the elbow.')},
  {id: 'anconeus', ko: '주근', en: 'Anconeus', region: 'arm', model: up(['anconeus'], ARM),
    sentence: s('주근은 상완삼두근을 도와 팔꿈치를 편다.', 'The anconeus helps the triceps extend the elbow.')},

  // ── 아래팔
  {id: 'brachioradialis', ko: '완요골근', en: 'Brachioradialis', region: 'forearm', model: up(['brachioradialis'], FA),
    sentence: s('완요골근은 요골신경의 지배를 받지만 팔꿈치를 굽힌다.', 'The brachioradialis is supplied by the radial nerve yet flexes the elbow.')},
  {id: 'pronator_teres', ko: '원회내근', en: 'Pronator teres', region: 'forearm', model: up(['pronator_teres'], FA),
    sentence: s('정중신경은 원회내근의 두 갈래 사이를 지나간다.', 'The median nerve passes between the two heads of the pronator teres.')},
  {id: 'fcr', ko: '요측수근굴근', en: 'Flexor carpi radialis', region: 'forearm', model: up(['flexor_carpi_radialis'], FA),
    sentence: s('요측수근굴근은 정중신경의 지배를 받으며 손목을 굽힌다.', 'The flexor carpi radialis, supplied by the median nerve, flexes the wrist.')},
  {id: 'palmaris_longus', ko: '장장근', en: 'Palmaris longus', region: 'forearm', model: up(['palmaris_longus'], FA),
    sentence: s('장장근은 없는 사람도 있으며 힘줄 이식에 쓰인다.', 'The palmaris longus is absent in some people and is used for tendon grafts.')},
  {id: 'fcu', ko: '척측수근굴근', en: 'Flexor carpi ulnaris', region: 'forearm', model: up(['flexor_carpi_ulnaris'], FA),
    sentence: s('척측수근굴근은 척골신경의 지배를 받으며 두상골에 붙는다.', 'The flexor carpi ulnaris, supplied by the ulnar nerve, attaches to the pisiform.')},
  {id: 'fds', ko: '천지굴근', en: 'Flexor digitorum superficialis', region: 'forearm', model: up(['flexor_digitorum_superficialis'], FA),
    sentence: s('천지굴근은 손가락의 근위지절간관절을 굽힌다.', 'The flexor digitorum superficialis flexes the proximal interphalangeal joints.')},
  {id: 'fdp', ko: '심지굴근', en: 'Flexor digitorum profundus', region: 'forearm', model: up(['flexor_digitorum_profundus'], FA),
    sentence: s('심지굴근은 원위지절간관절을 굽히는 유일한 근육이다.', 'The flexor digitorum profundus is the only muscle that flexes the distal interphalangeal joints.')},
  {id: 'fpl', ko: '장무지굴근', en: 'Flexor pollicis longus', tag: HAND_T, region: 'forearm', model: up(['flexor_pollicis_longus'], FA),
    sentence: s('손의 장무지굴근은 엄지의 지절간관절을 굽힌다.', 'The flexor pollicis longus flexes the interphalangeal joint of the thumb.')},
  {id: 'pronator_quadratus', ko: '방형회내근', en: 'Pronator quadratus', region: 'forearm', model: up(['pronator_quadratus'], FA),
    sentence: s('방형회내근은 전골간신경의 지배를 받는다.', 'The pronator quadratus is supplied by the anterior interosseous nerve.')},
  {id: 'supinator', ko: '회외근', en: 'Supinator', region: 'forearm', model: up(['supinator'], FA),
    sentence: s('후골간신경은 회외근을 뚫고 지나간다.', 'The posterior interosseous nerve passes through the supinator.')},
  {id: 'ecrl', ko: '장요측수근신근', en: 'Extensor carpi radialis longus', region: 'forearm', model: up(['extensor_carpi_radialis_longus'], FA),
    sentence: s('장요측수근신근은 둘째 중수골 기저부에 붙는다.', 'The extensor carpi radialis longus inserts on the base of the second metacarpal.')},
  {id: 'ecrb', ko: '단요측수근신근', en: 'Extensor carpi radialis brevis', region: 'forearm', model: up(['extensor_carpi_radialis_brevis'], FA),
    sentence: s('테니스 엘보는 단요측수근신근 기시부의 병변이다.', 'Tennis elbow involves the origin of the extensor carpi radialis brevis.')},
  {id: 'ecu', ko: '척측수근신근', en: 'Extensor carpi ulnaris', region: 'forearm', model: up(['extensor_carpi_ulnaris'], FA),
    sentence: s('척측수근신근은 다섯째 중수골 기저부에 붙는다.', 'The extensor carpi ulnaris inserts on the base of the fifth metacarpal.')},
  {id: 'edc', ko: '총지신근', en: 'Extensor digitorum', region: 'forearm', model: up(['extensor_digitorum'], FA),
    sentence: s('총지신근은 네 손가락을 편다.', 'The extensor digitorum extends the four fingers.')},
  {id: 'apl', ko: '장무지외전근', en: 'Abductor pollicis longus', region: 'forearm', model: up(['abductor_pollicis_longus'], FA),
    sentence: s('장무지외전근 힘줄은 드퀘르뱅 병에서 염증이 생긴다.', 'The abductor pollicis longus tendon is involved in de Quervain disease.')},
  {id: 'epl', ko: '장무지신근', en: 'Extensor pollicis longus', tag: HAND_T, region: 'forearm', model: up(['extensor_pollicis_longus'], FA),
    sentence: s('손의 장무지신근 힘줄은 원위 요골 골절 뒤 끊어지기도 한다.', 'The extensor pollicis longus tendon can rupture after a distal radius fracture.')},
  {id: 'epb', ko: '단무지신근', en: 'Extensor pollicis brevis', region: 'forearm', model: up(['extensor_pollicis_brevis'], FA),
    sentence: s('단무지신근은 장무지외전근과 함께 첫째 신전 구획을 지난다.', 'The extensor pollicis brevis shares the first extensor compartment with the abductor pollicis longus.')},

  // ── 손
  {id: 'apb', ko: '단무지외전근', en: 'Abductor pollicis brevis', region: 'hand', model: up(['abductor_pollicis_brevis'], HAND),
    sentence: s('단무지외전근은 수근관 증후군에서 먼저 위축되기 쉽다.', 'The abductor pollicis brevis is often the first to waste in carpal tunnel syndrome.')},
  {id: 'adductor_pollicis', ko: '무지내전근', en: 'Adductor pollicis', region: 'hand', model: up(['adductor_pollicis'], HAND),
    sentence: s('무지내전근은 척골신경의 지배를 받으며 프로망 징후로 검사한다.', "The adductor pollicis is supplied by the ulnar nerve and tested with Froment's sign.")},
  {id: 'opponens_pollicis', ko: '무지대립근', en: 'Opponens pollicis', region: 'hand', model: up(['opponens_pollicis'], HAND),
    sentence: s('무지대립근은 엄지를 다른 손가락과 마주 보게 한다.', 'The opponens pollicis turns the thumb to face the other fingers.')},
  {id: 'lumbricals', ko: '충양근', en: 'Lumbricals', region: 'hand', model: up(['lumbricals'], HAND),
    sentence: s('충양근은 심지굴근 힘줄에서 시작한다.', 'The lumbricals arise from the tendons of the flexor digitorum profundus.')},
  {id: 'interossei', ko: '골간근', en: 'Interossei', region: 'hand', model: up(['interossei'], HAND),
    sentence: s('배측 골간근은 손가락을 벌리고 장측 골간근은 모은다.', 'Dorsal interossei spread the fingers and palmar interossei bring them together.')},

  // ── 엉덩이
  {id: 'gluteus_maximus', ko: '대둔근', en: 'Gluteus maximus', region: 'hip', model: lo(['gluteus_maximus'], HIP),
    sentence: s('대둔근은 하둔신경의 지배를 받으며 고관절을 편다.', 'The gluteus maximus, supplied by the inferior gluteal nerve, extends the hip.')},
  {id: 'gluteus_medius', ko: '중둔근', en: 'Gluteus medius', region: 'hip', model: lo(['gluteus_medius'], HIP),
    sentence: s('중둔근이 약하면 트렌델렌부르크 징후가 나타난다.', 'Weakness of the gluteus medius causes a Trendelenburg sign.')},
  {id: 'gluteus_minimus', ko: '소둔근', en: 'Gluteus minimus', region: 'hip', model: lo(['gluteus_minimus'], HIP),
    sentence: s('소둔근은 상둔신경의 지배를 받으며 고관절을 외전시킨다.', 'The gluteus minimus, supplied by the superior gluteal nerve, abducts the hip.')},
  {id: 'piriformis', ko: '이상근', en: 'Piriformis', region: 'hip', model: lo(['piriformis'], HIP),
    sentence: s('좌골신경은 대개 이상근 아래로 지나간다.', 'The sciatic nerve usually passes below the piriformis.')},
  {id: 'tfl', ko: '대퇴근막장근', en: 'Tensor fasciae latae', region: 'hip', model: lo(['tensor_fasciae_latae'], HIP),
    sentence: s('대퇴근막장근은 장경인대로 이어진다.', 'The tensor fasciae latae continues into the iliotibial band.')},
  {id: 'psoas_major', ko: '대요근', en: 'Psoas major', region: 'hip', model: lo(['psoas_major'], HIP),
    sentence: s('대요근은 요추에서 시작해 대퇴골 소전자에 붙는다.', 'The psoas major arises from the lumbar spine and inserts on the lesser trochanter.')},
  {id: 'iliacus', ko: '장골근', en: 'Iliacus', region: 'hip', model: lo(['iliacus'], HIP),
    sentence: s('장골근은 대요근과 합쳐져 장요근이 된다.', 'The iliacus joins the psoas major to form the iliopsoas.')},
  {id: 'obturator_internus', ko: '내폐쇄근', en: 'Obturator internus', region: 'hip', model: lo(['obturator_internus'], HIP),
    sentence: s('내폐쇄근 힘줄은 소좌골공을 지나 대퇴골에 붙는다.', 'The obturator internus tendon leaves the pelvis through the lesser sciatic foramen.')},
  {id: 'quadratus_femoris', ko: '대퇴방형근', en: 'Quadratus femoris', region: 'hip', model: lo(['quadratus_femoris'], HIP),
    sentence: s('대퇴방형근은 고관절을 외회전시킨다.', 'The quadratus femoris externally rotates the hip.')},

  // ── 허벅지
  {id: 'sartorius', ko: '봉공근', en: 'Sartorius', region: 'thigh', model: lo(['sartorius'], THIGH),
    sentence: s('봉공근은 인체에서 가장 긴 근육이다.', 'The sartorius is the longest muscle in the body.')},
  {id: 'rectus_femoris', ko: '대퇴직근', en: 'Rectus femoris', region: 'thigh', model: lo(['rectus_femoris'], THIGH),
    sentence: s('대퇴직근은 대퇴사두근 가운데 유일하게 고관절도 굽힌다.', 'The rectus femoris is the only quadriceps muscle that also flexes the hip.')},
  {id: 'vastus_lateralis', ko: '외측광근', en: 'Vastus lateralis', region: 'thigh', model: lo(['vastus_lateralis'], THIGH),
    sentence: s('외측광근은 대퇴사두근 가운데 가장 크다.', 'The vastus lateralis is the largest part of the quadriceps.')},
  {id: 'vastus_medialis', ko: '내측광근', en: 'Vastus medialis', region: 'thigh', model: lo(['vastus_medialis'], THIGH),
    sentence: s('내측광근의 사선 섬유는 슬개골이 바깥으로 빠지지 않게 돕는다.', 'The oblique fibers of the vastus medialis help keep the patella from slipping outward.')},
  {id: 'vastus_intermedius', ko: '중간광근', en: 'Vastus intermedius', region: 'thigh', model: lo(['vastus_intermedius'], THIGH),
    sentence: s('중간광근은 대퇴직근 바로 아래에 있다.', 'The vastus intermedius lies directly beneath the rectus femoris.')},
  {id: 'adductor_longus', ko: '장내전근', en: 'Adductor longus', region: 'thigh', model: lo(['adductor_longus'], THIGH),
    sentence: s('사타구니 근육 부상에서는 장내전근이 가장 흔히 다친다.', 'The adductor longus is the muscle most often hurt in groin strains.')},
  {id: 'adductor_brevis', ko: '단내전근', en: 'Adductor brevis', region: 'thigh', model: lo(['adductor_brevis'], THIGH),
    sentence: s('단내전근은 폐쇄신경의 지배를 받는다.', 'The adductor brevis is supplied by the obturator nerve.')},
  {id: 'adductor_magnus', ko: '대내전근', en: 'Adductor magnus', region: 'thigh', model: lo(['adductor_magnus'], THIGH),
    sentence: s('대내전근은 폐쇄신경과 좌골신경의 이중 지배를 받는다.', 'The adductor magnus has a dual supply from the obturator and sciatic nerves.')},
  {id: 'gracilis', ko: '박근', en: 'Gracilis', region: 'thigh', model: lo(['gracilis'], THIGH),
    sentence: s('박근 힘줄은 인대 재건술의 이식건으로 자주 쓰인다.', 'The gracilis tendon is often used as a graft in ligament reconstruction.')},
  {id: 'pectineus', ko: '치골근', en: 'Pectineus', region: 'thigh', model: lo(['pectineus'], THIGH),
    sentence: s('치골근은 대퇴신경과 폐쇄신경의 지배를 함께 받기도 한다.', 'The pectineus may be supplied by both the femoral and obturator nerves.')},
  {id: 'biceps_femoris', ko: '대퇴이두근', en: 'Biceps femoris', region: 'thigh', model: lo(['biceps_femoris'], THIGH),
    sentence: s('대퇴이두근 장두는 경골신경, 단두는 총비골신경의 지배를 받는다.', 'The long head of the biceps femoris is supplied by the tibial nerve and the short head by the common fibular nerve.')},
  {id: 'semitendinosus', ko: '반건양근', en: 'Semitendinosus', region: 'thigh', model: lo(['semitendinosus'], THIGH),
    sentence: s('반건양근 힘줄은 전방십자인대 재건에 흔히 쓰인다.', 'The semitendinosus tendon is commonly used for ACL reconstruction.')},
  {id: 'semimembranosus', ko: '반막양근', en: 'Semimembranosus', region: 'thigh', model: lo(['semimembranosus'], THIGH),
    sentence: s('반막양근은 반건양근보다 깊은 쪽에 있다.', 'The semimembranosus lies deep to the semitendinosus.')},

  // ── 종아리
  {id: 'gastrocnemius', ko: '비복근', en: 'Gastrocnemius', region: 'leg', model: lo(['gastrocnemius'], LEG),
    sentence: s('비복근은 무릎과 발목을 모두 지나는 두 관절 근육이다.', 'The gastrocnemius crosses both the knee and the ankle.')},
  {id: 'soleus', ko: '가자미근', en: 'Soleus', region: 'leg', model: lo(['soleus'], LEG),
    sentence: s('가자미근은 서 있을 때 몸이 앞으로 넘어가지 않게 잡아 준다.', 'The soleus keeps the body from tipping forward when standing.')},
  {id: 'plantaris', ko: '족저근', en: 'Plantaris', region: 'leg', model: lo(['plantaris'], LEG),
    sentence: s('족저근은 힘줄이 길고 가늘어 이식건으로 쓰이기도 한다.', 'The plantaris has a long, thin tendon that can be used as a graft.')},
  {id: 'popliteus', ko: '슬와근', en: 'Popliteus', region: 'leg', model: lo(['popliteus'], LEG),
    sentence: s('슬와근은 완전히 펴진 무릎의 잠김을 푼다.', 'The popliteus unlocks the fully extended knee.')},
  {id: 'tibialis_anterior', ko: '전경골근', en: 'Tibialis anterior', region: 'leg', model: lo(['tibialis_anterior'], LEG),
    sentence: s('전경골근이 약해지면 발처짐이 생긴다.', 'Weakness of the tibialis anterior causes foot drop.')},
  {id: 'tibialis_posterior', ko: '후경골근', en: 'Tibialis posterior', region: 'leg', model: lo(['tibialis_posterior'], LEG),
    sentence: s('후경골근 힘줄 기능 부전은 성인 평발의 흔한 원인이다.', 'Posterior tibial tendon dysfunction is a common cause of adult flatfoot.')},
  {id: 'fibularis_longus', ko: '장비골근', en: 'Fibularis longus', region: 'leg', model: lo(['fibularis_longus'], LEG),
    sentence: s('장비골근 힘줄은 발바닥을 가로질러 첫째 중족골에 붙는다.', 'The fibularis longus tendon crosses the sole to the first metatarsal.')},
  {id: 'fibularis_brevis', ko: '단비골근', en: 'Fibularis brevis', region: 'leg', model: lo(['fibularis_brevis'], LEG),
    sentence: s('단비골근은 다섯째 중족골 기저부에 붙는다.', 'The fibularis brevis inserts on the base of the fifth metatarsal.')},
  {id: 'ehl', ko: '장무지신근', en: 'Extensor hallucis longus', tag: FOOT_T, region: 'leg', model: lo(['extensor_hallucis_longus'], LEG),
    sentence: s('발의 장무지신근은 엄지발가락을 편다.', 'The extensor hallucis longus extends the big toe.')},
  {id: 'fhl', ko: '장무지굴근', en: 'Flexor hallucis longus', tag: FOOT_T, region: 'leg', model: lo(['flexor_hallucis_longus'], LEG),
    sentence: s('발의 장무지굴근 힘줄은 거골 뒤쪽 홈을 지나간다.', 'The flexor hallucis longus tendon runs in a groove behind the talus.')},
  {id: 'edl', ko: '장지신근', en: 'Extensor digitorum longus', region: 'leg', model: lo(['extensor_digitorum_longus'], LEG),
    sentence: s('장지신근은 엄지를 뺀 네 발가락을 편다.', 'The extensor digitorum longus extends the four lesser toes.')},
  {id: 'fdl', ko: '장지굴근', en: 'Flexor digitorum longus', region: 'leg', model: lo(['flexor_digitorum_longus'], LEG),
    sentence: s('장지굴근은 네 발가락의 끝마디를 굽힌다.', 'The flexor digitorum longus flexes the tips of the four lesser toes.')},

  // ── 발 · 목 · 몸통
  {id: 'abductor_hallucis', ko: '무지외전근', en: 'Abductor hallucis', region: 'foot', model: lo(['abductor_hallucis'], FOOT),
    sentence: s('무지외전근은 발바닥 안쪽 가장자리를 따라 놓여 있다.', 'The abductor hallucis runs along the inner edge of the sole.')},
  {id: 'fdb', ko: '단지굴근', en: 'Flexor digitorum brevis', region: 'foot', model: lo(['flexor_digitorum_brevis'], FOOT),
    sentence: s('단지굴근은 발바닥 가운데에서 네 발가락을 굽힌다.', 'The flexor digitorum brevis flexes the four lesser toes from the middle of the sole.')},
  {id: 'scm', ko: '흉쇄유돌근', en: 'Sternocleidomastoid', region: 'trunk', model: tr(['sternocleidomastoid'], ['b_skull', 'b_cervical', 'b_thorax']),
    sentence: s('흉쇄유돌근이 짧아지면 사경이 생긴다.', 'A shortened sternocleidomastoid causes torticollis.')},
  {id: 'external_oblique', ko: '외복사근', en: 'External oblique', region: 'trunk', model: tr(['external_oblique'], ['b_thorax', 'b_pelvis']),
    sentence: s('외복사근은 복벽의 가장 바깥층 근육이다.', 'The external oblique is the outermost muscle of the abdominal wall.')},
  {id: 'internal_oblique', ko: '내복사근', en: 'Internal oblique', region: 'trunk', model: tr(['internal_oblique'], ABD),
    sentence: s('내복사근은 외복사근 아래에서 섬유가 반대 방향으로 달린다.', 'The internal oblique lies under the external oblique, with fibers running the opposite way.')},
  {id: 'transversus_abdominis', ko: '복횡근', en: 'Transversus abdominis', region: 'trunk', model: tr(['transversus_abdominis'], ABD),
    sentence: s('복횡근은 복벽의 가장 안쪽 근육으로, 몸통을 코르셋처럼 조인다.', 'The transversus abdominis is the deepest abdominal wall muscle and wraps the trunk like a corset.')},
  {id: 'rectus_abdominis', ko: '복직근', en: 'Rectus abdominis', region: 'trunk', model: tr(['rectus_abdominis'], ABD),
    sentence: s('복직근은 건획으로 나뉘어 이른바 식스팩을 만든다.', 'Tendinous intersections divide the rectus abdominis into the so-called six-pack.')},
  {id: 'quadratus_lumborum', ko: '요방형근', en: 'Quadratus lumborum', region: 'trunk', model: tr(['quadratus_lumborum'], ABD),
    sentence: s('요방형근은 제12늑골과 장골능 사이에 있으며 몸통을 옆으로 굽힌다.', 'The quadratus lumborum runs between the twelfth rib and the iliac crest and bends the trunk sideways.')},
  {id: 'latissimus_dorsi', ko: '광배근', en: 'Latissimus dorsi', region: 'trunk', model: tr(['latissimus_dorsi'], [...ABD, 'b_arms']),
    sentence: s('광배근은 흉배신경의 지배를 받으며 팔을 내전하고 내회전시킨다.', 'The latissimus dorsi, supplied by the thoracodorsal nerve, adducts and internally rotates the arm.')},
  {id: 'erector_spinae', ko: '척추기립근', en: 'Erector spinae', region: 'trunk', model: tr(['erector_spinae'], BACK),
    sentence: s('척추기립근은 장늑근, 최장근, 극근의 세 갈래로 이루어진다.', 'The erector spinae has three columns: the iliocostalis, longissimus, and spinalis.')},
  {id: 'multifidus', ko: '다열근', en: 'Multifidus', region: 'trunk', model: tr(['multifidus'], BACK),
    sentence: s('다열근은 요통 환자에서 위축되기 쉬운 깊은 등 근육이다.', 'The multifidus is a deep back muscle that often wastes away in people with low back pain.')},
  {id: 'splenius_capitis', ko: '두판상근', en: 'Splenius capitis', region: 'trunk', model: tr(['splenius_capitis'], NAPE),
    sentence: s('두판상근은 양쪽이 함께 수축하면 머리를 뒤로 젖힌다.', 'When both sides contract together, the splenius capitis extends the head.')},
  {id: 'semispinalis_capitis', ko: '두반극근', en: 'Semispinalis capitis', region: 'trunk', model: tr(['semispinalis_capitis'], NAPE),
    sentence: s('두반극근은 목덜미에서 가장 크고 두꺼운 근육이다.', 'The semispinalis capitis is the largest muscle in the back of the neck.')},
  {id: 'diaphragm', ko: '횡격막', en: 'Diaphragm', region: 'trunk', model: tr(['diaphragm'], CHEST),
    sentence: s('횡격막은 횡격신경의 지배를 받는 가장 중요한 들숨 근육이다.', 'The diaphragm, supplied by the phrenic nerve, is the main muscle of inspiration.')},
  {id: 'external_intercostal', ko: '외늑간근', en: 'External intercostals', region: 'trunk', model: tr(['external_intercostal'], CHEST),
    sentence: s('외늑간근은 늑골을 들어 올려 숨을 들이쉬게 돕는다.', 'The external intercostals lift the ribs to help you breathe in.')},
  {id: 'internal_intercostal', ko: '내늑간근', en: 'Internal intercostals', region: 'trunk', model: tr(['internal_intercostal'], CHEST),
    sentence: s('내늑간근은 늑골을 끌어내려 힘껏 숨을 내쉴 때 쓰인다.', 'The internal intercostals pull the ribs down during forced expiration.')},
  {id: 'levator_ani', ko: '항문거근', en: 'Levator ani', region: 'trunk', model: tr(['levator_ani'], ['b_pelvis', 'b_spine_tl']),
    sentence: s('항문거근은 골반저를 이루며 배변 조절을 돕는다.', 'The levator ani forms the pelvic floor and helps control defecation.')},

  // ── 목
  {id: 'scalenes', ko: '사각근', en: 'Scalenes', region: 'neck', model: tr(['scalenes'], ['b_skull', 'b_cervical', 'b_thorax']),
    sentence: s('전사각근과 중사각근 사이로 상완신경총이 지나간다.', 'The brachial plexus passes between the anterior and middle scalenes.')},
  {id: 'platysma', ko: '광경근', en: 'Platysma', region: 'neck', model: hd(['platysma'], NECK),
    sentence: s('광경근은 피부 바로 아래에 있는 얇고 넓은 목 근육이다.', 'The platysma is a thin, broad neck muscle just under the skin.')},
  {id: 'digastric', ko: '이복근', en: 'Digastric', region: 'neck', model: hd(['digastric'], JAW),
    sentence: s('이복근은 전복과 후복이 중간건으로 이어진다.', 'The digastric has anterior and posterior bellies joined by an intermediate tendon.')},
  {id: 'mylohyoid', ko: '악설골근', en: 'Mylohyoid', region: 'neck', model: hd(['mylohyoid'], JAW),
    sentence: s('악설골근은 구강저를 이루는 근육이다.', 'The mylohyoid forms the floor of the mouth.')},
  {id: 'sternohyoid', ko: '흉골설골근', en: 'Sternohyoid', region: 'neck', model: hd(['sternohyoid'], NECK),
    sentence: s('흉골설골근은 음식을 삼킨 뒤 설골을 끌어내린다.', 'The sternohyoid pulls the hyoid down after swallowing.')},
  {id: 'omohyoid', ko: '견갑설골근', en: 'Omohyoid', region: 'neck', model: hd(['omohyoid'], NECK),
    sentence: s('견갑설골근은 상복과 하복이 중간건으로 이어진다.', 'The omohyoid has superior and inferior bellies joined by an intermediate tendon.')},

  // ── 머리
  {id: 'masseter', ko: '교근', en: 'Masseter', region: 'head', model: hd(['masseter'], FACE),
    sentence: s('교근은 삼차신경의 지배를 받으며 이를 꽉 물게 한다.', 'The masseter, supplied by the trigeminal nerve, clenches the teeth.')},
  {id: 'temporalis', ko: '측두근', en: 'Temporalis', region: 'head', model: hd(['temporalis'], FACE),
    sentence: s('측두근은 하악골의 근돌기에 붙어 입을 다물게 한다.', 'The temporalis attaches to the coronoid process of the mandible and closes the mouth.')},
  {id: 'medial_pterygoid', ko: '내측익돌근', en: 'Medial pterygoid', region: 'head', model: hd(['medial_pterygoid'], FACE),
    sentence: s('내측익돌근은 교근과 함께 하악골을 들어 올린다.', 'The medial pterygoid works with the masseter to raise the mandible.')},
  {id: 'lateral_pterygoid', ko: '외측익돌근', en: 'Lateral pterygoid', region: 'head', model: hd(['lateral_pterygoid'], FACE),
    sentence: s('외측익돌근은 저작근 가운데 유일하게 입을 벌린다.', 'The lateral pterygoid is the only chewing muscle that opens the mouth.')},
  {id: 'orbicularis_oculi', ko: '안륜근', en: 'Orbicularis oculi', region: 'head', model: hd(['orbicularis_oculi'], FACE),
    sentence: s('안륜근은 안면신경의 지배를 받으며 눈을 감게 한다.', 'The orbicularis oculi, supplied by the facial nerve, closes the eye.')},
  {id: 'orbicularis_oris', ko: '구륜근', en: 'Orbicularis oris', region: 'head', model: hd(['orbicularis_oris'], FACE),
    sentence: s('구륜근은 입술을 오므려 휘파람을 불게 한다.', 'The orbicularis oris purses the lips to whistle.')},
  {id: 'zygomaticus_major', ko: '대관골근', en: 'Zygomaticus major', region: 'head', model: hd(['zygomaticus_major'], FACE),
    sentence: s('대관골근은 입꼬리를 위로 당겨 웃게 한다.', 'The zygomaticus major pulls the corners of the mouth up into a smile.')},
  {id: 'buccinator', ko: '협근', en: 'Buccinator', region: 'head', model: hd(['buccinator'], FACE),
    sentence: s('협근은 볼을 치아에 붙여 음식이 볼 쪽으로 새지 않게 한다.', 'The buccinator holds the cheek against the teeth so food does not slip into the cheek.')},
  {id: 'mentalis', ko: '이근', en: 'Mentalis', region: 'head', model: hd(['mentalis'], FACE),
    sentence: s('이근은 턱끝 피부를 올려 아랫입술을 내밀게 한다.', 'The mentalis raises the skin of the chin and pushes out the lower lip.')},

  // ── 묶음 이름
  {id: 'rotator_cuff', ko: '회전근개', en: 'Rotator cuff', region: 'group', model: up(['supraspinatus', 'infraspinatus', 'teres_minor', 'subscapularis'], SH),
    sentence: s('회전근개는 극상근, 극하근, 소원근, 견갑하근으로 이루어진다.', 'The rotator cuff is made of the supraspinatus, infraspinatus, teres minor, and subscapularis.')},
  {id: 'quadriceps', ko: '대퇴사두근', en: 'Quadriceps', region: 'group', model: lo(['rectus_femoris', 'vastus_lateralis', 'vastus_medialis', 'vastus_intermedius'], THIGH),
    sentence: s('대퇴사두근은 대퇴신경의 지배를 받으며 무릎을 편다.', 'The quadriceps, supplied by the femoral nerve, extends the knee.')},
  {id: 'hamstrings', ko: '슬괵근', en: 'Hamstrings', region: 'group', model: lo(['biceps_femoris', 'semitendinosus', 'semimembranosus'], THIGH),
    sentence: s('슬괵근은 무릎을 굽히고 고관절을 편다.', 'The hamstrings flex the knee and extend the hip.')},
  {id: 'adductor_group', ko: '내전근군', en: 'Adductor group', region: 'group', model: lo(['adductor_longus', 'adductor_brevis', 'adductor_magnus', 'gracilis', 'pectineus'], THIGH),
    sentence: s('내전근군은 주로 폐쇄신경의 지배를 받는다.', 'The adductor group is mainly supplied by the obturator nerve.')},
  {id: 'triceps_surae', ko: '하퇴삼두근', en: 'Triceps surae', region: 'group', model: lo(['gastrocnemius', 'soleus'], LEG),
    sentence: s('하퇴삼두근은 아킬레스건으로 종골에 붙는다.', 'The triceps surae attaches to the calcaneus through the Achilles tendon.')},
  {id: 'iliopsoas', ko: '장요근', en: 'Iliopsoas', region: 'group', model: lo(['psoas_major', 'iliacus'], HIP),
    sentence: s('장요근은 가장 강한 고관절 굴곡근이다.', 'The iliopsoas is the strongest flexor of the hip.')},
  {id: 'abdominals', ko: '복근', en: 'Abdominal muscles', region: 'group', model: tr(['rectus_abdominis', 'external_oblique', 'internal_oblique', 'transversus_abdominis'], ABD),
    sentence: s('복근은 복직근, 외복사근, 내복사근, 복횡근으로 이루어진다.', 'The abdominal muscles are the rectus abdominis, external oblique, internal oblique, and transversus abdominis.')},
  {id: 'masticatory', ko: '저작근', en: 'Muscles of mastication', region: 'group', model: hd(['masseter', 'temporalis', 'medial_pterygoid', 'lateral_pterygoid'], FACE),
    sentence: s('저작근은 교근, 측두근, 내측익돌근, 외측익돌근의 네 근육이다.', 'The muscles of mastication are the masseter, temporalis, medial pterygoid, and lateral pterygoid.')},
];
