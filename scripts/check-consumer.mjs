import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { mkdir } from "node:fs/promises";

// Supply DEALVUE_PLAYWRIGHT_MODULE when using an existing Playwright installation.
const modulePath = process.env.DEALVUE_PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : "playwright");
const base = process.env.DEALVUE_TEST_URL ?? "http://127.0.0.1:5174";
const browser = await chromium.launch({ headless: true, ...(process.env.DEALVUE_CHROMIUM ? { executablePath: process.env.DEALVUE_CHROMIUM } : {}) });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const errors = [];
const externalRequests = [];
await context.route("**/*", (route) => {
  const url = route.request().url();
  if (url.startsWith(base) || url.startsWith("data:")) return route.continue();
  externalRequests.push(url.split("?")[0]);
  return route.abort();
});
await context.addInitScript(() => {
  if (!localStorage.getItem("consumer-test-started")) {
    localStorage.setItem("dealvue-consumer-preview-mode", JSON.stringify({ state: { enabled: true }, version: 0 }));
    localStorage.setItem("consumer-test-started", "yes");
  }
});
const page = await context.newPage();
page.on("pageerror", (error) => errors.push(error.message));
const go = async (path) => { await page.goto(base + path); await page.locator("main").waitFor(); };
const contains = async (text) => { await page.getByText(text, { exact: false }).first().waitFor(); };
try {
  await go("/");
  await contains("나에게 맞는 뷰티 타임딜 찾기");
  await page.getByRole("link", { name: "매장명, 시술, 동네 검색 →" }).click();
  await page.getByRole("searchbox").fill("네일");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await contains("검색 결과 1건");
  await page.getByRole("button", { name: "원컬러 젤 네일 찜 추가" }).click();
  await go("/wishlist");
  await contains("원컬러 젤 네일");
  await page.reload();
  await contains("원컬러 젤 네일");
  await go("/business/7001");
  await page.getByRole("button", { name: "매장 찜 추가", exact: true }).click();
  await go("/wishlist");
  await page.getByRole("button", { name: "매장 1", exact: true }).click();
  await contains("딜뷰 헤어 스튜디오");
  console.log("PASS search and persistent deal/business favorites");

  await go("/deal/9001");
  await page.getByRole("link", { name: "일정 선택 · 예약하기" }).click();
  const submit = page.getByRole("button", { name: "테스트 예약하기 · 실제 결제 없음" });
  assert.equal(await submit.isDisabled(), true);
  await page.getByLabel("방문 일시", { exact: true }).selectOption({ index: 1 });
  await page.getByRole("checkbox").check();
  await submit.click();
  await page.waitForURL("**/booking/complete/**");
  const reservationId = new URL(page.url()).pathname.split("/").at(-1);
  await contains("테스트 예약이 저장되었습니다");
  await page.reload();
  await contains("테스트 예약이 저장되었습니다");
  await page.getByRole("link", { name: "예약 상세 보기", exact: true }).click();
  await page.getByLabel("변경할 일정", { exact: true }).selectOption({ index: 1 });
  await page.getByRole("button", { name: "일정 변경", exact: true }).click();
  await contains("테스트 예약 일정을 변경했습니다");
  await page.getByRole("button", { name: "테스트 예약 취소", exact: true }).click();
  await page.getByRole("button", { name: "취소 확정", exact: true }).click();
  await contains("테스트 예약 취소 · 실제 환불 없음");
  await go("/reservation/cancel-refund");
  assert.ok(await page.locator(`a[href="/reservation/${reservationId}"]`).count());
  await go("/reservation/usage");
  await contains("이용 완료");
  await go("/reservation/preview-example-done/review");
  await page.getByLabel("이용 후기", { exact: true }).fill("예약 이용 후 남기는 충분히 긴 테스트 리뷰입니다.");
  await page.getByRole("button", { name: "테스트 리뷰 저장" }).click();
  await page.waitForURL("**/reservation/preview-example-done");
  await go("/mypage/review");
  await contains("예약 이용 후 남기는 충분히 긴 테스트 리뷰입니다.");
  await go("/reservation/preview-example-no_show/review");
  await contains("이용 완료 후 작성할 수 있습니다");
  console.log("PASS booking, reload, reschedule, cancellation, tabs and review eligibility");

  await go("/community/new");
  await page.getByLabel("제목", { exact: true }).fill("소비자 흐름 테스트 글");
  await page.getByLabel("내용", { exact: true }).fill("커뮤니티 글쓰기와 댓글 흐름을 확인하는 예시 내용입니다.");
  await page.getByRole("button", { name: "체험 글 등록" }).click();
  await contains("소비자 흐름 테스트 글");
  await page.getByLabel("댓글 남기기", { exact: true }).fill("테스트 댓글입니다.");
  await page.getByRole("button", { name: "체험 댓글 등록" }).click();
  await contains("테스트 댓글입니다.");
  await page.reload();
  await contains("테스트 댓글입니다.");
  await go("/fortune");
  await page.getByRole("button", { name: "오늘의 운세 열어보기 · 5 P" }).click();
  await contains("오늘의 5 P 선물을 받았어요");
  await go("/rewards?tab=roulette");
  await page.getByRole("button", { name: "행운 룰렛 돌리기", exact: true }).click();
  await page.getByRole("button", { name: "오늘 참여 완료 · 내일 다시 만나요", exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "오늘 참여 완료 · 내일 다시 만나요", exact: true }).isDisabled(), true);
  await page.reload();
  await page.getByRole("button", { name: "오늘 참여 완료 · 내일 다시 만나요", exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "오늘 참여 완료 · 내일 다시 만나요", exact: true }).isDisabled(), true);
  await go("/notifications");
  await contains("룰렛 선물 도착");
  await contains("오늘의 운세 선물");
  await page.getByRole("button", { name: "모두 읽음" }).click();
  assert.equal(await page.getByRole("button", { name: "모두 읽음" }).isDisabled(), true);
  console.log("PASS community persistence, daily fortune/roulette and notifications");

  for (const path of ["/package", "/package/special", "/package/one-shop", "/package/shop-shop", "/package/detail/1", "/fortune", "/shorts", "/settings", "/mypage", "/mypage/coupon", "/mypage/point", "/mypage/edit", "/mypage/recent", "/nearby", "/location", "/onboarding", "/deal/999999", "/business/invalid", "/reservation/missing", "/missing"]) {
    await go(path);
    assert.ok((await page.locator("main").innerText()).trim().length > 10, `blank screen: ${path}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false, `horizontal overflow: ${path}`);
  }
  await go("/");
  await mkdir("node_modules/.tmp", { recursive: true });
  await page.screenshot({ path: "node_modules/.tmp/consumer-home.png", fullPage: true });
  assert.equal(externalRequests.length, 0, "preview must not call real external services");
  await go("/checkout/9001");
  await page.getByRole("button", { name: "실제 데이터 보기", exact: true }).click();
  await contains("예시 데이터로 시작");
  assert.equal(await page.getByRole("button", { name: "테스트 예약하기 · 실제 결제 없음" }).count(), 0);
  assert.deepEqual(errors, []);
  // Only the final live catalog read may request an external service; preview flows may not.
  console.log("PASS 20 additional routes, mobile layout, missing IDs and live-mode write boundary");

  const livePage = await context.newPage();
  livePage.on("pageerror", (error) => errors.push(error.message));
  const apiCalls = [];
  let failCatalog = false;
  const deadline = new Date(Date.now() + 86400000).toISOString();
  const business = { id: 20, name: "스키마 확인 매장", address: "서울 강남구", number: "", description: "모의 응답", business_category: [{ category: "hair" }], services: [{ id: 30, name: "스키마 확인 시술", price: 40000, duration_minutes: 60, description: "" }], staff: [] };
  await livePage.route("**/rest/v1/**", (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split("/").at(-1);
    apiCalls.push({ table, method: route.request().method() });
    if (table === "time_deals" && failCatalog) return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "test catalog unavailable" }) });
    const rows = {
      time_deals: [{ id: 10, business_id: 20, service_id: 30, original_price: 40000, deal_price: 30000, remaining_capacity: 2, end_at: deadline }],
      businesses: [business], services: business.services, business_images: [],
    }[table] ?? [];
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(rows) });
  });
  await livePage.goto(base + "/search");
  await livePage.getByText("스키마 확인 시술", { exact: true }).waitFor();
  await livePage.goto(base + "/business/20");
  await livePage.getByRole("heading", { name: "스키마 확인 매장", exact: true }).waitFor();
  await livePage.goto(base + "/deal/10");
  await livePage.getByText("예약 가능한 일정은 준비 중입니다.", { exact: true }).waitFor();
  failCatalog = true;
  await livePage.goto(base + "/search");
  await livePage.getByText("검색 결과를 불러오지 못했습니다", { exact: true }).waitFor();
  assert.ok(apiCalls.length > 0);
  assert.ok(apiCalls.every((call) => call.method === "GET"));
  assert.deepEqual(errors, []);
  console.log("PASS supplied-schema read adapters and error state with mocked API responses; no DB writes");
  console.log(JSON.stringify({ browserErrors: errors, finalLiveRequests: externalRequests.length }));
} finally {
  await browser.close();
}
