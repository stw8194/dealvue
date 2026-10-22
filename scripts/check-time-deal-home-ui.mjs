import assert from "node:assert/strict";
import { installAuthFixture } from "./booking-test-helpers.mjs";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const { chromium } = await import(process.env.DEALVUE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href : "playwright");
const base = process.env.DEALVUE_TEST_URL ?? "http://127.0.0.1:5185";
const env = Object.fromEntries((await readFile(".env", "utf8")).split(/\r?\n/).flatMap(line => { const m = line.match(/^([A-Z_]+)=(.*)$/); return m ? [[m[1], m[2].trim().replace(/^['"]|['"]$/g, "")]] : []; }));
const expected = JSON.parse(await readFile("src/data/provided-catalog.json", "utf8"));
const folder = "node_modules/.tmp/time-deal-rotation";
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [], writes = [];
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await context.route("**/*", route => {
    const request = route.request();
    if (request.url().startsWith(base) || request.url().startsWith("data:")) return route.continue();
    if (request.url().startsWith(env.VITE_SUPABASE_URL + "/rest/v1/") && request.method() === "GET") return route.continue();
    if (!["GET", "HEAD"].includes(request.method())) writes.push(request.method());
    return route.abort();
  });
  await installAuthFixture(context, { userId: null });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  await page.clock.install({ time: new Date("2026-10-15T00:10:00+09:00") });
  const go = async path => { await page.goto(base + path); await page.locator("main").waitFor(); };
  const banner = page.getByRole("region", { name: "할인율 높은 타임딜 배너", exact: true });
  const list = page.getByRole("list", { name: "진행 중인 매장 타임딜 목록", exact: true });
  await go("/"); await banner.waitFor();
  const catalog = await page.evaluate(async () => (await import("/src/features/consumer/catalog.ts")).requestConsumerCatalog());
  assert.equal(catalog.length, 75);
  for (const deal of catalog) {
    const business = expected.businesses.find(row => row.name === deal.businessName);
    const service = business.services.find(row => row.name === deal.serviceName);
    assert.equal(deal.price, service.deal.deal_price); assert.equal(deal.originalPrice, service.deal.original_price);
  }
  const activeGroups = await page.evaluate(async () => {
    const [{ requestConsumerCatalog }, { toHomeTimeDeals }, { groupActiveTimeDeals }] = await Promise.all([import("/src/features/consumer/catalog.ts"), import("/src/api/home.ts"), import("/src/features/consumer/dealSchedule.ts")]);
    return groupActiveTimeDeals(toHomeTimeDeals(await requestConsumerCatalog()), Date.now());
  });
  assert.equal(activeGroups.length, 5);
  const rankDeals = (a, b) => b.discountRate - a.discountRate || a.price - b.price || Date.parse(a.endAt) - Date.parse(b.endAt) || a.id - b.id;
  const expectedTop = activeGroups.map(group => [...group.deals].sort(rankDeals)[0]).sort(rankDeals).slice(0, 5);
  assert.deepEqual(await banner.locator("[data-deal-id]").evaluateAll(nodes => nodes.map(node => Number(node.dataset.dealId))), expectedTop.map(deal => deal.id));
  const bannerBusinessIds = await banner.locator("[data-business-id]").evaluateAll(nodes => nodes.map(node => Number(node.dataset.businessId)));
  assert.equal(new Set(bannerBusinessIds).size, bannerBusinessIds.length, "at most one deal per shop");
  assert.match(await banner.innerText(), /[\d,]+원/, "individual deal banners display prices");
  assert.doesNotMatch(await list.innerText(), /\d[\d,]*\s*원/, "multi-offer list cards hide all prices");
  for (const category of ["hair", "makeup", "aesthetic"]) {
    await go(`/?category=${category}`); await banner.waitFor(); await list.waitFor();
    const shown = await list.locator("li[data-business-id]").evaluateAll(nodes => nodes.map(node => Number(node.dataset.businessId)));
    assert.deepEqual(shown, activeGroups.filter(group => group.category === category).map(group => group.businessId));
  }
  // Shop entry chooses its best discount without requiring an empty selection.
  const selectedId = Number(await list.locator("li[data-business-id]").first().getAttribute("data-business-id"));
  const selected = activeGroups.find(group => group.businessId === selectedId);
  const sorted = [...selected.deals].sort((a, b) => b.discountRate - a.discountRate || a.price - b.price || a.id - b.id);
  await list.locator("li[data-business-id]").first().getByRole("button", { name: "예약하기", exact: true }).click();
  const modal = page.getByRole("dialog", { name: sorted[0].serviceName, exact: true });
  await page.getByRole("dialog").waitFor();
  assert.equal(await modal.locator('input[name="time-deal-choice"]:checked').inputValue(), String(sorted[0].id));
  assert.equal(await modal.getByRole("combobox").count(), 0);
  for (const deal of selected.deals) {
    await page.getByRole("dialog").locator(`label:has(input[value="${deal.id}"])`).click();
    await page.getByRole("dialog").getByRole("heading", { name: deal.serviceName, exact: true }).waitFor();
  }
  await page.getByRole("dialog").screenshot({ path: `${folder}/modal-selected.png` });
  await page.keyboard.press("Escape");
  // A banner click preserves that particular service.
  await go("/"); await banner.waitFor();
  await page.getByRole("button", { name: "1번째 타임딜 보기", exact: true }).click();
  await banner.locator(`[data-deal-id="${expectedTop[0].id}"]`).click();
  const openModal = page.getByRole("dialog", { name: expectedTop[0].serviceName, exact: true });
  await openModal.waitFor();
  assert.equal(await openModal.locator('input[name="time-deal-choice"]:checked').inputValue(), String(expectedTop[0].id));
  await openModal.getByRole("button", { name: "예약하기", exact: true }).click();
  const login = page.getByRole("dialog", { name: "로그인이 필요합니다", exact: true });
  await login.getByRole("button", { name: "로그인하기", exact: true }).click();
  await page.waitForURL("**/auth/login");
  assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem("dealvue-login-return")).path), `/checkout/${expectedTop[0].id}`);
  const directPath = `/checkout/${expectedTop[0].id}?source=banner`;
  await page.goto(base + directPath);
  await page.waitForURL("**/auth/login");
  await page.reload();
  await page.getByText("예약하려면 로그인이 필요합니다. 로그인하면 예약 화면으로 돌아가요.", { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem("dealvue-login-return")).path), directPath);
  const safeReturns = await page.evaluate(async () => {
    const { consumeReturnPath } = await import("/src/features/consumer/auth/loginReturn.ts");
    const consume = (path, expiresAt = Date.now() + 60000) => {
      sessionStorage.setItem("dealvue-login-return", JSON.stringify({ path, expiresAt }));
      return consumeReturnPath();
    };
    return {
      invalid: ["https://example.invalid", "//example.invalid", "/\\example.invalid", "/auth/login", "/auth/callback", "/search/../../auth/login"].map(path => consume(path)),
      expired: consume("/checkout/123", Date.now() - 1),
      valid: consume("/checkout/123?source=banner#booking"),
      consumed: consumeReturnPath(),
    };
  });
  assert.deepEqual(safeReturns, { invalid: Array(6).fill("/"), expired: "/", valid: "/checkout/123?source=banner#booking", consumed: "/" });
  await go("/"); await banner.waitFor();
  const firstIds = activeGroups.map(group => group.businessId);
  const endBeforeReload = activeGroups[0].endAt;
  await page.reload(); await banner.waitFor();
  const afterReload = await page.evaluate(async () => (await import("/src/features/consumer/catalog.ts")).requestConsumerCatalog());
  assert.equal(afterReload.find(deal => deal.businessId === firstIds[0]).endAt, endBeforeReload);
  const rounds = [];
  for (let index = 0; index < 4; index += 1) {
    const current = await page.evaluate(async () => (await import("/src/features/consumer/dealSchedule.ts")).currentRotationRound(Date.now()));
    const before = await banner.locator("[data-business-id]").evaluateAll(nodes => nodes.map(node => Number(node.dataset.businessId)));
    await page.getByRole("button", { name: "1번째 타임딜 보기", exact: true }).click();
    await banner.locator("[data-business-id]").first().click(); await page.getByRole("dialog").waitFor();
    const selectedBeforeExpiry = await page.getByRole("dialog").locator('input[name="time-deal-choice"]:checked').inputValue();
    await page.clock.fastForward(current.end - await page.evaluate(() => Date.now()) + 1000);
    await page.waitForFunction(ids => {
      const nodes = [...document.querySelectorAll('[aria-label="할인율 높은 타임딜 배너"] [data-business-id]')];
      return nodes.length === 5 && nodes.every(node => !ids.includes(Number(node.dataset.businessId)));
    }, before);
    const expired = page.getByRole("dialog");
    await expired.getByRole("button", { name: "마감", exact: true }).waitFor();
    assert.equal(await expired.getByRole("button", { name: "마감", exact: true }).isDisabled(), true);
    assert.equal(await expired.locator('input[name="time-deal-choice"]:checked').inputValue(), selectedBeforeExpiry);
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => document.body.style.overflow), "");
    rounds.push({ index: current.index, hours: (current.end - current.start) / 3600000 });
  }
  assert.deepEqual(rounds.map(round => round.hours), [1, 2, 3, 4]);
  for (const width of [320, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 844 }); await go("/"); await banner.waitFor(); await list.waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    const first = list.locator("li").first(); await first.evaluate(node => node.scrollIntoView({ block: "center" }));
    await first.screenshot({ path: `${folder}/group-card-${width}.png` });
    await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: `${folder}/home-${width}.png` });
    await page.getByRole("button", { name: "1번째 타임딜 보기", exact: true }).click();
    await banner.locator("[data-business-id]").first().click(); await page.getByRole("dialog").waitFor();
    await page.getByRole("dialog").locator('label:has(input[name="time-deal-choice"])').last().click();
    assert.equal(await page.getByRole("dialog").evaluate(node => node.scrollWidth > node.clientWidth + 1), false, `selected modal overflow at ${width}px`);
    await page.getByRole("dialog").screenshot({ path: `${folder}/modal-selected-${width}.png` });
    await page.keyboard.press("Escape");
  }
  // Exercise exclusions and the single-offer price using dated API fixtures only.
  const now = await page.evaluate(() => Date.now());
  const fixtureRows = ["hair", "aesthetic", "makeup"].map(category => catalog.find(deal => deal.category === category));
  const make = (deal, id, extra = {}) => ({ id, business_id: deal.businessId, service_id: deal.serviceId, original_price: 100000, deal_price: 70000, remaining_capacity: 1, start_at: new Date(now - 1000).toISOString(), end_at: new Date(now + 3600000).toISOString(), ...extra });
  const fixtures = [make(fixtureRows[0], 9101, { deal_price: 60000 }), make(fixtureRows[0], 9102, { deal_price: 50000 }), make(fixtureRows[0], 9103, { original_price: 80000, deal_price: 40000 }), make(fixtureRows[1], 9201, { deal_price: 50000, end_at: new Date(now + 1800000).toISOString() }), make(fixtureRows[2], 9301, { start_at: new Date(now + 10000).toISOString() }), make(fixtureRows[2], 9302, { end_at: new Date(now - 1).toISOString() }), make(fixtureRows[2], 9303, { remaining_capacity: 0 }), make(fixtureRows[2], 9304, { end_at: null })];
  await page.route("**/rest/v1/provided_deal_templates*", route => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route("**/rest/v1/time_deals*", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixtures) }));
  await go("/"); await banner.waitFor();
  assert.deepEqual(await banner.locator("[data-deal-id]").evaluateAll(nodes => nodes.map(node => Number(node.dataset.dealId))), [9103, 9201], "best active deal per shop; no duplicate shops to fill five slots");
  await page.getByRole("button", { name: "1번째 타임딜 보기", exact: true }).click();
  await banner.locator('[data-deal-id="9103"]').click();
  const fixtureModal = page.getByRole("dialog");
  await fixtureModal.waitFor();
  assert.equal(await fixtureModal.locator('input[name="time-deal-choice"]:checked').inputValue(), "9103", "banner choice is selected in the modal");
  await fixtureModal.locator('label:has(input[value="9101"])').click();
  assert.equal(await fixtureModal.locator('input[name="time-deal-choice"]:checked').inputValue(), "9101", "other deals from the same shop remain available in the modal");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "2번째 타임딜 보기", exact: true }).click();
  await banner.locator('[data-deal-id="9201"]').click(); await fixtureModal.waitFor();
  await fixtureModal.getByText("50,000원", { exact: false }).first().waitFor();
  assert.equal(await fixtureModal.getByRole("radio").count(), 0, "single offer needs no picker");
  await page.keyboard.press("Escape");
  await page.route("**/rest/v1/time_deals*", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([fixtures[3]]) }));
  await go("/"); await banner.waitFor();
  assert.equal(await banner.locator("[data-deal-id]").count(), 1);
  assert.equal(await page.getByRole("button", { name: /번째 타임딜 보기/ }).count(), 0);
  await page.route("**/rest/v1/time_deals*", route => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await go("/"); await page.getByRole("link", { name: "딜키트", exact: true }).first().waitFor();
  await page.waitForTimeout(500);
  assert.equal(await banner.count(), 0); assert.equal(await list.count(), 0);
  assert.equal(await page.getByRole("heading", { name: "실시간 인기 타임딜", exact: true }).count(), 0);
  assert.deepEqual(errors, []); assert.deepEqual(writes, []);
  await writeFile(`${folder}/verification.json`, JSON.stringify({ businessesPerRound: 5, rotationHours: rounds.map(round => round.hours), activeOnly: true, groupedShops: true, bestDealPreselected: true, topFiveDistinctShops: true, reloadStable: true, expiryPreservesSelectionAndBlocksBooking: true, emptyCatalogHidden: true, browserErrors: errors, databaseWrites: writes }, null, 2));
  console.log("PASS actual 75-price catalog, top deals from five distinct shops, default and explicit radio selection, guest login gate, 1–4h rotation, expiry blocks booking without swapping, tie ordering, 0/1/2/5 banners, exclusions, mobile layouts");
  await context.close();
  // Exercise the callback page after a full navigation with an already-issued mock session.
  // Provider authorization and code exchange are outside this browser-only fixture.
  const callbackContext = await browser.newContext();
  await installAuthFixture(callbackContext);
  const callback = await callbackContext.newPage();
  callback.on("pageerror", error => errors.push(error.message));
  await callback.goto(base + "/");
  await callback.evaluate(path => sessionStorage.setItem("dealvue-login-return", JSON.stringify({ path, expiresAt: Date.now() + 60000 })), directPath);
  await callback.goto(base + "/auth/callback");
  await callback.waitForURL(base + directPath);
  await callback.getByRole("radiogroup", { name: "방문 날짜", exact: true }).waitFor();
  assert.equal(await callback.evaluate(() => sessionStorage.getItem("dealvue-login-return")), null);
  await callbackContext.close();
  assert.deepEqual(errors, []);
  console.log("PASS direct booking URL, reload-safe return, redirect validation/expiry/single use, mocked OAuth callback return");
} finally { await browser.close(); }
