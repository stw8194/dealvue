import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.DEALVUE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href : 'playwright');
const base = process.env.DEALVUE_TEST_URL ?? 'http://127.0.0.1:5174';
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await context.addInitScript(() => {
    localStorage.setItem('dealvue-current-location', JSON.stringify({ latitude: 37.5, longitude: 127, label: '테스트 위치', expiresAt: Date.now() + 3600000 }));
    class LatLng { constructor(lat, lng) { this.lat = lat; this.lng = lng; } getLat() { return this.lat; } getLng() { return this.lng; } }
    class MapMock {
      constructor(_container, options) { this.center = options.center; this.level = options.level; this.events = {}; }
      getCenter() { return this.center; } getLevel() { return this.level; }
      getBounds() { return { getSouthWest: () => new LatLng(37, 126), getNorthEast: () => new LatLng(38, 128) }; }
      setLevel(level) { this.level = level; this.events.idle?.(); }
      setCenter(center) { this.center = center; this.events.idle?.(); }
      panTo(center) { this.setCenter(center); } relayout() {}
    }
    class Overlay { setMap() {} setPosition() {} setRadius() {} }
    window.kakao = { maps: { load: (fn) => fn(), LatLng, Map: MapMock, CustomOverlay: Overlay, Circle: Overlay,
      event: { addListener: (target, name, fn) => { target.events[name] = fn; }, removeListener: (target, name) => { delete target.events[name]; } } } };
  });
  let fail = false;
  const rows = Array.from({ length: 12 }, (_, index) => ({
    id: index + 1, name: `테스트 매장 ${index + 1}`, address: '서울 강남구', latitude: 37.5, longitude: 127,
    business_category: [{ category: index % 2 ? 'nail' : 'hair' }], business_images: [{ img_url: base + '/images/deal-kits/profile.png' }],
    time_deals: index < 4 ? [{ remaining_capacity: 2, end_at: '2099-01-01' }] : index === 4 ? [{ remaining_capacity: 2, end_at: '2000-01-01' }] : index === 5 ? [{ remaining_capacity: 0, end_at: '2099-01-01' }] : [],
  }));
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.href.startsWith(base)) return route.continue();
    if (url.pathname.endsWith('/provided_deal_templates') || url.pathname.endsWith('/time_deals')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    if (url.pathname.endsWith('/businesses')) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      return route.fulfill({ status: fail ? 500 : 200, contentType: 'application/json', body: JSON.stringify(fail ? { message: 'test failure' } : url.searchParams.has('or') ? [] : rows) });
    }
    return route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base + '/nearby');
  const deals = page.getByRole('list', { name: '타임딜 매장', exact: true });
  const regular = page.getByRole('list', { name: '일반 매장', exact: true });
  const search = page.getByRole('button', { name: '이 위치에서 다시 검색', exact: true });
  await deals.waitFor();
  assert.equal(await deals.getByRole('link').count(), 4);
  assert.equal(await regular.getByRole('link').count(), 8);
  assert.equal(await search.count(), 0);
  assert.equal(await deals.locator('[data-business-id="5"]').count(), 0);
  const vertical = page.getByLabel('주변 매장 스크롤 목록', { exact: true });
  const before = await vertical.evaluate((element) => element.scrollTop);
  await deals.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
  assert.ok(await deals.evaluate((element) => element.scrollLeft > 0));
  assert.equal(await vertical.evaluate((element) => element.scrollTop), before);
  await page.getByRole('button', { name: '지도 축소', exact: true }).click();
  await search.waitFor();
  await search.click();
  await search.waitFor({ state: 'detached' });
  await deals.waitFor();
  assert.equal(await search.count(), 0);
  await page.getByRole('button', { name: '매장 목록으로 스크롤', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[aria-label="주변 매장 스크롤 목록"]').scrollTop > 100);
  await page.screenshot({ path: 'node_modules/.tmp/nearby-split-lists.png' });
  await page.getByRole('navigation', { name: '내 주변 카테고리' }).getByRole('button', { name: '헤어', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[aria-label="타임딜 매장"]').children.length === 2);
  assert.equal(await regular.getByRole('link').count(), 4);
  await vertical.evaluate((element) => { element.scrollTop = 0; });
  fail = true;
  await page.getByRole('button', { name: '지도 축소', exact: true }).click();
  await search.click();
  await page.getByRole('alert').filter({ hasText: '매장을 불러오지 못했어요.' }).waitFor();
  await search.waitFor();
  assert.deepEqual(errors, []);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  console.log('PASS: hidden inactive/searching button, map movement and retry, separate active-deal row, independent horizontal/vertical scroll, expired/sold-out classification, category filter');
} finally { await browser.close(); }
