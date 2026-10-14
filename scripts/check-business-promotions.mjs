import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.DEALVUE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href : 'playwright');
const base = process.env.DEALVUE_TEST_URL ?? 'http://127.0.0.1:5174';
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const start = Date.now();
  await page.clock.install({ time: start });
  const business = { id: 20, name: '테스트 헤어', address: '서울 강남구', number: '', description: '매장 소개', business_category: [{ category: 'hair' }], services: [{ id: 30, name: '커트 + 클리닉', price: 60000, duration_minutes: 60, description: '' }], staff: [], business_images: [{ img_url: base + '/images/deal-kits/profile.png' }] };
  const deal = { id: 10, business_id: 20, service_id: 30, original_price: 60000, deal_price: 39000, remaining_capacity: 2, end_at: new Date(start + 120000).toISOString() };
  let offers = [];
  let kitError = false;
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.href.startsWith(base)) return route.continue();
    const table = url.pathname.split('/').at(-1);
    if (table === 'deal_kits' && kitError) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'test error' }) });
    const rows = {
      businesses: url.searchParams.get('select')?.includes('staff(') ? business : [business],
      services: business.services,
      business_images: business.business_images.map((image) => ({ ...image, business_id: 20 })),
      time_deals: [deal, { ...deal, id: 11, deal_price: 40000 }, { ...deal, id: 12, remaining_capacity: 0 }, { ...deal, id: 13, end_at: '2000-01-01' }],
      deal_kits: offers.filter((offer) => offer.active),
    }[table] ?? [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) });
  });
  await page.goto(base + '/business/20');
  const kits = page.getByRole('region', { name: '딜키트', exact: true });
  const floating = page.getByRole('region', { name: '판매 중인 타임딜', exact: true });
  await kits.getByText('판매 중인 상품 없음', { exact: true }).waitFor();
  assert.equal(await kits.getAttribute('aria-disabled'), 'true');
  assert.equal(await kits.getByRole('link').count(), 0);
  await floating.waitFor();
  assert.equal(await floating.getByRole('link').count(), 2);
  const bounds = await floating.boundingBox();
  const photo = await page.getByRole('button', { name: '대표 사진 크게 보기' }).boundingBox();
  assert.ok(bounds.y >= photo.y && bounds.y + bounds.height <= photo.y + photo.height);
  await floating.getByRole('link').first().getByText('35%', { exact: true }).waitFor();
  await page.screenshot({ path: 'node_modules/.tmp/business-time-deal-overlay.png', fullPage: true });
  await floating.getByRole('link').first().click();
  await page.waitForURL('**/deal/10');
  offers = [{ id: 1, business_id: 20, title: '헤어 케어 패키지', description: '', type: 'oneShop', purpose: '', items: ['커트', '클리닉'], original_price: 60000, price: 49000, active: true, template_id: null, business }];
  await page.goto(base + '/business/20');
  await kits.getByRole('link').waitFor();
  assert.equal(await kits.getAttribute('aria-disabled'), 'false');
  await floating.waitFor();
  await page.clock.fastForward(125000);
  await floating.waitFor({ state: 'detached' });
  assert.equal(await page.locator('a[href^="/deal/"]').count(), 0);
  offers[0].active = false;
  await page.reload();
  await kits.getByText('판매 중인 상품 없음', { exact: true }).waitFor();
  assert.equal(await kits.getAttribute('aria-disabled'), 'true');
  kitError = true;
  await page.reload();
  await kits.getByRole('alert').waitFor();
  assert.equal(await kits.getAttribute('aria-disabled'), 'true');
  assert.equal(await kits.getByText('판매 중인 상품 없음', { exact: true }).count(), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log('PASS: empty/inactive/error kit states, active kits, floating deals, discount and detail link, expired/sold-out exclusion and live expiry');
} finally { await browser.close(); }
