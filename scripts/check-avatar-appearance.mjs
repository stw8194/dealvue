import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const { chromium } = await import(process.env.DEALVUE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href : "playwright");
const base = process.env.DEALVUE_TEST_URL ?? "http://127.0.0.1:5180";
const browser = await chromium.launch({ headless: true }), errors = [], external = [];
await mkdir("node_modules/.tmp", { recursive: true });
async function setup(options = {}, fixture = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ...options });
  await context.route("**/*", route => {
    if (route.request().url().startsWith(base) || route.request().url().startsWith("data:")) return route.continue();
    external.push(route.request().url()); return route.abort();
  });
  await context.addInitScript(fixture => {
    localStorage.setItem("dealvue-consumer-preview-mode", JSON.stringify({ state: { enabled: true }, version: 0 }));
    if (!localStorage.getItem("appearance-test-started")) {
      localStorage.setItem("dealvue-consumer-engagement-preview-v1", JSON.stringify({ version: 1, state: { ownedOutfits: ["basic", "pink"], ...fixture } }));
      localStorage.setItem("appearance-test-started", "yes");
    }
  }, fixture);
  const page = await context.newPage(); page.on("pageerror", error => errors.push(error.message));
  await page.goto(base + "/rewards?tab=wardrobe"); await page.locator(".fashion-studio").waitFor(); await page.locator("[data-avatar-turn][data-ready=true]").waitFor();
  return { context, page };
}
const state = page => page.evaluate(async () => {
  const { useEngagementStore } = await import("/src/features/consumer/engagement/store.ts");
  return JSON.parse(JSON.stringify(useEngagementStore.getState()));
});
const category = (page, name) => page.getByRole("group", { name: "꾸미기 종류", exact: true }).getByRole("button", { name, exact: true }).click();
const customized = { hairRibbon: "none", hairstyle: "twintails", hairColor: "rose", eyes: "gentle", eyeColor: "violet", mouth: "kitty", tone: "cream" };
async function customize(page) {
  await category(page, "얼굴·헤어");
  for (const name of ["포근 트윈테일", "로즈 핑크 머리색", "순둥순둥 눈 모양", "포도빛 눈동자", "고양이 미소", "크림 얼굴 톤"]) await page.getByRole("button", { name, exact: true }).click();
}
try {
  const { context, page } = await setup(); const initial = await state(page);
  await customize(page);
  assert.deepEqual((await state(page)).appearance, initial.appearance, "preview must not save before Apply");
  await page.getByRole("button", { name: "놀이터 팝업 닫기", exact: true }).click();
  assert.equal(await page.locator(".home-fashion-preview .hair-bob").count(), 1, "closing discards uncommitted preview");
  await page.goto(base + "/rewards?tab=wardrobe"); await customize(page);
  await page.getByRole("button", { name: "내 모습 적용하기", exact: true }).click();
  assert.deepEqual((await state(page)).appearance, customized);
  assert.deepEqual((await state(page)).pointHistory, initial.pointHistory, "customization is free, even with no points");
  const other = await context.newPage(); await other.goto(base + "/rewards");
  await other.locator(".home-fashion-preview .hair-twintails").waitFor();
  assert.equal(await other.locator(".home-fashion-preview .hair-twintails").count(), 1); await other.close();
  await category(page, "옷");
  const pink = await page.evaluate(async () => (await import("/src/features/consumer/engagement/playground/data.ts")).LOOKS.find(item => item.id === "pink").name);
  await page.getByRole("button", { name: `${pink} · 보유`, exact: true }).click();
  await page.getByRole("button", { name: "이 룩으로 갈아입기", exact: true }).click();
  assert.deepEqual((await state(page)).appearance, customized, "changing clothing keeps face and hair");
  await category(page, "코디북"); await page.getByLabel("코디 이름", { exact: true }).fill("핑크 트윈테일");
  await page.getByRole("button", { name: "현재 코디 저장", exact: true }).click();
  await page.getByText("이 조합을 코디북에 저장했어요.", { exact: true }).waitFor();
  assert.deepEqual((await state(page)).savedLooks[0].appearance, customized);
  await category(page, "얼굴·헤어"); await page.getByRole("button", { name: "기본 얼굴·헤어로 되돌리기", exact: true }).click();
  assert.deepEqual((await state(page)).appearance, customized, "reset is also a preview");
  await page.getByRole("button", { name: "내 모습 적용하기", exact: true }).click();
  await category(page, "코디북"); await page.getByRole("button", { name: "핑크 트윈테일 코디 입기", exact: true }).click();
  assert.deepEqual((await state(page)).appearance, customized);
  await page.reload(); await page.locator(".fashion-studio").waitFor();
  assert.deepEqual((await state(page)).appearance, customized); assert.deepEqual((await state(page)).pointHistory, initial.pointHistory);
  await category(page, "얼굴·헤어");
  const catalog = await page.evaluate(async () => {
    const a = await import("/src/features/consumer/engagement/playground/appearance.ts");
    return { hairs: a.HAIRSTYLES, choices: a.HAIR_CHOICES, colors: a.HAIR_COLORS };
  });
  assert.equal(await page.getByRole("group", { name: "헤어스타일", exact: true }).getByRole("button").count(), 11, "all six plain and five ribbon styles must be visible as individual choices");
  for (const choice of catalog.choices) {
    await page.getByRole("button", { name: choice.name, exact: true }).click();
    await page.waitForFunction(choice => { const a = JSON.parse(document.querySelector("[data-avatar-turn][data-ready]").dataset.appearance); return a.hairstyle === choice.hairstyle && a.hairRibbon === choice.hairRibbon; }, choice);
    assert.equal(await page.getByRole("group", { name: "헤어스타일", exact: true }).locator('[aria-pressed="true"]').count(), 1, "exactly one variant must be selected");
  }
  for (const hair of catalog.hairs) {
    await page.getByRole("button", { name: hair.name, exact: true }).click();
    await page.waitForFunction(id => JSON.parse(document.querySelector("[data-avatar-turn][data-ready]").dataset.appearance).hairstyle === id, hair.id);
    assert.equal(await page.locator("[data-avatar-turn][data-ready]").evaluate(node => JSON.parse(node.dataset.appearance).hairstyle), hair.id);
  }
  for (const color of catalog.colors) {
    await page.getByRole("button", { name: `${color.name} 머리색`, exact: true }).click();
    assert.equal(await page.getByRole("button", { name: `${color.name} 머리색`, exact: true }).getAttribute("aria-pressed"), "true");
  }
  assert.equal(await page.evaluate(() => { const ids = [...document.querySelectorAll("[id]")].map(node => node.id); return ids.length === new Set(ids).size; }), true, "SVG gradients must have unique identifiers across every avatar");
  const assets = await page.evaluate(async () => Promise.all(["avatar-face-base", "avatar-hair-atlas"].map(async name => {
    const image = new Image(); image.src = `/images/playground/${name}.png`; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext("2d"); ctx.drawImage(image, 0, 0);
    return { width: image.width, alpha: ctx.getImageData(10, 10, 1, 1).data[3] };
  })));
  assert.ok(assets.every(asset => asset.width > 1000 && asset.alpha === 0));
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.getByRole("dialog", { name: "드레스룸", exact: true }).evaluate(node => node.scrollWidth > node.clientWidth + 1), false, `editor overflow at ${width}px`);
    const apply = await page.locator(".appearance-apply").boundingBox(); assert.ok(apply.y > 0 && apply.y + apply.height <= 900);
    await page.getByRole("button", { name: "크림 얼굴 톤", exact: true }).click();
    await page.screenshot({ path: `node_modules/.tmp/appearance-${width}.png` });
  }
  await page.getByRole("button", { name: "기본 얼굴·헤어로 되돌리기", exact: true }).click();
  assert.equal(await page.locator("dialog .avatar-motion-controls, dialog .avatar-pose-controls").count(), 0);
  await category(page, "옷");
  const unchanged = await state(page);
  await page.getByRole("button", { name: "선데이 니트 · 보유", exact: true }).click();
  await page.waitForFunction(() => { const c = document.querySelector("[data-avatar-turn][data-ready]"); return c.dataset.outfit === "basic" && c.dataset.turning === "false"; });
  assert.deepEqual((await state(page)).pointHistory, unchanged.pointHistory, "preview costs no points");
  await page.getByRole("button", { name: "선데이 니트 · 보유", exact: true }).click();
  assert.equal(await page.locator("[data-avatar-turn][data-ready]").getAttribute("data-turning"), "false", "same outfit should stay still");
  await context.close(); console.log("PASS appearance preview/apply, persistence, customization, responsive editor and 3D clothing swap");

  const reduced = await setup({ reducedMotion: "reduce" });
  await reduced.page.getByRole("button", { name: "로즈 발레 · 보유", exact: true }).click();
  assert.equal(await reduced.page.locator("dialog .avatar-dress-up.is-changing, dialog .outfit-change-effects").count(), 0);
  await reduced.page.locator("[data-avatar-turn][data-outfit=pink]").waitFor(); assert.equal(await reduced.page.locator("[data-avatar-turn][data-ready]").getAttribute("data-turning"), "false");
  await reduced.context.close();
  const legacy = await setup({}, { appearance: { hairstyle: "removed-hair", hairColor: "mint", eyes: "unknown" }, savedLooks: [{ id: "old-look", name: "기존 코디", outfit: "basic", accessories: { hair: "hair-none", ears: "ears-none", bag: "bag-none", necklace: "necklace-none" }, backdrop: "lavender", createdAt: "2026-10-01" }] });
  assert.equal((await state(legacy.page)).appearance.hairRibbon, "ribbon", "legacy appearances preserve ribbon variants"); assert.equal((await state(legacy.page)).appearance.hairstyle, "bob"); assert.equal((await state(legacy.page)).appearance.hairColor, "mint");
  await category(legacy.page, "코디북"); await legacy.page.getByRole("button", { name: "기존 코디 코디 입기", exact: true }).click();
  assert.equal((await state(legacy.page)).appearance.hairColor, "mint", "legacy outfits without appearance preserve the current face");
  await legacy.context.close(); assert.deepEqual(errors, []); assert.deepEqual(external, []);
  console.log("PASS reduced motion and backward-compatible appearance hydration");

  const portrait = await setup({}, { outfit: "cafe", ownedOutfits: ["basic", "cafe"] });
  const restoredHead = portrait.page.locator("[data-avatar-turn][data-ready=true]");
  assert.equal(await restoredHead.count(), 1, "original artwork must be ready for a volumetric turn");
  await portrait.page.addStyleTag({ content: "dialog .avatar-illustration * { animation: none !important; }" });
  for (const width of [320, 390, 1440]) {
    await portrait.page.setViewportSize({ width, height: 900 });
    await portrait.page.locator("dialog .avatar-stage").screenshot({ path: `node_modules/.tmp/portrait-cafe-${width}.png` });
  }
  const clothingCatalog = await portrait.page.evaluate(async () => (await import("/src/features/consumer/engagement/playground/data.ts")).LOOKS);
  // All clothing shares a canonical head, so adjacent atlas cells cannot leak into the face.
  await portrait.page.evaluate(async ids => { const { useEngagementStore } = await import("/src/features/consumer/engagement/store.ts"); useEngagementStore.setState({ ownedOutfits: ids }); }, clothingCatalog.map(look => look.id));
  await category(portrait.page, "옷"); await portrait.page.locator(".collection-filters button").filter({ hasText: "전체" }).click();
  for (const look of clothingCatalog) {
    await portrait.page.getByRole("button", { name: `${look.name} · 보유`, exact: true }).click();
    assert.equal(await restoredHead.count(), 1, `preserve the doll's face with ${look.id}`);
  }
  await portrait.page.waitForFunction(id => { const c = document.querySelector("[data-avatar-turn][data-ready]"); return c.dataset.outfit === id && c.dataset.turning === "false"; }, clothingCatalog.at(-1).id);
  assert.equal(await portrait.page.locator("dialog [data-avatar-turn]").getAttribute("aria-label"), `나의 아바타 · ${clothingCatalog.at(-1).name}`);
  const modelRequests = [];
  portrait.page.on("request", request => { if (request.url().includes(".glb")) modelRequests.push(request.url()); });
  await portrait.page.goto(base + "/avatar-3d");
  await portrait.page.locator(".fashion-studio").waitFor();
  assert.equal(new URL(portrait.page.url()).pathname, "/rewards");
  await portrait.page.locator("[data-avatar-turn][data-ready=true]").waitFor();
  assert.equal(await portrait.page.locator(".home-3d-link").count(), 0);
  assert.deepEqual(modelRequests, [], "the replacement doll must never override the original character design");
  await portrait.context.close(); assert.deepEqual(errors, []); assert.deepEqual(external, []);
  console.log("PASS consistent 3D character with all 36 outfits and the reported cafe outfit at 320–1440px");
} finally { await browser.close(); }
