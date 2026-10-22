import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { installAuthFixture } from "./booking-test-helpers.mjs";

const { chromium } = await import(process.env.DEALVUE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href : "playwright");
const base = process.env.DEALVUE_TEST_URL ?? "http://127.0.0.1:5185";
const output = "node_modules/.tmp/choice-ui";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await installAuthFixture(context);
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  await page.clock.install({ time: new Date("2026-10-28T00:10:00+09:00") });
  const go = async path => { await page.goto(base + path); await page.locator("main").waitFor(); };
  const fits = async label => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, label);
  const pick = async locator => locator.locator("..").click();
  const screenshot = async (name, fullPage = true) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);
    await page.screenshot({ path: `${output}/${name}.png`, fullPage });
  };
  await go("/search");
  await page.getByText("검색 결과 25건", { exact: true }).waitFor();
  const deal = await page.evaluate(async () => {
    const deals = await (await import("/src/features/consumer/catalog.ts")).requestConsumerCatalog();
    const { isOpenDeal } = await import("/src/features/consumer/dealTiming.ts");
    return deals.find(item => !isOpenDeal(item, Date.now()) && item.regularSlots.some(slot => slot.startsWith("2026-11")));
  });
  assert.ok(deal);
  await go(`/checkout/${deal.id}`);
  const dates = page.getByRole("radiogroup", { name: "방문 날짜", exact: true });
  await dates.waitFor();
  assert.equal(await page.locator("select, input[type=date]").count(), 0);
  assert.equal(await page.locator('input[name="booking-day"][value="2026-10-27"]').isDisabled(), true);
  await pick(page.locator('input[name="booking-slot"]').first());
  assert.equal(await page.locator('input[name="booking-slot"]:checked').count(), 1);
  await page.getByRole("button", { name: "다음 달", exact: true }).click();
  await page.getByText("2026년 11월", { exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "다음 달", exact: true }).isDisabled(), true);
  const november = page.locator('input[name="booking-day"]:not(:disabled)').first();
  const novemberDay = await november.inputValue();
  await pick(november);
  assert.equal(await page.locator('input[name="booking-slot"]:checked').count(), 0, "changing the date clears the time");
  const novemberTimes = await page.locator('input[name="booking-slot"]').evaluateAll(inputs => inputs.map(input => input.value));
  assert.ok(novemberTimes.length > 0);
  assert.ok(novemberTimes.every(value => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)) === novemberDay));
  await page.getByRole("button", { name: "이전 달", exact: true }).click();
  const first = page.locator('input[name="booking-day"]:not(:disabled)').first();
  await pick(first);
  const before = await page.locator('input[name="booking-day"]:checked').inputValue();
  await first.focus();
  await page.keyboard.press("ArrowRight");
  const after = await page.locator('input[name="booking-day"]:checked').inputValue();
  assert.notEqual(after, before, "calendar supports native radio keyboard navigation");
  await pick(page.locator('input[name="booking-slot"]').first());
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await fits(`checkout at ${width}`);
    await screenshot(`calendar-${width}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "예약하기", exact: true }).click();
  await page.waitForURL("**/booking/complete/**");
  await page.getByRole("link", { name: "예약 상세 보기", exact: true }).click();
  await page.getByRole("button", { name: "일정 변경", exact: true }).click();
  await page.getByRole("radiogroup", { name: "변경할 날짜", exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "변경 내용 저장", exact: true }).isDisabled(), true);
  await pick(page.locator('input[name="reschedule-day"]:not(:disabled)').last());
  await pick(page.locator('input[name="reschedule-slot"]').first());
  const updatedSlot = await page.locator('input[name="reschedule-slot"]:checked').inputValue();
  await pick(page.locator('input[name="reschedule-day"]:not(:disabled)').first());
  assert.equal(await page.locator('input[name="reschedule-slot"]:checked').count(), 0);
  assert.equal(await page.getByRole("button", { name: "변경 내용 저장", exact: true }).isDisabled(), true);
  await pick(page.locator('input[name="reschedule-day"]:not(:disabled)').last());
  await pick(page.locator(`input[name="reschedule-slot"][value="${updatedSlot}"]`));
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await fits(`reschedule at ${width}`);
    await screenshot(`reschedule-${width}`);
  }
  await page.getByRole("button", { name: "변경 내용 저장", exact: true }).click();
  await page.getByText("예약 일정을 변경했습니다.", { exact: true }).waitFor();
  const savedSlot = await page.evaluate(async () => (await import("/src/features/consumer/booking/store.ts")).useBookingStore.getState().reservations[0].reservedAt);
  assert.equal(savedSlot, updatedSlot);
  await page.reload();
  await page.getByRole("region", { name: "예약 요약", exact: true }).waitFor();
  assert.equal(await page.getByRole("radiogroup", { name: "변경할 날짜", exact: true }).count(), 0, "saved form closes");

  await go("/search");
  await page.getByRole("group", { name: "정렬", exact: true }).getByText("낮은 가격순", { exact: true }).click();
  assert.equal(new URL(page.url()).searchParams.get("sort"), "price");
  await page.reload();
  assert.equal(await page.getByRole("group", { name: "정렬", exact: true }).getByRole("radio", { name: "낮은 가격순", exact: true }).isChecked(), true);
  const area = page.getByRole("group", { name: "지역", exact: true }).getByText("강남구", { exact: true });
  await area.click();
  await page.waitForFunction(() => new URL(location.href).searchParams.get("area") === "서울특별시 강남구");
  await go("/community/new");
  await page.getByRole("group", { name: "게시판", exact: true }).getByText("도란도란", { exact: true }).click();
  await page.getByRole("group", { name: "동네", exact: true }).getByText("마포구", { exact: true }).click();
  await page.getByLabel("제목", { exact: true }).fill("선택 UI 검증");
  await page.getByLabel("내용", { exact: true }).fill("보이는 선택 버튼으로 동네와 게시판을 고릅니다.");
  await page.getByRole("button", { name: "글 등록", exact: true }).click();
  await page.waitForURL("**/community/*");
  await page.getByRole("heading", { name: "선택 UI 검증", exact: true }).waitFor();
  await go("/community?board=neighbors");
  await page.getByRole("group", { name: "동네", exact: true }).getByText("마포구", { exact: true }).click();
  await page.getByRole("heading", { name: "선택 UI 검증", exact: true }).waitFor();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [path, ready] of [["/search", "지역"], ["/location", "동네 선택"], ["/community", "관심 태그"], ["/community/new", "게시판"], ["/shorts", "태그"], ["/package", "상품 정렬"]]) {
      await go(path);
      await page.getByRole("group", { name: ready, exact: true }).waitFor();
      if (path === "/search") await page.getByText(/검색 결과 \d+건/).waitFor();
      assert.equal(await page.locator("select, input[type=date]").count(), 0, path);
      await fits(`${path} at ${width}`);
      if (width === 390) await screenshot(path.slice(1).replaceAll("/", "-"), false);
    }
  }
  assert.deepEqual(errors, []);
  await context.close();

  // Management and server-backed booking UI are isolated from live writes.
  const admin = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await installAuthFixture(admin);
  const shop = { id: 99001, name: "선택 UI 검증 매장", address: "서울 강남구", number: "02-111-1111", description: "", business_category: [], business_images: [], staff: [{ id: 99002, name: "지우", position: "디자이너" }], services: [{ id: 99003, name: "여자 커트", price: 35000, duration_minutes: 30 }] };
  const template = { id: 99004, slug: "choice-test", title: "헤어 케어 패키지", description: "커트와 클리닉을 함께", type: "oneShop", purpose: "", items: ["커트", "클리닉"], sort_order: 1 };
  let savedCategory, savedKit, queriedDay;
  await admin.route("**/rest/v1/**", route => {
    const path = new URL(route.request().url()).pathname.split("/").at(-1);
    if (path === "users") return route.fallback();
    const body = route.request().postDataJSON();
    if (path === "can_manage_service_menu" || path === "can_manage_deal_kits") return route.fulfill({ json: true });
    if (path === "businesses") return route.fulfill({ json: [shop] });
    if (path === "business_booking_settings") return route.fulfill({ json: { booking_mode: "app" } });
    if (path === "salon_booking_slots") {
      queriedDay = body.p_date;
      return route.fulfill({ json: [{ start_at: `${body.p_date}T16:00:00+09:00`, end_at: `${body.p_date}T16:30:00+09:00`, available: true }] });
    }
    if (path === "save_service_menu_category") { savedCategory = body; return route.fulfill({ json: 99005 }); }
    if (path === "deal_kit_templates") return route.fulfill({ json: [template] });
    if (path === "deal_kits" && route.request().method() === "POST") { savedKit = body; return route.fulfill({ json: { id: 99006 } }); }
    if (route.request().method() !== "GET") throw new Error(`Unexpected mocked mutation: ${path}`);
    return route.fulfill({ json: [] });
  });
  const manage = await admin.newPage();
  manage.on("pageerror", error => errors.push(error.message));
  await manage.clock.install({ time: new Date("2026-10-28T00:10:00+09:00") });
  await manage.goto(`${base}/business/${shop.id}/manage-menu`);
  await manage.getByRole("button", { name: "카테고리 만들기", exact: true }).click();
  await manage.getByLabel("카테고리 이름", { exact: true }).fill("헤어 스타일");
  await manage.getByRole("group", { name: "예약 시 선택 방식", exact: true }).getByText("한 가지 선택", { exact: true }).click();
  await manage.getByRole("button", { name: "카테고리 저장", exact: true }).click();
  await manage.getByText("카테고리를 저장했습니다.", { exact: true }).waitFor();
  assert.equal(savedCategory.p_selection_mode, "single");
  await manage.goto(`${base}/business/${shop.id}/manage-deal-kits`);
  await manage.getByRole("button", { name: "패키지 상품 등록", exact: true }).click();
  await manage.getByRole("group", { name: "등록할 패키지", exact: true }).getByText(template.title, { exact: true }).click();
  assert.equal(await manage.getByLabel("상품명", { exact: true }).inputValue(), template.title);
  await manage.getByLabel("정상가 (원)", { exact: true }).fill("100000");
  await manage.getByLabel("패키지 할인가 (원)", { exact: true }).fill("70000");
  await manage.getByRole("button", { name: "저장", exact: true }).click();
  await manage.getByText("딜키트를 저장했습니다.", { exact: true }).waitFor();
  assert.equal(savedKit.template_id, template.id);
  assert.equal(savedKit.price, 70000);
  await manage.goto(`${base}/business/${shop.id}`);
  await manage.getByRole("button", { name: "예약하기", exact: true }).click();
  const dialog = manage.getByRole("dialog", { name: "매장 예약", exact: true });
  await dialog.getByRole("button", { name: /앱에서 예약하기/ }).click();
  await dialog.getByRole("radio", { name: /지우/ }).check();
  await dialog.getByRole("button", { name: "메뉴 선택", exact: true }).click();
  await dialog.getByRole("radio", { name: /여자 커트/ }).check();
  await dialog.getByRole("button", { name: "날짜 · 시간 선택", exact: true }).click();
  await dialog.getByRole("button", { name: "16:00", exact: true }).waitFor();
  const nextDay = dialog.locator('input[name="salon-day"]:not(:disabled)').nth(1);
  const nextDayValue = await nextDay.inputValue();
  await nextDay.locator("..").click();
  await dialog.getByRole("button", { name: "16:00", exact: true }).waitFor();
  assert.equal(queriedDay, nextDayValue, "server-backed slots refresh when selecting a calendar day");
  assert.equal(await manage.locator("select, input[type=date]").count(), 0);
  assert.deepEqual(errors, []);
  await admin.close();
  console.log("PASS calendar month boundary, unavailable dates, keyboard selection, time reset, booking/rescheduling persistence, filters/community choices, 320/390/1440px layouts, mocked manager saves and server-slot date selection");
} finally { await browser.close(); }
