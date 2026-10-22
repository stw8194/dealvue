# 코코 기준 완성형 머리 원화 v4

이번에는 기존 헤어 구멍에 얼굴을 맞추지 않고, 코코 원본을 참조해 얼굴·헤어라인·귀·뒷목을 포함한 머리 전체를 새로 제작했다. 코코 단발 원본과 의상 원화는 교체하지 않았다. 생성 결과의 얼굴이 코코와 픽셀 단위로 같다는 뜻은 아니며, 최종 인상은 화면 비교로 검수한다.

- 원화: `no-ribbon/{waves,twintails,braids,bun,pixie}.png`. 각 원화에 정면·정면 사선·측면·후면 사선·후면이 있다.
- 생성 도구: 내장 `image_gen`. 참조와 실제 프롬프트·출력 기록은 [generation-record.json](./generation-record.json)에 있다.
- 앱용 파일: `public/images/playground/heads-v4/*.webp`. 크기 변경 없이 무손실로 내보낸다.
- 액세서리 원화: `assets/avatar-accessories-v4/{hair-accessories,earrings,bags,necklaces}.png`. 기본 디자인 48종을 새로 그렸으며 기존 아이템 ID·가격·소장 상태·색상 선택은 유지한다.
- 리본 헤어는 같은 완성형 머리에 새로 그린 천 리본을 더한다. 리본 유무로 얼굴이 바뀌지 않는다.

`scripts/prepare-painted-avatar-assets.py`가 원화를 WebP로 내보내고 실제 그림 범위와 정렬 정보를 `src/data/avatar-art-v4.json`에 기록한다. 정면과 사선은 코코 원본의 눈 위치에 맞춰 머리 전체에 동일 비율의 확대·축소와 회전만 적용한다. 얼굴만 가로 또는 세로로 변형하지 않는다. 정사각형 칸의 경계로 번이나 컬을 자르지 않고 실제 원화 범위를 사용한다.

`PaintedHead.tsx`는 완성형 머리 하나를 표시한다. 이전 `CocoFace`의 두피 확대 패치·사각형 목 조각·앞머리 구멍 합성을 사용하지 않는다. 옷 원화의 목과 칼라를 보존하고, 목의 좁은 연결 구역에 부드러운 혼합을 적용한다. 볼과 턱의 얼굴형을 다시 잘라내지 않는다. `PaintedAccessory.tsx`는 원화의 비율을 유지하고 명시적인 자르기 영역으로 옆 아이템 조각이 보이지 않게 한다.

검사: `node scripts/check-painted-avatar-assets.mjs`, TypeScript, 변경 파일 ESLint, 프로덕션 빌드. Safari에서는 코코와 새 헤어들을 같은 크기로 나란히 놓고 대표 의상 3종, 리본 버전, 다섯 방향과 액세서리 착용을 비교한다. 기하 검사 통과가 시각적인 완성도를 보장하지는 않는다.


얼굴 표현·홍채·피부색과 의상 경계의 후속 보정은 [avatar-face-v5/README.md](../avatar-face-v5/README.md)를 참조한다. 헤어밴드·티아라·왕관 계열은 v5에서 노출·착용을 제외했다.
