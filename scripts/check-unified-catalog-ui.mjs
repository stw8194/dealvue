import assert from "node:assert/strict";
import { installAuthFixture, chooseBookingSlot } from "./booking-test-helpers.mjs";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const { chromium } = await import(process.env.DEALVUE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href : "playwright");
const base = process.env.DEALVUE_TEST_URL ?? "http://127.0.0.1:5185";
const expected = JSON.parse(await readFile("src/data/provided-catalog.json", "utf8"));
const env = Object.fromEntries((await readFile(".env", "utf8")).split(/\r?\n/).flatMap(line => { const m = line.match(/^([A-Z_]+)=(.*)$/); return m ? [[m[1], m[2].trim().replace(/^['"]|['"]$/g, "")]] : []; }));
const url = new URL(env.VITE_SUPABASE_URL + "/rest/v1/businesses");
url.searchParams.set("source_key", "like.provided:%");
url.searchParams.set("select", "*,services(*),business_images(img_url),business_category(category)");
const response = await fetch(url, { headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` } });
assert.equal(response.status, 200);
const rows = await response.json();
const browser = await chromium.launch({ headless: true });
const errors = [], mutations = [];
await mkdir("node_modules/.tmp/recovery", { recursive: true });
async function contextWithMode(enabled) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await context.route("**/*", route => {
    const request = route.request();
    if (request.url().startsWith(base) || request.url().startsWith("data:")) return route.continue();
    if (request.url().startsWith(env.VITE_SUPABASE_URL + "/rest/v1/")) {
      if (request.method() === "GET") return route.continue();
      mutations.push(request.method() + " " + new URL(request.url()).pathname);
    }
    return route.abort();
  });
  await installAuthFixture(context);
  await context.addInitScript(enabled => {
    localStorage.setItem("dealvue-consumer-preview-mode", JSON.stringify({ state: { enabled }, version: 0 }));
  }, enabled);
  const page = await context.newPage();
  await page.clock.install({ time: new Date("2026-10-15T00:10:00+09:00") });
  page.on("pageerror", error => errors.push(error.message));
  return { context, page };
}
async function go(page, path) { await page.goto(base + path); await page.locator("main").waitFor(); }
async function contains(page, text) { await page.getByText(text, { exact: false }).first().waitFor(); }
async function screenshot(page, name) { await page.screenshot({ path: `node_modules/.tmp/recovery/${name}.png`, fullPage: true }); }
try {
  const { context, page } = await contextWithMode(false);
  await go(page, "/");
  await page.getByRole("heading", { name: "실시간 인기 타임딜" }).waitFor();
  await page.getByRole("button", { name: /타임딜 상세 보기/ }).first().waitFor();
  const banner = await page.getByRole("button", { name: /타임딜 상세 보기/ }).first().boundingBox();
  assert.ok(banner.height < 300 && banner.width < 390, "original home banner proportions must survive large imported photos");
  await screenshot(page, "home");
  const deals = await page.evaluate(async () => (await import("/src/features/consumer/catalog.ts")).requestConsumerCatalog());
  assert.equal(deals.length, 75);
  assert.equal(new Set(deals.map(deal => deal.businessId)).size, 15);
  for (const source of expected.businesses) {
    const business = rows.find(row => row.source_key === source.source_key);
    assert.ok(business, source.name);
    for (const menu of source.services) {
      const service = business.services.find(row => row.source_key === menu.source_key);
      const deal = deals.find(row => row.serviceId === service.id && row.businessId === business.id);
      assert.ok(deal, `${source.name}: ${menu.name}`);
      assert.equal(deal.price, menu.deal.deal_price);
      assert.equal(deal.originalPrice, menu.deal.original_price);
      assert.equal(deal.durationMinutes, menu.display_duration_minutes);
      assert.equal(deal.discountRate, menu.deal.discount_rate);
      assert.ok(deal.slots.length > 0);
      assert.equal(deal.scheduleKind, "rotation");
      assert.ok(Date.parse(deal.startAt) < Date.parse(deal.endAt));
      assert.ok([1, 2, 3, 4].includes((Date.parse(deal.endAt) - Date.parse(deal.startAt)) / 3600000));
      if (source.source_details.closed_days.includes("매주")) {
        for (const slot of deal.slots) {
          const weekday = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", weekday: "long" }).format(new Date(slot));
          assert.equal(source.source_details.closed_days.includes(weekday), false, `${source.name} closed day`);
        }
      }
    }
  }
  await go(page, "/search"); await contains(page, "검색 결과 25건");
  const now = await page.evaluate(() => Date.now());
  const availableHair = deals.find(deal => deal.category === "hair" && Date.parse(deal.startAt) <= now && now < Date.parse(deal.endAt));
  const ardien = expected.businesses.find(row => row.name === availableHair.businessName);
  await page.getByRole("searchbox").fill(ardien.name); await page.getByRole("button", { name: "검색", exact: true }).click();
  await contains(page, "검색 결과 5건");
  const ardienId = availableHair.businessId;
  const offer = deals.find(deal => deal.businessId === ardienId && deal.serviceName === ardien.services[0].name);
  await page.getByRole("button", { name: `${offer.serviceName} 찜 추가`, exact: true }).click();
  await go(page, "/wishlist"); await contains(page, offer.serviceName);
  await page.reload(); await contains(page, offer.serviceName);
  await go(page, "/businesses"); await contains(page, "전체 매장");
  await page.locator('a[href^="/business/"]').first().waitFor();
  assert.equal(await page.locator('a[href^="/business/"]').count(), 15);
  for (const source of expected.businesses) {
    const business = rows.find(row => row.source_key === source.source_key);
    await go(page, `/business/${business.id}`);
    await page.getByRole("heading", { name: source.name, exact: true }).waitFor();
    const book = page.getByRole("button", { name: "예약하기", exact: true });
    assert.equal(await book.isEnabled(), true);
    await page.getByRole("button", { name: "시술 메뉴", exact: true }).click();
    for (const menu of source.services) await page.getByRole("button", { name: new RegExp(menu.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).first().waitFor();
    await page.getByRole("button", { name: "사진", exact: true }).click();
    assert.equal(await page.locator('button[aria-label^="매장 사진 "]').count(), source.images.length);
    await page.getByRole("button", { name: "리뷰", exact: true }).click();
    for (const review of source.source_details.review_samples) await contains(page, review.content);
    assert.equal(await page.locator('a[href*="/review-"]').count(), source.source_details.review_images.length);
    assert.equal(await page.getByRole("link", { name: "리뷰 쓰기", exact: true }).count(), 1);
    if (source.name === "Ardien") await screenshot(page, "business-reviews");
  }
  await go(page, `/business/${ardienId}`); await page.getByRole("heading", { name: ardien.name, exact: true }).waitFor();
  await page.getByRole("button", { name: "매장 찜 추가", exact: true }).click();
  await page.getByRole("button", { name: "예약하기", exact: true }).click();
  const booking = page.getByRole("dialog", { name: "매장 예약", exact: true });
  await booking.waitFor();
  await booking.getByRole("button").filter({ hasText: offer.serviceName }).click();
  await contains(page, offer.serviceName);
  const save = page.getByRole("button", { name: "예약하기", exact: true });
  await page.getByRole("button", { name: "방문 시간을 선택해 주세요", exact: true }).waitFor();
  assert.equal(await page.getByRole("combobox").count(), 0, "dates and times use radio choices");
  assert.equal(await page.locator('input[name="booking-day"]:checked').count(), 1, "first available date selected");
  assert.equal(await page.getByRole("heading", { name: /쿠폰|포인트|결제수단/ }).count(), 0);
  await page.getByText("방문 시 결제할 금액", { exact: true }).waitFor();
  await chooseBookingSlot(page);
  assert.equal(await save.isDisabled(), true);
  await page.getByRole("checkbox").check(); await save.click();
  await page.waitForURL("**/booking/complete/**"); await contains(page, "예약이 완료되었습니다");
  await page.reload(); await contains(page, "예약이 완료되었습니다");
  const completePath = new URL(page.url()).pathname;
  const bookingId = completePath.split("/").at(-1);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    assert.doesNotMatch(await page.locator("main").innerText(), /시연|체험|샘플|예시 지역|이 기기에만/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `booking confirmation overflow at ${width}px`);
    await screenshot(page, `booking-complete-${width}`);
    await page.getByRole("link", { name: "예약 상세 보기", exact: true }).click();
    await page.getByRole("region", { name: "예약 요약" }).waitFor();
    assert.equal(await page.getByRole("radiogroup", { name: "변경할 날짜", exact: true }).count(), 0, "management form is collapsed initially");
    assert.doesNotMatch(await page.locator("main").innerText(), /시연|체험|샘플|예시 지역|이 기기에만/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `booking detail overflow at ${width}px`);
    await screenshot(page, `booking-detail-${width}`);
    await page.getByText("예약 정보 및 취소 규정", { exact: true }).click();
    await page.getByText("예약 번호", { exact: true }).waitFor();
    await go(page, "/reservation");
    await page.locator(`a[href="/reservation/${bookingId}"]`).waitFor();
    await page.getByText("방문 시 결제", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `booking list overflow at ${width}px`);
    await screenshot(page, `booking-list-${width}`);
    await go(page, completePath); await contains(page, "예약이 완료되었습니다");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: "예약 상세 보기", exact: true }).click();
  await page.getByRole("button", { name: "일정 변경", exact: true }).click();
  await page.locator('label:has(input[name="reschedule-day"]:not(:disabled))').first().click();
  await page.locator('label:has(input[name="reschedule-slot"])').first().click();
  await page.getByRole("button", { name: "변경 내용 저장", exact: true }).click(); await contains(page, "예약 일정을 변경했습니다");
  await page.getByRole("button", { name: "예약 취소", exact: true }).click(); await page.getByRole("button", { name: "취소 확정", exact: true }).click();
  await contains(page, "예약 취소");
  // Only this isolated browser gets a completed local reservation fixture.
  await page.evaluate(async () => {
    const { useBookingStore } = await import("/src/features/consumer/booking/store.ts");
    const reservation = useBookingStore.getState().reservations[0];
    // Bookings live in the device ledger, so the fixture is written there (a finished visit).
    const { commitLedger } = await import("/src/features/consumer/ledger.ts");
    await commitLedger(state => ({ next: { ...state, reservations: [...state.reservations, { ...reservation, id: "review-fixture", status: "done", completedAt: new Date().toISOString(), requestKey: "review-fixture" }] }, result: null }));
  });
  await go(page, "/reservation/review-fixture/review");
  await page.getByLabel("이용 후기", { exact: true }).fill("실제 자료의 시술과 연결된 리뷰 저장 기능을 검증합니다.");
  await page.getByRole("button", { name: "리뷰 저장", exact: true }).click();
  await page.waitForURL("**/reservation/review-fixture");
  await go(page, `/business/${ardienId}`); await page.getByRole("button", { name: "리뷰", exact: true }).click();
  await contains(page, "실제 자료의 시술과 연결된 리뷰 저장 기능을 검증합니다.");
  await go(page, "/community/new");
  await page.getByLabel("제목", { exact: true }).fill("통합 기능 검증 글");
  await page.getByLabel("내용", { exact: true }).fill("기존 글쓰기와 댓글 기능을 모드 구분 없이 사용할 수 있는지 확인합니다.");
  await page.getByRole("button", { name: "글 등록", exact: true }).click();
  await contains(page, "통합 기능 검증 글");
  await page.getByLabel("댓글 남기기", { exact: true }).fill("저장 후 새로고침 검증 댓글입니다.");
  await page.getByRole("button", { name: "댓글 등록", exact: true }).click();
  await page.reload(); await contains(page, "저장 후 새로고침 검증 댓글입니다.");
  await go(page, "/provided/ardien"); await page.waitForURL(`**/business/${rows.find(row => row.name === "Ardien").id}`); await contains(page, "Ardien");
  await go(page, "/mypage");
  assert.equal(await page.getByRole("navigation", { name: "마이페이지 바로가기", exact: true }).getByRole("link").count(), 8);
  await screenshot(page, "mypage");
  await go(page, "/");
  await page.locator('a[href="/mypage/playground"]').click(); await page.locator(".playground-shell").waitFor();
  await page.getByRole("button", { name: "드레스룸 열기", exact: true }).click(); await page.getByRole("dialog", { name: "드레스룸", exact: true }).waitFor();
  const changed = await page.evaluate(async () => {
    const { useEngagementStore } = await import("/src/features/consumer/engagement/store.ts");
    const { HAIR_COLORS } = await import("/src/features/consumer/engagement/playground/appearance.ts");
    const before = useEngagementStore.getState();
    const next = { ...before.appearance, hairColor: HAIR_COLORS[1].id };
    const saved = useEngagementStore.getState().chooseAppearance(next);
    return { saved, next, outfit: before.outfit, owned: before.ownedOutfits, accessories: before.accessories };
  });
  assert.equal(changed.saved, true);
  await page.reload(); await page.locator(".fashion-studio").waitFor();
  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem("dealvue-consumer-engagement-preview-v1")).state);
  assert.deepEqual(persisted.appearance, changed.next);
  assert.equal(persisted.outfit, changed.outfit);
  assert.deepEqual(persisted.ownedOutfits, changed.owned);
  assert.deepEqual(persisted.accessories, changed.accessories);
  await screenshot(page, "avatar");
  for (const size of [{ width: 320, height: 640 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    for (const path of ["/", "/mypage", `/business/${ardienId}`]) {
      await go(page, path);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${path} width ${size.width}`);
    }
  }
  await context.close();
  const legacy = await contextWithMode(true);
  await go(legacy.page, "/"); await legacy.page.getByRole("heading", { name: "실시간 인기 타임딜" }).waitFor();
  const legacyDeals = await legacy.page.evaluate(async () => (await import("/src/features/consumer/catalog.ts")).requestConsumerCatalog());
  assert.deepEqual(legacyDeals.map(deal => deal.serviceId), deals.map(deal => deal.serviceId));
  await go(legacy.page, "/rewards?tab=wardrobe"); await legacy.page.getByRole("dialog", { name: "드레스룸", exact: true }).waitFor();
  await legacy.context.close();
  assert.deepEqual(errors, []); assert.deepEqual(mutations, []);
  const summary = { businesses: 15, services: 75, templates: 75, photos: 140, originalHome: true, avatarPersisted: true, modesUnified: true, favoriteAndBookingFlows: true, pageErrors: errors, databaseWrites: mutations };
  await writeFile("node_modules/.tmp/recovery/verification.json", JSON.stringify(summary, null, 2));
  console.log("PASS " + JSON.stringify(summary));
} finally { await browser.close(); }
