import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { chromium } = await import(process.env.DEALVUE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href : "playwright");
const base = process.env.DEALVUE_TEST_URL ?? "http://127.0.0.1:5180";
const browser = await chromium.launch({ headless: true }), errors = [];
await mkdir("node_modules/.tmp", { recursive: true });
async function setup(reducedMotion = "no-preference") {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion });
  await context.route("**/*", route => route.request().url().startsWith(base) || route.request().url().startsWith("data:") ? route.continue() : route.abort());
  await context.addInitScript(() => localStorage.setItem("dealvue-consumer-preview-mode", JSON.stringify({ state: { enabled: true }, version: 0 })));
  const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error" && /THREE|shader/i.test(message.text())) errors.push(message.text()); });
  await page.goto(base + "/rewards?tab=wardrobe"); await page.locator("[data-avatar-turn][data-ready=true]").waitFor();
  return { context, page };
}
const state = page => page.evaluate(async () => {
  const { useEngagementStore } = await import("/src/features/consumer/engagement/store.ts");
  const value = useEngagementStore.getState(); return { outfit: value.outfit, appearance: value.appearance, points: value.pointHistory };
});
try {
  const { context, page } = await setup(); const before = await state(page);
  // With drawn turn views the turn flips between real drawings; otherwise the synthesized volume needs real depth.
  if (await page.locator("[data-avatar-turn][data-ready]").getAttribute("data-turn-views") !== "true") assert.ok(Number(await page.locator("[data-avatar-turn][data-ready]").getAttribute("data-model-depth")) > .9, "head has actual side and rear volume");
  assert.equal(await page.locator("dialog .avatar-joint, dialog .avatar-motion-controls").count(), 0);
  assert.equal(await page.locator(".wardrobe-design-portrait .avatar-dressing-turn").evaluate(node => getComputedStyle(node).transform), "none");
  await page.locator(".wardrobe-design-portrait").screenshot({ path: "node_modules/.tmp/wardrobe-original-basic.png" });
  // Record the live turn at exact angles; screenshot UI waits must not advance past the turn.
  const samples = await page.evaluate(async () => {
    const button = [...document.querySelectorAll("button")].find(node => node.getAttribute("aria-label") === "로즈 발레 · 30 포인트"); button.click();
    const avatar = document.querySelector("[data-avatar-turn][data-ready]");
    return new Promise((resolve, reject) => {
      const samples = [], angles = [Math.PI / 6, Math.PI / 3, Math.PI / 2, Math.PI * 2 / 3, Math.PI, Math.PI * 1.5, Math.PI * 5 / 3], timeout = setTimeout(() => reject(Error(`turn did not complete: ${JSON.stringify({ dataset: avatar.dataset, angles: samples.map(sample => sample.angle) })}`)), 10000);
      const sample = () => ({ angle: Number(avatar.dataset.angle), face: avatar.dataset.face, outfit: avatar.dataset.outfit, image: avatar.querySelector("canvas")?.toDataURL() });
      const read = () => {
        if (samples.length < angles.length && Number(avatar.dataset.angle) >= angles[samples.length]) samples.push(sample());
        if (samples.length === angles.length && avatar.dataset.turning === "false") { clearTimeout(timeout); samples.push(sample()); resolve(samples); }
        else requestAnimationFrame(read);
      }; requestAnimationFrame(read);
    });
  });
  assert.equal(samples.length, 8); assert.equal(samples[2].outfit, "basic"); assert.equal(samples[4].outfit, "pink"); assert.equal(samples[7].angle, 0);
  if (await page.locator("[data-avatar-turn]").getAttribute("data-avatar-turn") === "drawn") {
    // Drawn views: the right profile, then the new outfit's back, then the mirrored (left) profile.
    assert.match(samples[2].face, /^from-(side|front-quarter|back-quarter)$/, JSON.stringify(samples.map(sample => sample.face)));
    assert.match(samples[4].face, /^(from|to)-back/); assert.match(samples[5].face, /^to-.*-mirrored$/);
    await page.locator("dialog .avatar-stage").screenshot({ path: "node_modules/.tmp/wardrobe-drawn-front.png" });
  } else {
    assert.equal(new Set(samples.map(sample => sample.image)).size, 8, "intermediate angles, front, side and back render different geometry");
    for (let i = 0; i < samples.length; i++) await writeFile(`node_modules/.tmp/wardrobe-volume-${["30", "60", "side", "120", "rear", "other-side", "300", "front"][i]}.png`, Buffer.from(samples[i].image.split(",")[1], "base64"));
  }
  assert.deepEqual(await state(page), before, "trying on a 3D garment is free and does not save it");
  await page.locator(".wardrobe-design-portrait").screenshot({ path: "node_modules/.tmp/wardrobe-original-pink.png" });
  const frame = await page.locator("[data-avatar-turn][data-ready]").getAttribute("data-frame"); await page.waitForTimeout(300);
  assert.equal(await page.locator("[data-avatar-turn][data-ready]").getAttribute("data-frame"), frame, "static models do not keep rendering");
  await page.getByRole("button", { name: "선데이 니트 · 보유", exact: true }).click();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "민트 피크닉 · 30 포인트", exact: true }).click();
  await page.waitForFunction(() => { const c = document.querySelector("[data-avatar-turn][data-ready]"); return c.dataset.outfit === "mint" && c.dataset.turning === "false"; });
  assert.deepEqual(await state(page), before);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(120);
    assert.equal(await page.locator("dialog").evaluate(node => node.scrollWidth > node.clientWidth + 1), false);
    const rect = await page.locator("[data-avatar-turn][data-ready]").boundingBox(); assert.ok(rect.width > 100 && rect.height > 180);
    await page.screenshot({ path: `node_modules/.tmp/wardrobe-volume-${width}.png` });
  }
  await page.getByRole("button", { name: "놀이터 팝업 닫기", exact: true }).click(); await page.locator("[data-avatar-turn][data-ready]").waitFor({ state: "detached" });
  await context.close();

  const reduced = await setup("reduce");
  const catalog = await reduced.page.evaluate(async () => (await import("/src/features/consumer/engagement/playground/data.ts")).LOOKS);
  await reduced.page.locator(".collection-filters button").filter({ hasText: "전체" }).click();
  for (const look of catalog) {
    await reduced.page.locator(".outfit-card").filter({ hasText: look.name }).click();
    await reduced.page.locator(`[data-avatar-turn][data-outfit="${look.id}"]`).waitFor();
    assert.equal(await reduced.page.locator("[data-avatar-turn][data-ready]").getAttribute("data-turning"), "false");
  }
  await reduced.context.close();
  assert.deepEqual(errors, []);
  console.log("PASS live drawn/volumetric side/back turns, rear garment swap, free preview, rapid changes, idle rendering, disposal, all 36 reduced-motion outfits, 320–1440px");
} finally { await browser.close(); }
