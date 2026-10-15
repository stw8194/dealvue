import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const { chromium } = await import(process.env.DEALVUE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href : "playwright");
const base = process.env.DEALVUE_TEST_URL ?? "http://127.0.0.1:5185";
const env = Object.fromEntries((await readFile(".env", "utf8")).split(/\r?\n/).flatMap(line => { const m = line.match(/^([A-Z_]+)=(.*)$/); return m ? [[m[1], m[2].trim().replace(/^['"]|['"]$/g, "")]] : []; }));
const output = "node_modules/.tmp/reference-restoration";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [], writes = [], results = [];
const menuLabels = ["예약내역", "찜 목록", "쿠폰함", "포인트", "리뷰관리", "친구초대", "내 통계", "AI 상담"];
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await context.route("**/*", route => {
    const request = route.request();
    if (request.url().startsWith(base) || request.url().startsWith("data:")) return route.continue();
    if (request.url().startsWith(env.VITE_SUPABASE_URL + "/rest/v1/")) {
      if (request.method() === "GET") return route.continue();
      writes.push(request.method());
    }
    return route.abort();
  });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  for (const width of [320, 375, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(base + "/mypage");
    const menu = page.getByRole("navigation", { name: "마이페이지 바로가기", exact: true });
    await menu.waitFor();
    assert.deepEqual(await menu.getByRole("link").allTextContents().then(labels => labels.map(label => label.trim())), menuLabels);
    const menuSize = await menu.boundingBox();
    const menuRows = await menu.getByRole("link").evaluateAll(links => [...new Set(links.map(link => Math.round(link.getBoundingClientRect().top)))]);
    assert.equal(menuRows.length, 2, `exactly two rows at ${width}px`);
    assert.ok(menuSize.height >= 175 && menuSize.height <= 205, `reference menu proportions at ${width}px: ${menuSize.height}`);
    assert.equal(await page.getByRole("heading", { name: "나의 아바타", exact: true }).count(), 0, "no unsolicited dashboard card");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await menu.screenshot({ path: `${output}/mypage-menu-${width}.png` });
    await page.screenshot({ path: `${output}/mypage-${width}.png` });

    await page.goto(base + "/");
    await page.getByRole("heading", { name: "실시간 인기 타임딜", exact: true }).waitFor();
    const card = page.locator("main > ul > li").first();
    await card.waitFor();
    await page.evaluate(() => document.fonts.ready);
    const mainSize = await page.locator("main").boundingBox();
    const cardSize = await card.boundingBox();
    assert.ok(mainSize.width <= 480.5 && mainSize.width <= width, `bounded home at ${width}px`);
    assert.ok(cardSize.height < 240, `card does not grow with viewport: ${width}px ${cardSize.height}px`);
    const countdown = card.locator('[aria-label="마감까지 남은 시간"]');
    assert.match(await countdown.innerText(), /^(?:\d{2,}|--):(?:\d{2}|--):(?:\d{2}|--)$/);
    assert.doesNotMatch(await page.locator("main").innerText(), /\d{2}:\d{2}[––-]\d{2}:\d{2}/, "home must not replace countdowns with supplied booking windows");
    const fits = await page.locator("main > ul > li").evaluateAll(cards => cards.map(card => {
      const reserve = [...card.querySelectorAll("button")].find(button => button.textContent.trim() === "예약하기");
      const price = reserve.previousElementSibling;
      const buttonRect = reserve.getBoundingClientRect(), priceRect = price.getBoundingClientRect(), cardRect = card.getBoundingClientRect();
      const picture = card.querySelector("img").getBoundingClientRect();
      return { name: card.innerText, fits: priceRect.right + 4 <= buttonRect.left && buttonRect.right <= cardRect.right - 8 && picture.width <= 160 && Math.abs(picture.width - picture.height) < 1 };
    }));
    assert.ok(fits.every(result => result.fits), `photo/price/button collision at ${width}px: ${JSON.stringify(fits.filter(result => !result.fits))}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    assert.equal(await page.locator('a[href="/mypage/playground"]').count(), 1, "original playground entry remains");
    await card.evaluate(node => node.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(350);
    await card.screenshot({ path: `${output}/home-card-${width}.png` });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${output}/home-${width}.png` });
    results.push({ width, menuRows: menuRows.length, menuHeight: menuSize.height, homeWidth: mainSize.width, cardHeight: cardSize.height, checkedCards: fits.length });
  }
  // A dated offer still ticks down; an undated source row does not invent a date.
  await page.route("**/rest/v1/provided_deal_templates*", route => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route("**/rest/v1/time_deals*", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: 10, business_id: 42, service_id: 261, original_price: 170000, deal_price: 76500, remaining_capacity: 1, end_at: new Date(Date.now() + 3600000).toISOString() }]) }));
  await page.goto(base + "/");
  const timer = page.locator('[aria-label="마감까지 남은 시간"]').first();
  await timer.waitFor();
  const first = await timer.innerText();
  await page.waitForTimeout(1200);
  assert.notEqual(await timer.innerText(), first, "existing countdown still ticks for dated offers");
  assert.deepEqual(errors, []); assert.deepEqual(writes, []);
  await writeFile(`${output}/verification.json`, JSON.stringify({ results, browserErrors: errors, databaseWrites: writes }, null, 2));
  console.log("PASS " + JSON.stringify(results));
  await context.close();
} finally { await browser.close(); }
