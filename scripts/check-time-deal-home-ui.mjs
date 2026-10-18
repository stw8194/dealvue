import assert from "node:assert/strict";
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
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  await page.clock.install({ time: new Date("2026-10-15T00:10:00+09:00") });
  const go = async path => { await page.goto(base + path); await page.locator("main").waitFor(); };
  const banner = page.getByRole("region", { name: "진행 중인 매장 타임딜 배너", exact: true });
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
  assert.equal(await banner.locator("[data-business-id]").count(), 5);
  assert.equal(new Set(await banner.locator("[data-business-id]").evaluateAll(nodes => nodes.map(node => node.dataset.businessId))).size, 5);
  assert.doesNotMatch(await banner.innerText(), /\d[\d,]*\s*원/, "multi-offer banners hide all prices");
  assert.doesNotMatch(await list.innerText(), /\d[\d,]*\s*원/, "multi-offer list cards hide all prices");
  for (const category of ["hair", "makeup", "aesthetic"]) {
    await go(`/?category=${category}`); await banner.waitFor(); await list.waitFor();
    const shown = await list.locator("li[data-business-id]").evaluateAll(nodes => nodes.map(node => Number(node.dataset.businessId)));
    assert.deepEqual(shown, activeGroups.filter(group => group.category === category).map(group => group.businessId));
  }
  const selected = activeGroups[0];
  await page.getByRole("button", { name: "1번째 타임딜 보기", exact: true }).click();
  await banner.locator(`[data-business-id="${selected.businessId}"]`).click();
  const modal = page.getByRole("dialog"); await modal.waitFor();
  assert.doesNotMatch(await modal.innerText(), /\d[\d,]*\s*원/, "modal has no price until a service is selected");
  assert.equal(await modal.getByLabel("시술 선택", { exact: true }).locator("option").count(), selected.deals.length + 1);
  await modal.screenshot({ path: `${folder}/modal-unselected.png` });
  for (const deal of selected.deals) {
    await modal.getByLabel("시술 선택", { exact: true }).selectOption(String(deal.id));
    await modal.getByText(`${deal.price.toLocaleString()}원`, { exact: true }).waitFor();
    assert.equal(await modal.getByRole("link", { name: "일정 선택 · 예약하기", exact: true }).getAttribute("href"), `/checkout/${deal.id}`);
  }
  await modal.screenshot({ path: `${folder}/modal-selected.png` });
  await modal.getByRole("link", { name: "일정 선택 · 예약하기", exact: true }).click();
  await page.waitForURL("**/checkout/**"); await page.getByRole("button", { name: /원 시연 결제하기 \(청구 없음\)$/ }).waitFor();
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
    await banner.locator("[data-business-id]").first().click(); await modal.waitFor();
    await page.clock.fastForward(current.end - await page.evaluate(() => Date.now()) + 1000);
    await page.waitForFunction(ids => {
      const nodes = [...document.querySelectorAll('[aria-label="진행 중인 매장 타임딜 배너"] [data-business-id]')];
      return nodes.length === 5 && nodes.every(node => !ids.includes(Number(node.dataset.businessId)));
    }, before);
    assert.equal(await modal.count(), 0, "expired modal closes rather than booking an old offer");
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
    await banner.locator("[data-business-id]").first().click(); await modal.waitFor();
    await modal.getByLabel("시술 선택", { exact: true }).selectOption({ index: 5 });
    assert.equal(await modal.evaluate(node => node.scrollWidth > node.clientWidth + 1), false, `selected modal overflow at ${width}px`);
    await modal.screenshot({ path: `${folder}/modal-selected-${width}.png` });
    await page.keyboard.press("Escape");
  }
  // Exercise exclusions and the single-offer price using dated API fixtures only.
  const now = await page.evaluate(() => Date.now());
  const fixtureRows = ["hair", "aesthetic", "makeup"].map(category => catalog.find(deal => deal.category === category));
  const make = (deal, id, extra = {}) => ({ id, business_id: deal.businessId, service_id: deal.serviceId, original_price: 100000, deal_price: 70000, remaining_capacity: 1, start_at: new Date(now - 1000).toISOString(), end_at: new Date(now + 3600000).toISOString(), ...extra });
  const fixtures = [make(fixtureRows[0], 9101), make(fixtureRows[0], 9102, { deal_price: 50000 }), make(fixtureRows[1], 9201), make(fixtureRows[2], 9301, { start_at: new Date(now + 10000).toISOString() }), make(fixtureRows[2], 9302, { end_at: new Date(now - 1).toISOString() }), make(fixtureRows[2], 9303, { remaining_capacity: 0 }), make(fixtureRows[2], 9304, { end_at: null })];
  await page.route("**/rest/v1/provided_deal_templates*", route => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route("**/rest/v1/time_deals*", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(fixtures) }));
  await go("/"); await banner.waitFor();
  assert.equal(await banner.locator("[data-business-id]").count(), 2);
  await page.getByRole("button", { name: "2번째 타임딜 보기", exact: true }).click();
  await banner.locator(`[data-business-id="${fixtureRows[1].businessId}"]`).click(); await modal.waitFor();
  await modal.getByText("70,000원", { exact: true }).waitFor();
  assert.equal(await modal.getByRole("combobox").count(), 0, "single offer needs no picker");
  await page.keyboard.press("Escape");
  await page.route("**/rest/v1/time_deals*", route => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await go("/"); await page.getByRole("link", { name: "딜키트", exact: true }).first().waitFor();
  await page.waitForTimeout(500);
  assert.equal(await banner.count(), 0); assert.equal(await list.count(), 0);
  assert.equal(await page.getByRole("heading", { name: "실시간 인기 타임딜", exact: true }).count(), 0);
  assert.deepEqual(errors, []); assert.deepEqual(writes, []);
  await writeFile(`${folder}/verification.json`, JSON.stringify({ businessesPerRound: 5, rotationHours: rounds.map(round => round.hours), activeOnly: true, groupedShops: true, pricesHiddenUntilChoice: true, reloadStable: true, expirySwitchesTeam: true, emptyCatalogHidden: true, browserErrors: errors, databaseWrites: writes }, null, 2));
  console.log("PASS actual 75-price catalog, five grouped shops, hidden multi-offer prices/ranges, modal selection/checkout, 1–4h automatic rotation, reload stability, exact expiry, future/sold-out/undated exclusions, empty home, mobile layouts");
  await context.close();
} finally { await browser.close(); }
