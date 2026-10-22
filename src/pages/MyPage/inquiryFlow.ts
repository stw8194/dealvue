export type InquiryChoice = { label: string; next?: string; path?: string; primary?: boolean };
export type InquiryStep = { content: string; choices: InquiryChoice[] };
const home: InquiryChoice = { label: "다른 내용도 궁금해요", next: "start" };
export const INQUIRY_FLOW: Record<string, InquiryStep> = {
  start: { content: "안녕하세요! 딜뷰 뷰티 도우미예요 ✨\n오늘은 어떤 도움이 필요하세요? 궁금한 내용을 고르거나 편하게 적어 주세요.", choices: [{ label: "타임딜이 뭔가요?", next: "deal" }, { label: "예약하고 싶어요", next: "booking" }, { label: "예약 확인·변경·취소", next: "manage" }, { label: "쿠폰·포인트가 궁금해요", next: "benefits" }] },
  deal: { content: "타임딜은 정해진 시간 동안 한정된 자리만 할인된 가격으로 예약할 수 있는 시술이에요.\n평소 받아보고 싶었던 시술을 부담을 줄여 만나볼 수 있죠. 어떤 점이 더 궁금하세요?", choices: [{ label: "할인가로 예약하려면요?", next: "deal-price" }, { label: "마감되면 예약 못 하나요?", next: "deal-closed" }, { label: "나에게 맞는 딜 찾기", next: "discover" }] },
  "deal-price": { content: "진행 중인 딜에서 시술과 담당자, 방문 날짜·시간을 선택해 주세요. 할인가는 예약 화면에서 한 번 더 확인할 수 있어요.\n예약 단계에서는 결제하지 않아요. 방문해서 매장에서 결제하면 돼요. 지금 열려 있는 딜부터 살펴볼까요?", choices: [{ label: "할인받고 예약하기", path: "/search", primary: true }, { label: "예약 순서 먼저 보기", next: "booking" }, { label: "가까운 매장부터 보기", path: "/nearby" }] },
  "deal-closed": { content: "타임딜이 마감되면 해당 할인 가격으로는 예약할 수 없어요. 같은 시술을 정상가로 예약할 수 있는지 매장 상세에서 확인해 주세요.\n다른 매장의 타임딜도 돌아가며 열리니, 지금 예약할 수 있는 딜을 찾아드릴게요.", choices: [{ label: "진행 중인 타임딜 보기", path: "/search", primary: true }, { label: "좋아하는 매장 찜해두기", next: "favorites" }, home] },
  discover: { content: "어떤 방식으로 찾아볼까요?\n가까운 매장을 찾거나 시술을 비교할 수 있어요. 여러 시술을 함께 받고 싶다면 딜키트도 둘러보세요.", choices: [{ label: "시술 비교하고 예약하기", path: "/search", primary: true }, { label: "내 주변 매장 찾기", path: "/nearby" }, { label: "딜키트 둘러보기", path: "/package" }, home] },
  booking: { content: "마음에 드는 매장이나 시술을 찾으셨나요?\n시술 선택 → 담당자·날짜·시간 선택 → 예약 내용 확인 순서로 진행해요. 예약하려면 로그인이 필요하고, 결제는 방문 시 매장에서 해요.", choices: [{ label: "예약할 시술 찾아보기", path: "/search", primary: true }, { label: "담당자는 어떻게 골라요?", next: "staff" }, { label: "예약 후에는 어디서 보나요?", next: "status" }, home] },
  staff: { content: "예약 화면에서 원하는 담당자를 선택하고 가능한 시간을 확인해 주세요.\n같은 담당자의 이미 예약된 시간은 선택할 수 없어요. 원하는 시간이 없다면 다른 담당자나 날짜를 살펴보세요.", choices: [{ label: "매장 찾아 예약하기", path: "/search", primary: true }, { label: "예약 변경도 가능한가요?", next: "change" }, home] },
  manage: { content: "예약에 관해 어떤 도움이 필요하세요?\n이미 예약하셨다면 예약내역에서 자세한 내용을 확인할 수 있어요.", choices: [{ label: "내 예약 확인하기", next: "status" }, { label: "날짜·시간을 바꾸고 싶어요", next: "change" }, { label: "예약을 취소하고 싶어요", next: "cancel" }, { label: "취소하면 환불되나요?", next: "refund" }] },
  status: { content: "하단의 ‘예약내역’에서 매장, 담당자, 방문 일시를 확인할 수 있어요.\n예약을 누르면 상세 내용과 일정 변경·취소 메뉴가 나와요. 지금 내 예약을 확인해 볼까요?", choices: [{ label: "내 예약 확인하기", path: "/reservation", primary: true }, { label: "일정 변경 방법", next: "change" }, home] },
  change: { content: "예약내역에서 바꾸려는 예약을 열고 ‘예약 관리’에서 새 날짜와 시간을 선택해 주세요.\n가능한 시간만 선택할 수 있어요. 변경을 완료한 뒤 예약 상세의 일시가 맞는지도 확인해 주세요.", choices: [{ label: "예약 일정 변경하러 가기", path: "/reservation", primary: true }, { label: "원하는 시간이 없어요", next: "unavailable" }, { label: "취소 방법도 알려주세요", next: "cancel" }] },
  unavailable: { content: "원하는 시간에 자리가 없다면 다른 시간이나 날짜를 살펴보세요. 이미 예약된 시간은 중복으로 예약할 수 없어요.\n다른 매장의 시술도 비교해 볼 수 있어요. 기존 예약은 새 예약이 가능한지 확인한 뒤 정리해 주세요.", choices: [{ label: "내 예약 다시 확인", path: "/reservation", primary: true }, { label: "다른 매장 찾아보기", path: "/search" }, home] },
  cancel: { content: "예약내역에서 해당 예약을 열고 ‘예약 취소’를 선택해 주세요.\n매장별 취소 규정과 가능한 기한을 먼저 확인해 주세요. 일정만 달라졌다면 취소 대신 변경도 살펴볼 수 있어요.", choices: [{ label: "예약 관리로 이동", path: "/reservation", primary: true }, { label: "취소 대신 일정 변경", next: "change" }, { label: "환불 안내 보기", next: "refund" }] },
  refund: { content: "딜뷰는 예약할 때 결제하지 않으므로 앱에서 돌려받을 결제 금액은 없어요.\n방문 후 매장에서 결제한 금액에 관한 문의는 해당 매장에 확인해 주세요. 예약 취소 규정도 매장 상세와 예약 내용에서 확인할 수 있어요.", choices: [{ label: "예약 취소 방법", next: "cancel" }, { label: "내 예약 확인", path: "/reservation", primary: true }, home] },
  benefits: { content: "혜택도 챙겨볼까요?\n쿠폰 확인부터 놀이터에서 쓰는 포인트까지, 궁금한 항목을 골라 주세요.", choices: [{ label: "쿠폰은 어디서 보나요?", next: "coupon" }, { label: "포인트 모으는 방법", next: "points" }, { label: "포인트는 어디에 써요?", next: "points-use" }, home] },
  coupon: { content: "받은 쿠폰은 마이페이지의 ‘쿠폰함’에서 확인할 수 있어요. 홈의 첫방문 혜택도 살펴보세요.\n현재 예약 화면에는 쿠폰 적용 기능이 없으니, 쿠폰을 받았다고 예약 금액에서 자동 차감되지는 않아요.", choices: [{ label: "내 쿠폰 확인", path: "/mypage/coupon", primary: true }, { label: "포인트도 궁금해요", next: "points" }, home] },
  points: { content: "놀이터에서 출석, 오늘의 운세, 룰렛에 참여해 포인트를 모을 수 있어요. 이용 완료 후 리뷰를 남겨 적립할 수도 있어요.\n오늘의 혜택을 챙기고 아바타도 꾸며볼까요?", choices: [{ label: "놀이터에서 포인트 모으기", path: "/rewards", primary: true }, { label: "포인트 사용 방법", next: "points-use" }, { label: "내 포인트 확인", path: "/mypage/point" }] },
  "points-use": { content: "모은 포인트는 드레스룸에서 아바타 의상과 소품을 소장할 때 사용해요.\n예약 금액을 결제하는 포인트와는 별개예요. 마음에 드는 코디를 먼저 입어보고 골라보세요.", choices: [{ label: "드레스룸 둘러보기", path: "/rewards?tab=wardrobe", primary: true }, { label: "더 모으고 싶어요", next: "points" }, home] },
  kit: { content: "딜키트는 여러 시술을 묶어 한 번에 비교할 수 있는 패키지예요.\n웨딩·프로필 같은 목적별 구성이나 매장별 구성을 살펴보고, 포함된 시술과 일정을 확인해 주세요.", choices: [{ label: "나에게 맞는 딜키트 찾기", path: "/package", primary: true }, { label: "예약은 어떻게 해요?", next: "booking" }, home] },
  favorites: { content: "마음에 드는 매장이나 타임딜의 하트를 누르면 ‘찜’에 모여요.\n바로 결정하기 어렵다면 몇 곳을 찜해 두고 시술과 위치를 비교해 보세요.", choices: [{ label: "내 찜 목록 보기", path: "/wishlist", primary: true }, { label: "예약할 딜 찾아보기", path: "/search" }, home] },
  login: { content: "이메일 또는 카카오·구글 계정으로 로그인할 수 있어요.\n예약하기를 누른 뒤 로그인하면 원래 예약 화면으로 돌아와 계속 진행할 수 있어요.", choices: [{ label: "로그인하기", path: "/auth/login", primary: true }, { label: "예약 방법 보기", next: "booking" }, home] },
  shop: { content: "영업시간, 휴무일, 주차와 방문 안내는 매장 상세에서 확인해 주세요.\n먼저 방문하고 싶은 매장을 찾아볼까요?", choices: [{ label: "가까운 매장 찾기", path: "/nearby", primary: true }, { label: "시술로 검색하기", path: "/search" }, home] },
  review: { content: "이용을 마친 예약의 상세 화면에서 리뷰 작성 메뉴를 확인할 수 있어요.\n시술 경험을 남기면 다른 분들이 매장을 고르는 데 도움이 돼요.", choices: [{ label: "이용한 예약 확인", path: "/reservation", primary: true }, { label: "포인트 혜택 보기", next: "points" }, home] },
  unknown: { content: "어떤 상황인지 조금 더 알려주실 수 있나요?\n예약 변경·취소인지, 시술과 혜택이 궁금하신 건지 골라 주시면 이어서 안내할게요.", choices: [{ label: "예약 관련 문의", next: "manage" }, { label: "타임딜 알아보기", next: "deal" }, { label: "쿠폰·포인트 문의", next: "benefits" }, home] },
};
const ROUTES: [RegExp, string][] = [[/환불|환급|돌려/, "refund"], [/취소/, "cancel"], [/변경|바꾸|시간.*(옮|수정)|날짜/, "change"], [/자리|시간.*없|마감/, "deal-closed"], [/쿠폰|할인코드/, "coupon"], [/포인트.*(쓰|사용)|어디.*써/, "points-use"], [/포인트|적립|룰렛|운세|출석/, "points"], [/타임딜|특가/, "deal"], [/패키지|딜키트|웨딩|프로필|수험생/, "kit"], [/담당|디자이너|원장/, "staff"], [/찜|저장|하트/, "favorites"], [/로그인|계정|비밀번호|회원/, "login"], [/주변|지도|위치|근처|주차|영업|휴무/, "shop"], [/리뷰|후기/, "review"], [/예약|결제|카드|페이/, "booking"]];
export function resolveInquiry(question: string, previous: string): string {
  if (/^(네|응|좋아|알려줘|그럼|어떻게|더 알려줘)[!?.\s]*$/.test(question)) {
    return INQUIRY_FLOW[previous]?.choices.find(choice => choice.next)?.next ?? "start";
  }
  return ROUTES.find(([pattern]) => pattern.test(question))?.[1] ?? "unknown";
}
