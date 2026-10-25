import {useSyncExternalStore} from 'react';

// 화면 언어 (메뉴·안내·결과 등). 타자 언어(lang)와는 따로
export type Ui = 'ko' | 'en';

const KEY = 'bone-typing:ui';
let ui: Ui = (() => {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'ko' || v === 'en') return v;
  } catch {
    /* 무시 */
  }
  return /^ko/i.test(navigator.language || 'ko') ? 'ko' : 'en';
})();
const subs = new Set<() => void>();
document.documentElement.lang = ui;

export const getUi = () => ui;
export const setUi = (v: Ui) => {
  ui = v;
  document.documentElement.lang = v;
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* 무시 */
  }
  subs.forEach((f) => f());
};
export const useUi = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => ui,
  );

const D = {
  // 타이틀
  logo1: ['뼈쟁이', 'Bone'],
  logo2: ['타자연습', 'Typing'],
  bone: ['뼈', 'Bones'],
  langKo: ['한글', 'Korean'],
  muscle: ['근육', 'Muscles'],
  hanja: ['한자어', 'Sino-Korean'],
  native: ['우리말', 'Native'],
  word: ['낱말 연습', 'Words'],
  sentence: ['문장 연습', 'Sentences'],
  caseNote: ['Aa 대소문자 구분 없이 쳐도 돼요', 'Aa Letter case doesn’t matter'],
  blind: ['블라인드 모드', 'Blind mode'],
  blindSub: ['정답 글씨 숨기기 · 틀린 문제만 보여 줌', 'Hide the answer · shown only after a mistake'],
  blindWordOnly: ['낱말 연습에서만 할 수 있어요', 'Available in Words only'],
  nickPh: ['닉네임 (12자까지)', 'Nickname (up to 12)'],
  start: ['시작하기', 'Start'],
  checking: ['닉네임 확인 중…', 'Checking nickname…'],
  showCode: ['내 닉네임 복구 코드 보기', 'Show my recovery code'],
  codeIs: ['복구 코드', 'Recovery code'],
  taken: ['‘{n}’은 이미 다른 사람이 쓰는 닉네임이에요. 다른 닉네임을 쓰거나, 내 닉네임이라면 복구 코드를 넣어 주세요.', '“{n}” is already taken. Pick another nickname, or enter your recovery code if it’s yours.'],
  codePh: ['복구 코드 (XXXX-XXXX-XXXX)', 'Recovery code (XXXX-XXXX-XXXX)'],
  ok: ['확인', 'OK'],
  code12: ['복구 코드는 12자리예요', 'A recovery code has 12 characters'],
  codeWrong: ['코드가 맞지 않아요', 'That code doesn’t match'],
  codeFail: ['확인하지 못했어요. 잠시 뒤 다시 해 주세요', 'Couldn’t verify. Please try again later'],
  vs: ['{n}님의 {s}점({m} · 전체 {r}위)에 도전해 보세요', 'Can you beat {n}’s {s} points? ({m} · #{r} overall)'],
  scopeAll: ['전체', 'Global'],
  scopeLocal: ['이 기기', 'This device'],
  boardErr: ['랭킹을 불러오지 못했어요', 'Couldn’t load the ranking'],
  boardEmpty: ['아직 기록이 없어요. 첫 1등을 노려 보세요!', 'No records yet — be the first!'],
  cpmUnit: ['타', 'CPM'],
  credit: ['3D 뼈 모델: BodyParts3D © DBCLS, CC BY-SA 2.1 JP (단위·경량화·이름 수정)', '3D models: BodyParts3D © DBCLS, CC BY-SA 2.1 JP (units, simplification, names modified)'],
  bgmTitle: ['배경음악', 'Music'],
  sfxTitle: ['효과음', 'Sound effects'],
  // 게임
  quit: ['그만하기', 'Quit'],
  peek: ['BLIND · 공개', 'BLIND · shown'],
  pass: ['패스', 'Pass'],
  imeWarn: ['한/영 키를 눌러 한글 입력으로 바꿔 주세요', 'Switch your keyboard to Korean input'],
  caseHint: ['대소문자 구분 없음 · ', 'Case-insensitive · '],
  wordHint: ['Space 또는 Enter 로 확정', 'Space or Enter to submit'],
  sentHint: ['마침표까지 치고 Space 또는 Enter 로 다음 문장', 'Type through the period, then Space or Enter'],
  touchHint: ['글자를 누르면 키보드가 열려요 · 확정은 띄어쓰기/엔터', 'Tap the word for the keyboard · Space/Enter to submit'],
  // 결과
  resultAria: ['게임 결과', 'Game result'],
  formula: ['점수 = 타수 × 정확도²', 'Score = CPM × accuracy²'],
  passes: [' · 패스 {n}개 (오타로 계산)', ' · {n} passed (counted as errors)'],
  cpm: ['타수', 'CPM'],
  acc: ['정확도', 'Accuracy'],
  time: ['시간', 'Time'],
  saving: ['랭킹에 올리는 중…', 'Saving to the ranking…'],
  saveFail: ['랭킹 저장에 실패했어요', 'Couldn’t save to the ranking'],
  review: ['기록이 아주 빨라서 확인한 뒤 랭킹에 올라가요', 'Very fast record — it will appear after review'],
  rankPre: ['전체 ', '#'],
  rankPost: ['위', ' overall'],
  savedOk: ['랭킹에 올렸어요', 'Saved to the ranking'],
  follow: ['팔로우하고 새 모드 소식 받기', 'Follow for new modes'],
  claimed: ['닉네임 ‘{n}’을 내 것으로 등록했어요. 다른 기기에서 이 닉네임을 쓰려면 아래 복구 코드가 필요해요.', '“{n}” is now yours. You’ll need this recovery code to use it on another device.'],
  copy: ['복사', 'Copy'],
  codeCopied: ['복구 코드를 복사했어요', 'Recovery code copied'],
  copyBlocked: ['복사가 막혀 있어요', 'Copying is blocked'],
  share: ['공유하기', 'Share'],
  again: ['다시 하기', 'Play again'],
  shareSys: ['카카오톡 · 공유창', 'Share…'],
  shareCopy: ['결과 복사', 'Copy result'],
  shareImg: ['이미지 저장', 'Save image'],
  shareFail: ['공유창을 열 수 없어요. 결과 복사나 이미지 저장을 써 주세요.', 'Couldn’t open sharing. Use Copy result or Save image.'],
  copied: ['결과를 복사했어요. 카카오톡 대화창에 붙여 넣어 보세요.', 'Result copied — paste it into a chat.'],
  imgSaved: ['결과 카드 이미지를 저장했어요.', 'Result card saved.'],
  // 학습 모드
  modeRanked: ['랭킹 도전', 'Ranked'],
  modeStudy: ['학습 모드', 'Study'],
  studyNote: ['낱말 연습 · 고른 영역을 모두 맞혀야 끝나요. 오타는 지우고 고칠 수 있고, 틀린 답을 확정하면 다음 문제로 넘어가요. 틀린 문제는 섞여서 다시 나와요.', 'Words only. Finish every item in the chosen areas — fix typos freely; submitting a wrong answer skips ahead, and missed items come back shuffled until you get them all.'],
  studyParts: ['영역', 'Areas'],
  studyCount: ['{n}문제', '{n} items'],
  studyStart: ['학습 시작 · {n}문제', 'Start · {n} items'],
  studyBest: ['이 기기 최고 기록', 'Best on this device'],
  studyNoBest: ['아직 기록이 없어요', 'No record yet'],
  studyRound: ['{n}회차', 'Round {n}'],
  studyMiss: ['틀림', 'Misses'],
  studyDone: ['학습 완료', 'STUDY COMPLETE'],
  studySub: ['{n}문제 · 틀림 {m}번 · {r}회차에 끝', '{n} items · {m} misses · done in round {r}'],
  studyPerfect: ['한 번도 안 틀렸어요!', 'No misses at all!'],
  newBest: ['새 최고 기록', 'NEW BEST'],
  toTitle: ['처음으로', 'Home'],
  // 오류
  errFast: ['기록이 비정상적으로 빨라 랭킹에 올리지 않았어요', 'That record was too fast to be saved'],
  errRound: ['판 정보가 만료돼 랭킹에 올리지 못했어요 (다시 하기로 새 판을 시작해 주세요)', 'This round expired — start a new one with Play again'],
  errNick: ['쓸 수 없는 닉네임이에요', 'That nickname isn’t allowed'],
  errMany: ['잠시 뒤에 다시 올려 주세요 (1분에 5번까지)', 'Too many submissions — try again shortly'],
  errTaken: ['다른 사람이 쓰는 닉네임이라 저장하지 못했어요', 'That nickname belongs to someone else'],
} as const;

export type TKey = keyof typeof D;
export const t = (k: TKey, vars: Record<string, string | number> = {}) =>
  D[k][ui === 'ko' ? 0 : 1].replace(/\{(\w+)\}/g, (_, v) => String(vars[v] ?? ''));
