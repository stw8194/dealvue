import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { chromium } = await import(process.env.DEALVUE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href : "playwright");
const base = process.env.DEALVUE_TEST_URL ?? "http://127.0.0.1:5180";
const browser = await chromium.launch({ headless: true });
const key = "dealvue-consumer-engagement-preview-v1", errors = [], external = [];
await mkdir("node_modules/.tmp", { recursive: true });
async function setup({ legacy = false, reducedMotion = "no-preference" } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion });
  await context.route("**/*", route => { if (route.request().url().startsWith(base) || route.request().url().startsWith("data:")) return route.continue(); external.push(route.request().url()); return route.abort(); });
  await context.addInitScript(legacy => {
    localStorage.setItem("dealvue-consumer-preview-mode", JSON.stringify({ state: { enabled: true }, version: 0 }));
    if (legacy && !localStorage.getItem("collection-test-initialized")) {
      localStorage.setItem("dealvue-consumer-engagement-preview-v1", JSON.stringify({ version: 1, state: { outfit: "pink", ownedOutfits: ["basic", "pink"], accessories: { hair: "hair-none", ears: "ears-none", bag: "bag-none" }, ownedAccessories: ["hair-none", "ears-none", "bag-none"], pointHistory: [{ id: "legacy-wallet", reason: "test fixture", amount: 1000, createdAt: new Date().toISOString() }] } }));
      localStorage.setItem("collection-test-initialized", "yes");
    }
  }, legacy);
  const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message)); return { context, page };
}
const state = page => page.evaluate(async () => { const { useEngagementStore } = await import("/src/features/consumer/engagement/store.ts"); return JSON.parse(JSON.stringify(useEngagementStore.getState())); });
const balance = data => data.pointHistory.reduce((sum, item) => sum + item.amount, 0);
async function shot(page, name) { await page.waitForTimeout(400); await page.screenshot({ path: `node_modules/.tmp/collection-${name}.png` }); }
async function category(page, name) { await page.getByRole("group", { name: "꾸미기 종류", exact: true }).getByRole("button", { name, exact: true }).click(); }
async function collection(page, name) { await page.locator(".collection-filters button").filter({ hasText: name }).click(); }
try {
  const { context, page } = await setup({ legacy: true });
  const images = []; page.on("request", request => { if (request.resourceType() === "image") images.push(new URL(request.url()).pathname); });
  await page.goto(base + "/rewards?tab=wardrobe"); await page.locator(".fashion-studio").waitFor();
  const legacy = await state(page); assert.equal(legacy.outfit, "pink"); assert.equal(balance(legacy), 1000); assert.equal(legacy.accessories.necklace, "necklace-none"); assert.ok(legacy.ownedAccessories.includes("necklace-none"));
  assert.equal(await page.locator(".outfit-card").count(), 6);
  assert.equal(images.some(url => url.includes("collection-daily") || url.includes("collection-season") || url.includes("collection-dream")), false, "new sheets must not load before their collection is viewed");
  for (const name of ["데일리", "사계절", "드림", "티파티", "작은 모험"]) { await collection(page, name); assert.equal(await page.locator(".outfit-card").count(), 6); }
  await collection(page, "전체"); assert.equal(await page.locator(".outfit-card").count(), 36);
  await page.getByLabel("소장한 아이템만", { exact: false }).check(); assert.equal(await page.locator(".outfit-card").count(), 2); await page.getByLabel("소장한 아이템만", { exact: false }).uncheck();
  await collection(page, "데일리"); await page.getByRole("button", { name: "딸기 산책 · 45 포인트", exact: true }).click();
  assert.equal(balance(await state(page)), 1000); await page.getByRole("button", { name: "45 P로 소장하고 입기", exact: true }).click(); assert.equal(balance(await state(page)), 955); assert.equal((await state(page)).outfit, "strawberry");
  await shot(page, "daily-mobile");
  assert.equal(await page.locator("dialog .avatar-motion-controls, dialog .avatar-pose-controls").count(), 0);
  await category(page, "목걸이"); assert.equal(await page.locator(".outfit-card").count(), 37); await page.getByRole("button", { name: "쁘띠 진주 · 30 포인트", exact: true }).click(); await page.getByRole("button", { name: "30 P로 소장하고 착용하기", exact: true }).click();
  await category(page, "헤어 장식"); assert.equal(await page.locator(".outfit-card").count(), 37); await page.getByRole("button", { name: "토끼 헤어밴드 · 45 포인트", exact: true }).click(); await page.getByRole("button", { name: "45 P로 소장하고 착용하기", exact: true }).click();
  await category(page, "배경"); assert.equal(await page.locator(".outfit-card").count(), 20); await page.getByRole("button", { name: "벚꽃 정원 · 45 포인트", exact: true }).click(); await page.getByRole("button", { name: "45 P로 소장하고 꾸미기", exact: true }).click(); assert.equal(balance(await state(page)), 835);
  assert.equal((await state(page)).backdrop, "cherry"); assert.equal((await state(page)).accessories.necklace, "pearl-necklace");
  await shot(page, "cherry-studio-mobile");
  await category(page, "코디북"); await page.getByLabel("코디 이름", { exact: true }).fill("딸기 토끼의 봄"); await page.getByRole("button", { name: "현재 코디 저장", exact: true }).click();
  assert.equal((await state(page)).savedLooks.length, 1); assert.equal(balance(await state(page)), 835);
  await category(page, "옷"); await collection(page, "시그니처"); await page.getByRole("button", { name: "선데이 니트 · 보유", exact: true }).click(); await page.getByRole("button", { name: "이 룩으로 갈아입기", exact: true }).click();
  await category(page, "코디북"); await page.getByRole("button", { name: "딸기 토끼의 봄 코디 입기", exact: true }).click(); assert.equal((await state(page)).outfit, "strawberry"); assert.equal(balance(await state(page)), 835);
  await page.reload(); await page.locator(".fashion-studio").waitFor(); assert.equal((await state(page)).savedLooks[0].name, "딸기 토끼의 봄"); assert.equal((await state(page)).backdrop, "cherry");
  await category(page, "코디북");
  for (let i = 2; i <= 6; i++) { await page.getByLabel("코디 이름", { exact: true }).fill(`코디 ${i}`); await page.getByRole("button", { name: "현재 코디 저장", exact: true }).click(); }
  assert.equal((await state(page)).savedLooks.length, 6); assert.equal(await page.getByRole("button", { name: "현재 코디 저장", exact: true }).isDisabled(), true);
  await page.getByRole("button", { name: "코디 6 코디 삭제", exact: true }).click(); assert.equal((await state(page)).savedLooks.length, 5); assert.equal(balance(await state(page)), 835);
  await category(page, "옷"); await collection(page, "드림"); await page.getByRole("button", { name: "별빛 요정 · 110 포인트", exact: true }).click(); await page.getByRole("button", { name: "다음에 모을 옷으로 찜하기", exact: true }).click();
  await category(page, "코디북"); assert.equal(await page.getByRole("button", { name: "현재 코디 저장", exact: true }).isDisabled(), true);
  assert.equal(await page.evaluate(async () => { const { useEngagementStore } = await import("/src/features/consumer/engagement/store.ts"); const store = useEngagementStore.getState(); return store.saveLook("unowned", { outfit: "fairy", accessories: store.accessories, backdrop: store.backdrop }); }), null);
  await page.getByRole("button", { name: "놀이터 팝업 닫기", exact: true }).click(); await page.getByText("다음에 모을 옷 · 별빛 요정", { exact: true }).waitFor(); await page.locator(".home-look-goal button").click(); await page.getByRole("button", { name: "별빛 요정 · 110 포인트", exact: true }).waitFor(); assert.equal(await page.getByRole("button", { name: "별빛 요정 · 110 포인트", exact: true }).getAttribute("aria-pressed"), "true");
  await page.setViewportSize({ width: 1440, height: 900 }); await shot(page, "dream-desktop");
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 844 }); for (const label of ["옷", "헤어 장식", "귀걸이", "가방", "목걸이", "배경", "코디북"]) { await category(page, label); assert.equal(await page.locator("dialog").evaluate(node => node.scrollWidth > node.clientWidth + 1), false, `popup overflow ${width}px ${label}`); } }
  await context.close(); console.log("PASS legacy migration, 36 looks/lazy sheets, clothing transitions, purchases, scenes, goals and 6 saved looks");

  const fortune = await setup(); await fortune.page.goto(base + "/fortune"); await fortune.page.getByRole("button", { name: "오늘의 운세 열어보기 · 5 P", exact: true }).click(); await fortune.page.locator(".has-finale").waitFor();
  assert.equal(await fortune.page.locator(".finale-star").count(), 18); assert.equal(await fortune.page.locator(".finale-ring").count(), 3); await fortune.page.waitForTimeout(300);
  const finale = await fortune.page.locator(".crystal-finale").boundingBox(); assert.ok(finale.y > 50 && finale.y + finale.height < 844, "fortune finale must be visible after button click");
  assert.notEqual(await fortune.page.locator(".finale-light").evaluate(node => getComputedStyle(node).animationName), "none"); assert.equal(balance(await state(fortune.page)), 5); await fortune.page.screenshot({ path: "node_modules/.tmp/collection-fortune-finale.png" });
  await fortune.page.waitForFunction(() => { const rect = document.querySelector(".fortune-result").getBoundingClientRect(); return rect.top > 55 && rect.bottom < innerHeight - 5; });
  assert.equal(await fortune.page.getByRole("button", { name: "오늘의 운세 완료 · 내일 다시 만나요", exact: true }).isDisabled(), true); assert.equal((await state(fortune.page)).pointHistory.length, 1); await fortune.context.close();
  const reduced = await setup({ reducedMotion: "reduce" }); await reduced.page.goto(base + "/rewards?tab=wardrobe"); await reduced.page.getByRole("button", { name: "로즈 발레 · 30 포인트", exact: true }).click(); await reduced.page.locator("[data-avatar-turn][data-outfit=pink]").waitFor(); assert.equal(await reduced.page.locator("[data-avatar-turn][data-ready]").getAttribute("data-turning"), "false"); await reduced.page.goto(base + "/fortune"); await reduced.page.getByRole("button", { name: "오늘의 운세 열어보기 · 5 P", exact: true }).click(); await reduced.page.locator(".has-finale").waitFor(); assert.equal(await reduced.page.locator(".finale-star").first().evaluate(node => getComputedStyle(node).display), "none"); await reduced.context.close();
  assert.deepEqual(errors, []); assert.deepEqual(external, []); console.log("PASS visible crystal finale, automatic result reveal, repeat reward guard and reduced motion");
} finally { await browser.close(); }
