import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { chromium } = await import(process.env.DEALVUE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href : "playwright");
const base = process.env.DEALVUE_TEST_URL ?? "http://127.0.0.1:5180";
const browser = await chromium.launch({ headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errors = [], external = [];
async function setup(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 1100 }, reducedMotion: "reduce", ...options });
  await context.route("**/*", route => {
    if (route.request().url().startsWith(base) || route.request().url().startsWith("data:")) return route.continue();
    external.push(route.request().url()); return route.abort();
  });
  await context.addInitScript(() => localStorage.setItem("dealvue-consumer-preview-mode", JSON.stringify({ state: { enabled: true }, version: 0 })));
  const page = await context.newPage();
  page.on("pageerror", e => errors.push(e.message));
  return { context, page };
}
const ready = page => page.locator('canvas[data-ready="true"]').waitFor({ timeout: 60000 });
const pixels = page => page.locator("canvas").evaluate(canvas => canvas.toDataURL());
const tick = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
try {
  const { context, page } = await setup();
  const requests = [];
  page.on("request", request => requests.push(request.url()));
  await page.goto(base + "/rewards");
  await page.locator(".home-3d-link").waitFor();
  assert.ok(!requests.some(url => url.includes("avatar.glb") || url.includes("AvatarScene") || url.includes("three")), "3D dependencies must load only when the studio opens");
  const previous = await page.evaluate(() => localStorage.getItem("dealvue-consumer-engagement-preview-v1"));
  await page.locator(".home-3d-link").click();
  await ready(page); await tick(page);
  assert.equal(await page.locator("canvas").count(), 1, "StrictMode must leave one live canvas");
  const still = await pixels(page);
  await page.getByRole("button", { name: "손 흔들기", exact: true }).click(); await tick(page);
  assert.equal(await page.locator("canvas").getAttribute("data-motion"), "wave");
  assert.notEqual(await pixels(page), still, "reduced motion must show a different static pose");
  const frozen = await page.locator("canvas").getAttribute("data-time");
  await page.waitForTimeout(250);
  assert.equal(await page.locator("canvas").getAttribute("data-time"), frozen);
  await page.getByRole("button", { name: "로즈 밀크", exact: true }).click(); await tick(page);
  const rose = await pixels(page);
  await page.getByRole("button", { name: "소프트 블루", exact: true }).click(); await tick(page);
  assert.notEqual(await pixels(page), rose, "palette must change the actual 3D material");
  await page.getByRole("button", { name: "옆모습", exact: true }).click(); await tick(page);
  assert.ok(Math.abs(Number(await page.locator("canvas").getAttribute("data-angle")) + Math.PI/2) < .002);
  await page.getByRole("button", { name: "뒷모습", exact: true }).click(); await tick(page);
  assert.ok(Math.abs(Number(await page.locator("canvas").getAttribute("data-angle")) - Math.PI) < .002);
  await page.getByRole("button", { name: "정면", exact: true }).click(); await tick(page);
  for (const width of [320,390,768,1440]) {
    await page.setViewportSize({ width, height: 1000 }); await tick(page);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}px must not overflow`);
    assert.equal(await page.getByRole("button", { name: "손 흔들기", exact: true }).count(), 1, "only one visible motion bar per viewport");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "찰칵 포즈", exact: true }).focus(); await page.keyboard.press("Enter");
  await tick(page);
  assert.equal(await page.locator("canvas").getAttribute("data-motion"), "pose");
  assert.equal(await page.evaluate(() => localStorage.getItem("dealvue-consumer-engagement-preview-v1")), previous, "sample must never change points, purchases, or saved appearance");
  await page.getByRole("link", { name: "놀이터로 돌아가기", exact: true }).click();
  await page.locator(".play-home-hero").waitFor();
  assert.equal(await page.locator("canvas").count(), 0, "leaving the route must remove the renderer");
  await context.close();
  console.log("PASS: lazy loading, native material changes, static poses, all views, mobile, keyboard, unchanged points, disposal");

  const running = await setup({ reducedMotion: "no-preference" });
  await running.page.goto(base + "/avatar-3d"); await ready(running.page);
  await running.page.waitForFunction(() => Number(document.querySelector("canvas").dataset.time) > .15);
  await running.page.getByRole("button", { name: "손 흔들기", exact: true }).click();
  await running.page.waitForFunction(() => document.querySelector("canvas").dataset.motion === "wave");
  await running.page.getByRole("button", { name: "움직임 일시정지", exact: true }).click(); await tick(running.page);
  const pausedTime = await running.page.locator("canvas").getAttribute("data-time");
  await running.page.waitForTimeout(300);
  assert.equal(await running.page.locator("canvas").getAttribute("data-time"), pausedTime, "pause must stop animation time");
  await running.page.getByRole("button", { name: "움직임 재생", exact: true }).click();
  await running.page.waitForFunction(time => Number(document.querySelector("canvas").dataset.time) > Number(time)+.1, pausedTime);
  await running.page.waitForFunction(() => document.querySelector("canvas").dataset.motion === "idle", null, { timeout: 30000 });
  await running.page.evaluate(() => {
    const spacer=document.createElement("div"); spacer.id="offscreen-test-spacer"; spacer.style.height="4000px"; document.body.append(spacer); window.scrollTo(0,3000);
  });
  await running.page.waitForTimeout(250);
  const offscreen = await running.page.locator("canvas").getAttribute("data-time");
  await running.page.waitForTimeout(300);
  assert.equal(await running.page.locator("canvas").getAttribute("data-time"), offscreen, "offscreen scene must stop rendering");
  await running.page.evaluate(() => { window.scrollTo(0,0); document.getElementById("offscreen-test-spacer").remove(); });
  await running.page.waitForFunction(time => Number(document.querySelector("canvas").dataset.time)>Number(time)+.1, offscreen);
  await running.page.evaluate(() => document.querySelector("canvas").getContext("webgl2").getExtension("WEBGL_lose_context").loseContext());
  await running.page.getByRole("alert").waitFor();
  await running.page.getByRole("button", { name: "다시 불러오기", exact: true }).click(); await ready(running.page);
  assert.equal(await running.page.locator("canvas").count(), 1);
  await running.context.close();
  console.log("PASS: live bone animation, pause/resume, automatic idle return, offscreen suspension, WebGL context loss recovery");

  const broken = await setup();
  const modelRoute = "**/models/avatar-prototype/avatar.glb";
  await broken.page.route(modelRoute, route => route.fulfill({ status:404, body:"missing" }));
  await broken.page.goto(base + "/avatar-3d"); await broken.page.getByRole("alert").waitFor();
  await broken.page.unroute(modelRoute);
  await broken.page.getByRole("button", { name: "다시 불러오기", exact: true }).click(); await ready(broken.page);
  assert.equal(await broken.page.locator("canvas").count(), 1);
  await broken.context.close();
  console.log("PASS: model download failure and retry");
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
} finally { await browser.close(); }
