# 3D 뼈 모델 출처

## 게임 화면 하단용 한 줄 출처

> 3D 뼈 모델: BodyParts3D © The Database Center for Life Science (DBCLS), CC BY-SA 2.1 JP — 단위·경량화·이름 수정

(영문) `Bone models: BodyParts3D, © The Database Center for Life Science, CC BY-SA 2.1 JP (modified)`

링크를 걸 수 있으면 `https://dbarchive.biosciencedbc.jp/en/bodyparts3d/` 와 `https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en` 로 연결한다.

## 출처

- 데이터: **BodyParts3D** Release 3.0, 폴리곤 95% 감축판 (`BodyParts3D_3.0_obj_95.zip`, `parts_list_e.txt`)
  - https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/
  - 소개: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/
- 원 저작권 표기(원본 요구 문구):
  "BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan"
- 라이선스: Creative Commons 저작자표시-동일조건변경허락 2.1 일본 (CC BY-SA 2.1 JP)
  https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en

## 이 폴더의 파일들도 같은 라이선스

`spine.glb`, `arm.glb`, `hand.glb`, `pelvis.glb`, `leg.glb`, `foot.glb` 는 BodyParts3D 를 고친 2차적 저작물이므로
**CC BY-SA 2.1 JP** 로 배포한다 (동일조건변경허락). 게임 코드 자체의 라이선스와는 별개다.

## 고친 내용

1. **골라내기**: 오른쪽 뼈만(골반은 양쪽) FMA 개념 이름으로 골라 조립 단위 6개 파일로 묶음.
2. **좌표·단위**: mm → m. 축을 회전만 해서(좌우 반전 없음) glTF 관례에 맞춤 —
   +X = 환자 왼쪽, +Y = 위, +Z = 앞. 각 뼈의 해부학적 위치는 원본 그대로.
3. **노드 이름**: 게임용 짧은 이름(`C1`, `mc1`, `fdp5` 등). 원래 FMA ID·영어 이름은 각 노드의 `extras` 에 남김.
4. **미골 분리**: BodyParts3D 의 sacrum 메시에는 미골 마디가 붙어 있어,
   천미관절 높이(천골 아래 끝 + 34 mm)의 수평면에서 잘라 `coccyx` 노드를 만들고 잘린 면을 막음.
5. **경량화**: 정점 용접(weld), meshoptimizer 단순화(뼈마다 목표 삼각형 수: 작은 뼈는 원본 유지,
   척추뼈 ≤ 6,000, 큰 뼈 ≤ 10,000, 오차 한계 0.4%), 매끈한 법선 재계산,
   KHR_mesh_quantization + EXT_meshopt_compression 압축.
6. **재질**: 텍스처 없는 뼈색 기본 재질 하나(`bone`).

변환 스크립트: `scripts/models/build.mjs` (검증·미리보기: `scripts/models/verify.mjs`)
