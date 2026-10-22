import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { installAuthFixture, chooseBookingSlot } from "./booking-test-helpers.mjs";

const { chromium } = await import(process.env.DEALVUE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href : "playwright");
const base = process.env.DEALVUE_TEST_URL ?? "http://127.0.0.1:5185";
const browser = await chromium.launch({ headless: true });
const errors = [], writes = [];
const output = "node_modules/.tmp/deal-kits";
await mkdir(output, { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route("**/*", route => {
    const request = route.request();
    if (request.url().startsWith(base) || request.url().startsWith("data:")) return route.continue();
    if (new URL(request.url()).pathname.startsWith("/rest/v1/") && request.method() === "GET") return route.continue();
    if (!["GET", "HEAD"].includes(request.method())) writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
    return route.abort();
  });
  await installAuthFixture(context, { userId: null, firstProfileDelayMs: 300 });
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  await page.clock.install({ time: new Date("2026-10-15T00:10:00+09:00") });
  const go = async path => { await page.goto(base + path); await page.locator("main").waitFor(); };
  await go("/package");
  await page.locator('a[href="/package/detail/101"]').waitFor();
  const { kits, templates } = await page.evaluate(async () => {
    const module = await import("/src/features/consumer/dealKits.ts");
    return { kits: await module.readDealKits(), templates: module.DEAL_KIT_TEMPLATES };
  });
  assert.equal(kits.length, 14);
  assert.equal(await page.locator('a[href^="/package/detail/"]').count(), kits.length);
  await page.getByRole("navigation", { name: "딜키트 상품종류" }).getByRole("link", { name: "웨딩 헤메드 패키지", exact: true }).click();
  assert.equal(await page.locator('a[href^="/package/detail/"]').count(), 2);
  await page.getByRole("group", { name: "상품 정렬", exact: true }).getByText("낮은 가격순", { exact: true }).click();
  const wedding = kits.filter(kit => kit.template_id === 1).sort((a, b) => a.price - b.price || a.id - b.id);
  assert.equal(await page.locator('a[href^="/package/detail/"]').first().getAttribute("href"), `/package/detail/${wedding[0].id}`);
  await page.locator('a[href^="/package/detail/"]').first().click();
  await page.getByRole("heading", { name: "이 상품의 서비스 구성", exact: true }).waitFor();
  await page.getByRole("heading", { name: "방문 일정", exact: true }).waitFor();
  await page.getByRole("link", { name: `${wedding[0].business.name} ›`, exact: true }).waitFor();
  for (const item of wedding[0].items) await page.getByText(item, { exact: true }).waitFor();
  await page.getByText("시간제한 없는 패키지 할인", { exact: true }).waitFor();
  await page.getByRole("button", { name: "일정 선택 · 예약하기", exact: true }).click();
  const login = page.getByRole("dialog", { name: "로그인이 필요합니다", exact: true });
  await login.getByRole("button", { name: "취소", exact: true }).click();
  assert.ok(page.url().endsWith(`/package/detail/${wedding[0].id}`));
  await page.getByRole("button", { name: "일정 선택 · 예약하기", exact: true }).click();
  await login.getByRole("button", { name: "로그인하기", exact: true }).click();
  await page.waitForURL("**/auth/login");
  await page.locator('input[type="email"]').fill("booking-test@example.invalid");
  await page.locator('input[type="password"]').fill("test-password");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await page.waitForURL(`**/checkout/kit/${wedding[0].id}`);
  await chooseBookingSlot(page);
  await page.waitForLoadState("networkidle");
  assert.ok(page.url().endsWith(`/checkout/kit/${wedding[0].id}`), "session bridge and form completion must not redirect back home");
  assert.equal(await page.evaluate(() => sessionStorage.getItem("dealvue-login-return")), null, "return path consumed after mocked email login");
  await page.getByText("방문 시 결제할 금액", { exact: true }).waitFor();
  assert.equal(await page.getByRole("heading", { name: /쿠폰|포인트|결제수단/ }).count(), 0);
  await page.screenshot({ path: `${output}/booking.png`, fullPage: true });
  for (const [path, type] of [["one-shop", "oneShop"], ["shop-shop", "shopShop"]]) {
    await go(`/package/${path}`);
    await page.locator('a[href^="/package/detail/"]').first().waitFor();
    assert.equal(await page.locator('a[href^="/package/detail/"]').count(), kits.filter(kit => kit.type === type).length);
  }
  await go("/package/special?category=999999");
  await page.getByText("판매 중인 딜키트가 없습니다", { exact: true }).waitFor();
  await go("/package/detail/999999");
  await page.getByText("판매 중인 딜키트를 찾을 수 없습니다", { exact: true }).waitFor();
  for (const businessId of [...new Set(kits.map(kit => kit.business_id))]) {
    await go(`/business/${businessId}`);
    const region = page.getByRole("region", { name: "딜키트", exact: true });
    await region.locator('a[href^="/package/detail/"]').first().waitFor();
    const shown = await region.locator('a[href^="/package/detail/"]').evaluateAll(nodes => nodes.map(node => Number(node.getAttribute("href").split("/").at(-1))));
    assert.deepEqual(shown.sort((a, b) => a - b), kits.filter(kit => kit.business_id === businessId).map(kit => kit.id).sort((a, b) => a - b));
  }
  await go("/");
  const recommendation = page.locator("section").filter({ has: page.getByRole("heading", { name: "딜키트 추천", exact: true }) });
  await recommendation.locator('a[href^="/package/template/"]').first().waitFor();
  assert.equal(await recommendation.locator('a[href^="/package/template/"]').count(), 3);
  for (const template of templates) {
    const lowest = Math.min(...kits.filter(kit => kit.template_id === template.id).map(kit => kit.price));
    await recommendation.locator(`a[href="/package/template/${template.id}"]`).getByText(`${lowest.toLocaleString()}원~`, { exact: true }).waitFor();
  }
  await recommendation.scrollIntoViewIfNeeded();
  await recommendation.screenshot({ path: `${output}/recommendations.png` });

  // Keep API-adapter/admin coverage isolated: every write below is intercepted locally.
  const extra = { ...kits[0], id: 90001, title: "테스트 등록 패키지", price: 1000 };
  let active = true;
  await context.route("**/rest/v1/deal_kits*", route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === "POST") {
      const input = request.postDataJSON();
      assert.equal(input.business_id, extra.business_id);
      extra.price = input.price;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: extra.id }) });
    }
    const businessMatches = !url.searchParams.has("business_id") || url.searchParams.get("business_id") === `eq.${extra.business_id}`;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(active && businessMatches ? [extra] : []) });
  });
  await go("/package");
  await page.locator(`a[href="/package/detail/${extra.id}"]`).waitFor();
  active = false;
  await page.reload();
  await page.locator('a[href="/package/detail/101"]').waitFor();
  assert.equal(await page.locator(`a[href="/package/detail/${extra.id}"]`).count(), 0, "inactive API offer excluded");
  // Call the real adapter against the local intercepted endpoint.
  await page.evaluate(async ({ businessId, templateId }) => {
    const { saveDealKit } = await import("/src/features/consumer/dealKits.ts");
    await saveDealKit(businessId, { title: "테스트 등록 패키지", description: "로컬 API 검증", type: "special", purpose: "wedding", items: ["시술 A", "시술 B"], original_price: 100000, price: 50000, active: true, template_id: templateId });
  }, { businessId: extra.business_id, templateId: extra.template_id });
  assert.equal(extra.price, 50000);
  active = true;
  await page.reload();
  await page.locator(`a[href="/package/detail/${extra.id}"]`).getByText("50,000원", { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, []);
  console.log("PASS: 14 current packages, category/price filters, service legs, guest dialog/cancel, mocked email login return, no payment controls, business scope, grouped minimum prices, inactive API offers and mocked adapter save");
  await context.close();

  const signupContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await installAuthFixture(signupContext, { userId: null, mockSignup: true, firstProfileDelayMs: 300 });
  const signup = await signupContext.newPage();
  signup.on("pageerror", error => errors.push(error.message));
  await signup.goto(`${base}/checkout/kit/121`);
  await signup.waitForURL("**/auth/login");
  await signup.getByRole("link", { name: "회원가입", exact: true }).click();
  await signup.getByRole("button", { name: "이메일 회원가입", exact: true }).click();
  await signup.getByLabel("이메일", { exact: true }).fill("booking-test@example.invalid");
  await signup.getByLabel("비밀번호", { exact: true }).fill("test-password");
  await signup.getByLabel("닉네임", { exact: true }).fill("예약 테스트");
  await signup.getByRole("button", { name: "가입하기", exact: true }).click();
  await signup.waitForURL("**/checkout/kit/121");
  await chooseBookingSlot(signup);
  await signup.waitForLoadState("networkidle");
  assert.ok(signup.url().endsWith("/checkout/kit/121"), "mocked signup keeps the booking return destination");
  assert.equal(await signup.evaluate(() => sessionStorage.getItem("dealvue-login-return")), null);
  await signupContext.close();
  assert.deepEqual(errors, []);
  console.log("PASS: mocked signup returns to the pending booking without competing redirects");
} finally { await browser.close(); }
