import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { mkdir } from "node:fs/promises";

const { chromium } = await import(process.env.DEALVUE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href : "playwright");
const base = process.env.DEALVUE_TEST_URL ?? "http://127.0.0.1:5180";
const browser = await chromium.launch({ headless: true });
const errors = [], requests = [];
const key = "dealvue-consumer-engagement-preview-v1";
await mkdir("node_modules/.tmp", { recursive: true });
async function setup(reducedMotion = "no-preference", preview = true) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion });
  await context.route("**/*", route => {
    if (route.request().url().startsWith(base) || route.request().url().startsWith("data:")) return route.continue();
    requests.push(route.request().url().split("?")[0]); return route.abort();
  });
  await context.addInitScript(enabled => {
    localStorage.setItem("dealvue-consumer-preview-mode", JSON.stringify({ state: { enabled }, version: 0 }));
    crypto.getRandomValues = array => { array.fill(3); return array; };
  }, preview);
  const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message));
  return { context, page };
}
async function go(page, path) { await page.goto(base + path); await page.locator(".playground-shell").waitFor(); }
async function open(page, tab) {
  if (await page.locator("dialog[open]").count()) await page.getByRole("button", { name: "놀이터 팝업 닫기" }).click();
  await page.locator(`.card-${tab}`).click(); await page.locator(`.modal-${tab}[open]`).waitFor();
}
const state = page => page.evaluate(async key => {
  const saved = localStorage.getItem(key); if (saved) return JSON.parse(saved).state;
  const { useEngagementStore } = await import("/src/features/consumer/engagement/store.ts");
  return JSON.parse(JSON.stringify(useEngagementStore.getState()));
}, key);
const balance = data => data.pointHistory.reduce((sum, row) => sum + row.amount, 0);
const complete = async page => {
  await page.locator(".event-result.has-reward").waitFor();
  await page.getByRole("button", { name: "오늘 참여 완료 · 내일 다시 만나요", exact: true }).waitFor();
};
async function screenshot(page, name) { await page.waitForTimeout(400); await page.screenshot({ path: `node_modules/.tmp/playground-v2-${name}.png` }); }
try {
  const { context, page } = await setup();
  await go(page, "/mypage/playground");
  assert.equal(await page.locator("main").count(), 1); assert.equal(await page.locator("dialog[open]").count(), 0);
  await open(page, "wardrobe");
  assert.equal(await page.getByRole("dialog", { name: "드레스룸", exact: true }).count(), 1);
  await page.getByRole("button", { name: "라일락 데이 · 50 포인트", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "50 P로 소장하고 입기" }).isDisabled(), true);
  assert.equal((await state(page)).pointHistory.length, 0);
  await screenshot(page, "wardrobe-mobile");
  await page.keyboard.press("Escape"); await page.locator("dialog[open]").waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => document.body.style.overflow), "");

  await open(page, "fortune");
  await page.getByRole("button", { name: "오늘의 운세 열어보기 · 5 P" }).click();
  await page.locator(".fortune-reading").waitFor();
  assert.notEqual(await page.locator(".crystal-mist").first().evaluate(node => getComputedStyle(node).animationName), "none");
  await page.getByText("오늘의 5 P 선물을 받았어요", { exact: false }).waitFor();
  assert.equal(balance(await state(page)), 5);
  assert.equal(await page.getByRole("button", { name: "오늘의 운세 완료 · 내일 다시 만나요" }).isDisabled(), true);
  await page.locator(".fortune-result").waitFor(); assert.equal((await state(page)).pointHistory.length, 1);

  await open(page, "roulette");
  await page.getByRole("button", { name: "행운 룰렛 돌리기", exact: true }).evaluate(button => { button.click(); button.click(); });
  await page.locator(".is-spinning").waitFor(); assert.equal(balance(await state(page)), 5);
  const rects = await page.evaluate(() => {
    const wheel = document.querySelector(".roulette-machine").getBoundingClientRect(), button = document.querySelector(".roulette-spin-button").getBoundingClientRect();
    return { wheelTop: wheel.top, wheelBottom: wheel.bottom, buttonBottom: button.bottom, height: innerHeight };
  });
  assert.ok(rects.wheelTop > 0 && rects.wheelBottom < rects.height && rects.buttonBottom < rects.height, "wheel and start button must stay visible together");
  const before = await page.locator(".wheel-disc").evaluate(node => getComputedStyle(node).transform);
  await page.waitForTimeout(300); assert.notEqual(await page.locator(".wheel-disc").evaluate(node => getComputedStyle(node).transform), before);
  await complete(page); assert.equal(balance(await state(page)), 55);
  const angle = await page.locator(".wheel-disc").evaluate(node => { const m = new DOMMatrix(getComputedStyle(node).transform); return (Math.atan2(m.b, m.a) * 180 / Math.PI + 360) % 360; });
  assert.ok(Math.abs(angle - 225) < .1, `wrong landing ${angle}`);
  await screenshot(page, "roulette-mobile");
  assert.equal(await page.getByRole("button", { name: "오늘의 룰렛 참여 완료", exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole("button", { name: "오늘 참여 완료 · 내일 다시 만나요", exact: true }).isDisabled(), true);
  assert.equal(await page.evaluate(async () => (await import("/src/features/consumer/engagement/store.ts")).useEngagementStore.getState().beginRoulette()), null);
  assert.equal(balance(await state(page)), 55); assert.equal((await state(page)).pointHistory.length, 2);
  await page.reload(); await complete(page); assert.equal((await state(page)).pointHistory.length, 2);

  await open(page, "wardrobe");
  await page.getByRole("button", { name: "라일락 데이 · 50 포인트", exact: true }).click();
  await page.getByRole("button", { name: "50 P로 소장하고 입기" }).click();
  assert.equal(balance(await state(page)), 5); assert.equal((await state(page)).outfit, "lilac");
  await page.reload(); await page.getByRole("button", { name: "지금 입고 있어요", exact: true }).waitFor();
  await page.getByRole("button", { name: "선데이 니트 · 보유", exact: true }).click(); await page.getByRole("button", { name: "이 룩으로 갈아입기" }).click();
  await page.getByRole("button", { name: "라일락 데이 · 보유", exact: true }).click(); await page.getByRole("button", { name: "이 룩으로 갈아입기" }).click();
  assert.equal((await state(page)).pointHistory.length, 3);
  await page.getByRole("button", { name: "헤어 장식", exact: true }).click();
  await page.getByRole("button", { name: "실크 리본 · 15 포인트", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "15 P로 소장하고 착용하기" }).isDisabled(), true);
  assert.equal((await state(page)).accessories.hair, "hair-none", "accessory preview must not equip or charge");
  // Add a test-only wallet fixture to exercise all independently equipped slots.
  await page.evaluate(async () => { const { useEngagementStore } = await import("/src/features/consumer/engagement/store.ts"); useEngagementStore.setState({ pointHistory: [{ id: "fixture", reason: "test fixture", amount: 200, createdAt: new Date().toISOString() }] }); });
  await page.getByRole("button", { name: "15 P로 소장하고 착용하기" }).click();
  await page.getByRole("button", { name: "귀걸이", exact: true }).click(); await page.getByRole("button", { name: "진주 드롭 · 20 포인트", exact: true }).click(); await page.getByRole("button", { name: "20 P로 소장하고 착용하기" }).click();
  await page.getByRole("button", { name: "가방", exact: true }).click(); await page.getByRole("button", { name: "체리 미니백 · 25 포인트", exact: true }).click(); await page.getByRole("button", { name: "25 P로 소장하고 착용하기" }).click();
  assert.equal(balance(await state(page)), 140); assert.deepEqual((await state(page)).accessories, { hair: "silk-bow", ears: "pearl-drop", bag: "mini-bag", necklace: "necklace-none" });
  await page.reload(); await page.locator(".fashion-studio").waitFor(); assert.equal((await state(page)).accessories.bag, "mini-bag");
  await page.getByRole("button", { name: "가방", exact: true }).click(); await page.getByRole("button", { name: "가방 없음 · 보유", exact: true }).click(); await page.getByRole("button", { name: "이 아이템 착용하기" }).click();
  await page.getByRole("button", { name: "체리 미니백 · 보유", exact: true }).click(); await page.getByRole("button", { name: "이 아이템 착용하기" }).click(); assert.equal(balance(await state(page)), 140);
  await screenshot(page, "accessories-mobile");
  console.log("PASS modal/Escape, visible animated roulette, daily participation locks, clothes and independent accessories");

  for (const size of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 768, height: 900 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    for (const tab of ["wardrobe", "fortune", "roulette"]) {
      await go(page, `/rewards?tab=${tab}`); await page.locator("dialog[open]").waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      assert.equal(await page.locator("dialog").evaluate(node => node.scrollWidth > node.clientWidth + 1), false, `popup overflow ${tab} ${size.width}`);
      if (size.width === 1440) await screenshot(page, `${tab}-desktop`);
    }
  }
  await context.close();

  const recover = await setup(); await go(recover.page, "/rewards?tab=roulette"); await recover.page.getByRole("button", { name: "룰렛 중앙 START", exact: true }).click(); await recover.page.locator(".is-spinning").waitFor();
  const pending = (await state(recover.page)).roulettePlay; assert.equal(pending.settled, false); await recover.page.reload(); await complete(recover.page);
  assert.equal((await state(recover.page)).roulettePlay.id, pending.id); assert.equal(balance(await state(recover.page)), 50); await recover.context.close();
  const navigation = await setup(); await go(navigation.page, "/rewards?tab=roulette"); await navigation.page.getByRole("button", { name: "행운 룰렛 돌리기", exact: true }).click(); await navigation.page.locator(".is-spinning").waitFor();
  await navigation.page.getByRole("button", { name: "놀이터 팝업 닫기" }).click();
  await navigation.page.getByRole("link", { name: "보유 포인트 50 P · 포인트 내역", exact: true }).waitFor();
  assert.equal(balance(await state(navigation.page)), 50); await open(navigation.page, "roulette"); await complete(navigation.page); assert.equal((await state(navigation.page)).pointHistory.length, 1); await navigation.context.close();

  const reduced = await setup("reduce"); await go(reduced.page, "/fortune");
  assert.equal(await reduced.page.locator(".crystal-mist").first().evaluate(node => getComputedStyle(node).animationName), "none");
  await reduced.page.getByRole("button", { name: "오늘의 운세 열어보기 · 5 P" }).click(); await reduced.page.getByText("오늘의 5 P 선물을 받았어요", { exact: false }).waitFor({ timeout: 1500 });
  await open(reduced.page, "roulette"); await reduced.page.getByRole("button", { name: "행운 룰렛 돌리기", exact: true }).click(); await reduced.page.getByRole("button", { name: "오늘 참여 완료 · 내일 다시 만나요", exact: true }).waitFor({ timeout: 1500 }); assert.equal(balance(await state(reduced.page)), 55); await reduced.context.close();
  const unified = await setup("reduce", false); await go(unified.page, "/rewards?tab=roulette"); assert.equal(await unified.page.locator("dialog[open]").count(), 1); await unified.page.getByRole("button", { name: "행운 룰렛 돌리기", exact: true }).click(); await complete(unified.page); assert.equal(balance(await state(unified.page)), 50); await unified.context.close();
  assert.deepEqual(errors, []); assert.deepEqual(requests, []);
  console.log("PASS reload/close recovery, reduced motion, features available regardless of old mode flag, and 320–1440 px popup layouts; no browser errors");
} finally { await browser.close(); }
