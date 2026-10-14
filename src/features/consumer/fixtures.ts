import type { ConsumerDeal } from "./types";

function futureSlot(day: number, hour: number) {
  const date = new Date();
  date.setDate(date.getDate() + day);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

const names = ["딜뷰 헤어 스튜디오", "오늘 메이크업", "온유 에스테틱", "모먼트 네일", "라이트 래쉬"];
const services = ["컷 + 클리닉", "데일리 메이크업", "수분 진정 관리", "원컬러 젤 네일", "속눈썹 펌"];
const prices = [39000, 49000, 45000, 29000, 25000];
const categories = ["hair", "makeup", "aesthetic", "nail", "eyelash"] as const;

// Fixtures are only returned when the user explicitly enters preview mode.
export const PREVIEW_DEALS: ConsumerDeal[] = categories.map((category, index) => ({
  id: 9001 + index,
  businessId: 7001 + index,
  serviceId: 8001 + index,
  businessName: names[index],
  serviceName: services[index],
  category,
  description: "소비자 화면의 탐색과 예약 흐름을 확인하기 위한 예시 서비스입니다.",
  imageUrl: null,
  address: `서울특별시 강남구 딜뷰로 ${10 + index} (예시 주소)`,
  originalPrice: prices[index] + 20000,
  price: prices[index],
  remainingCapacity: 3,
  endAt: futureSlot(7, 23),
  slots: [futureSlot(1, 10), futureSlot(1, 14), futureSlot(2, 11), futureSlot(2, 16)],
}));
