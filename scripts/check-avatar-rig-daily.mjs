import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { mkdir } from "node:fs/promises";
const { chromium } = await import(pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href);
const base = process.env.DEALVUE_TEST_URL ?? "http://127.0.0.1:5180";
const browser = await chromium.launch({ headless: true }), errors = [];
await mkdir("node_modules/.tmp", { recursive: true });
async function setup(options = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ...options });
  await context.route("**/*", route => route.request().url().startsWith(base) || route.request().url().startsWith("data:") ? route.continue() : route.abort());
  await context.addInitScript(() => {
    localStorage.setItem("dealvue-consumer-preview-mode", JSON.stringify({ state: { enabled: true }, version: 0 }));
    crypto.getRandomValues = array => { array.fill(3); return array; };
  });
  const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message)); return { context, page };
}
const state = page => page.evaluate(async () => { const { useEngagementStore } = await import("/src/features/consumer/engagement/store.ts"); return JSON.parse(JSON.stringify(useEngagementStore.getState())); });
async function category(page, name) { await page.getByRole("group", { name: "꾸미기 종류", exact: true }).getByRole("button", { name, exact: true }).click(); }
try {
  const { context, page } = await setup(); await page.goto(base + "/rewards?tab=wardrobe"); await page.locator(".fashion-studio").waitFor();
  const catalog = await page.evaluate(async () => { const data = await import("/src/features/consumer/engagement/playground/data.ts"); const design = await import("/src/features/consumer/engagement/playground/accessoryCatalog.ts"); return { total: data.TOTAL_COLLECTIBLES, looks: data.LOOKS, accessories: data.ACCESSORIES, designs: design.ACCESSORY_DESIGNS, scenes: data.BACKDROPS }; });
  assert.equal(catalog.total, 200); assert.equal(catalog.looks.length, 36); assert.equal(catalog.accessories.filter(item => item.price > 0).length, 144); assert.equal(catalog.designs.length, 48); assert.equal(catalog.scenes.length, 20);
  assert.equal(new Set(catalog.accessories.map(item => item.id)).size, catalog.accessories.length);
  assert.equal(await page.evaluate(async () => { const { ATLAS_SOURCES } = await import("/src/features/consumer/engagement/playground/data.ts"); return (await Promise.all(Object.values(ATLAS_SOURCES).map(async src => { const image = new Image(); image.src = src; await image.decode(); return image.naturalWidth > 1000 && image.naturalHeight > 1000; }))).every(Boolean); }), true, "all six sprite sheets must decode");
  for (const [slot, label] of [["hair", "헤어 장식"], ["ears", "귀걸이"], ["bag", "가방"], ["necklace", "목걸이"]]) {
    assert.equal(catalog.accessories.filter(item => item.slot === slot && item.price > 0).length, 36);
    await category(page, label); assert.equal(await page.locator(".outfit-card").count(), 37);
    assert.equal(await page.locator(".outfit-card .accessory-thumbnail").evaluateAll(nodes => nodes.every(svg => svg.querySelector("path,ellipse,rect,circle"))), true);
  }
  await category(page, "헤어 장식"); await page.getByLabel("아이템 이름으로 찾기").fill("고양이"); assert.equal(await page.locator(".outfit-card").count(), 3);
  await page.getByRole("group", { name: "장신구 색상", exact: true }).getByRole("button", { name: "펄", exact: true }).click(); assert.equal(await page.locator(".outfit-card").count(), 1);
  await page.getByRole("button", { name: "고양이 헤어밴드 · 펄 · 40 포인트", exact: true }).click(); assert.equal((await state(page)).accessories.hair, "hair-none");
  await category(page, "옷"); await page.locator(".collection-filters button").filter({ hasText: "티파티" }).click(); await page.getByRole("button", { name: "로즈 티타임 · 100 포인트", exact: true }).click();
  assert.equal(await page.locator("dialog .avatar-part, dialog .avatar-joint, dialog .avatar-pose-controls, dialog .avatar-motion-controls").count(), 0);
  await page.locator("[data-avatar-turn][data-ready=true]").waitFor();
  assert.equal(await page.locator("[data-avatar-turn][data-ready]").evaluate(node => JSON.parse(node.dataset.accessories).hair), "cat-band-pearl");
  await page.waitForFunction(() => document.querySelector("[data-avatar-turn][data-ready]").dataset.turning === "false");
  await page.setViewportSize({ width: 1440, height: 900 });
  assert.equal(await page.locator(".outfit-grid").evaluate(node => node.clientHeight >= node.querySelector(".outfit-card").getBoundingClientRect().height), true, "desktop must show at least one complete row, including names and prices");
  await page.screenshot({ path: "node_modules/.tmp/avatar-200-desktop.png" }); await page.setViewportSize({ width: 390, height: 844 });
  await category(page, "배경");
  for (const scene of catalog.scenes) { await page.getByRole("button", { name: `${scene.name} · ${scene.price === 0 ? "보유" : `${scene.price} 포인트`}`, exact: true }).click(); assert.ok(await page.locator("dialog .studio-scenery path, dialog .studio-scenery circle, dialog .studio-scenery rect, dialog .studio-scenery ellipse").count() > 0, `empty ${scene.id}`); }
  await page.screenshot({ path: "node_modules/.tmp/avatar-200-mobile.png" }); await context.close(); console.log("PASS 200 items, 48 accessory designs/three colorways, search, 3D character and clothing swaps and 20 scenes");

  const daily = await setup({ reducedMotion: "reduce" });
  await daily.page.goto(base + "/fortune"); const second = await daily.context.newPage(); await second.goto(base + "/fortune"); await second.locator(".fortune-content").waitFor();
  await daily.page.getByRole("button", { name: "오늘의 운세 열어보기 · 5 P", exact: true }).click();
  await second.getByRole("button", { name: "오늘의 운세 완료 · 내일 다시 만나요", exact: true }).waitFor(); assert.equal(await second.locator(".fortune-button").isDisabled(), true); assert.equal(await second.locator(".crystal-action").isDisabled(), true);
  await daily.page.reload(); await daily.page.locator(".fortune-result").waitFor(); assert.equal(await daily.page.locator(".has-finale").count(), 0); assert.equal((await state(daily.page)).pointHistory.length, 1);
  assert.equal(await daily.page.evaluate(async () => (await import("/src/features/consumer/engagement/store.ts")).useEngagementStore.getState().claimMission("fortune")), false);
  await daily.page.goto(base + "/rewards?tab=roulette"); await second.goto(base + "/rewards?tab=roulette"); await second.locator(".roulette-content").waitFor();
  await daily.page.getByRole("button", { name: "행운 룰렛 돌리기", exact: true }).click(); await daily.page.locator(".event-result.has-reward").waitFor();
  await second.getByRole("button", { name: "오늘 참여 완료 · 내일 다시 만나요", exact: true }).waitFor(); assert.equal(await second.locator(".roulette-spin-button").isDisabled(), true); assert.equal(await second.locator(".wheel-hub").isDisabled(), true);
  await daily.page.reload(); await daily.page.locator(".event-result.has-reward").waitFor(); assert.equal(await daily.page.locator(".roulette-spin-button").isDisabled(), true);
  assert.equal(await daily.page.evaluate(async () => (await import("/src/features/consumer/engagement/store.ts")).useEngagementStore.getState().beginRoulette()), null); assert.equal((await state(daily.page)).pointHistory.length, 2); await daily.context.close();

  const rollover = await setup({ reducedMotion: "reduce" }); await rollover.page.clock.install({ time: new Date("2026-10-02T14:59:50Z") }); await rollover.page.goto(base + "/fortune");
  await rollover.page.getByRole("button", { name: "오늘의 운세 열어보기 · 5 P", exact: true }).click(); await rollover.page.locator(".has-finale").waitFor();
  await rollover.page.goto(base + "/rewards?tab=roulette"); await rollover.page.getByRole("button", { name: "행운 룰렛 돌리기", exact: true }).click(); await rollover.page.locator(".event-result.has-reward").waitFor();
  await rollover.page.clock.fastForward(12000); await rollover.page.getByRole("button", { name: "행운 룰렛 돌리기", exact: true }).waitFor(); assert.equal(await rollover.page.locator(".roulette-spin-button").isEnabled(), true);
  await rollover.page.getByRole("button", { name: "행운 룰렛 돌리기", exact: true }).click(); await rollover.page.locator(".event-result.has-reward").waitFor();
  await rollover.page.goto(base + "/fortune"); await rollover.page.getByRole("button", { name: "오늘의 운세 열어보기 · 5 P", exact: true }).click(); await rollover.page.locator(".has-finale").waitFor();
  assert.equal((await state(rollover.page)).pointHistory.length, 4); await rollover.context.close(); assert.deepEqual(errors, []);
  console.log("PASS fortune/roulette execution locks, reload during fortune, cross-tab sync and Korean midnight reset");
} finally { await browser.close(); }
