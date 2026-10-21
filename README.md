# 뼈이름으로 타자연습

척추 · 어깨와 팔 · 골반과 다리 뼈 이름(옛 한자어 용어 / 영어)을 3D 뼈와 함께 익히는 타자연습 게임.
「킹받는 뼈쟁이 프로그램」 by @iamnotwoodz

- 낱말 연습(20개) / 문장 연습(8문장), 한글 · English
- 쳐야 할 글자가 흐리게 깔리고 그 위를 따라 친다. 틀리면 빨갛게 흔들림
- 그 뼈의 3D 모델이 오른쪽에서 날아와 가운데서 회전 (작은 뼈는 손·발 전체를 흐리게 깔고 해당 뼈만 강조)
- 모형 키보드: 누르는 키 + 다음에 칠 키(보라) 표시, 두벌식 자모 표기
- 경쟁 랭킹 (Supabase) — 점수 = 타수 × 정확도²

## 실행

```bash
npm install
npm run dev
```

## 랭킹 켜기 (Supabase)

1. Supabase 프로젝트에서 `supabase/schema.sql` 실행
2. `.env.local` 에
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```
   설정이 없으면 랭킹은 이 브라우저에만 저장된다.

## 구조

| 파일 | 내용 |
|---|---|
| `src/data/bones.ts` | 뼈 48개: 옛 용어 · 영어 · 3D 노드 · 문장 |
| `src/lib/typing.ts` | 한글 자모 분해 비교(es-hangul), 다음 키 계산 |
| `src/components/BoneStage.tsx` | three.js 무대: 날아오기 · 회전 · 맞힘 파티클 |
| `src/components/Keyboard.tsx` | 모형 키보드 |
| `src/lib/ranking.ts` · `supabase/schema.sql` | 랭킹 |
| `public/models/` | 3D 뼈 (BodyParts3D, CC BY-SA — `CREDITS.md`) |
