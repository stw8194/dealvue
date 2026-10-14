import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.DEALVUE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href : 'playwright');
const base = process.env.DEALVUE_TEST_URL ?? 'http://127.0.0.1:5174';
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => localStorage.setItem('dealvue-consumer-preview-mode', JSON.stringify({ state: { enabled: true }, version: 0 })));
  await context.route('**/*', (route) => route.request().url().startsWith(base) ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base + '/package');
  await page.getByRole('navigation', { name: '딜키트 상품종류' }).waitFor();
  assert.equal(await page.locator('a[href^="/package/detail/"]').count(), 6);
  await page.getByText('480,000원', { exact: true }).waitFor();
  await page.getByText('300,000원', { exact: true }).waitFor();
  await page.getByText('99,000원', { exact: true }).waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('img[src^="/images/deal-kits/"]')].every((img) => img.complete && img.naturalWidth > 0));
  await page.getByRole('navigation', { name: '딜키트 상품종류' }).getByRole('link', { name: '웨딩 헤메드 패키지', exact: true }).click();
  assert.equal(await page.locator('a[href^="/package/detail/"]').count(), 2);
  await page.getByLabel('상품 정렬').selectOption('price');
  await page.waitForFunction(() => document.querySelector('a[href^="/package/detail/"]')?.getAttribute('href') === '/package/detail/1');
  assert.ok((await page.locator('a[href^="/package/detail/"]').first().innerText()).includes('내추럴 웨딩 헤메드'));
  await page.screenshot({ path: 'node_modules/.tmp/deal-kit-shop-products.png', fullPage: true });
  await page.getByRole('link').filter({ hasText: '내추럴 웨딩 헤메드' }).click();
  await page.getByRole('heading', { name: '이 상품의 서비스 구성', exact: true }).waitFor();
  await page.getByRole('link', { name: '딜뷰 헤어 스튜디오 ›', exact: true }).waitFor();
  await page.getByText('드레스 피팅', { exact: true }).waitFor();
  await page.getByText('40% · 480,000원', { exact: true }).waitFor();
  assert.equal(await page.locator('a[href^="/checkout/"]').count(), 0);
  assert.equal(await page.getByText('시간제한 없는 패키지 할인', { exact: true }).count(), 1);
  assert.equal(await page.getByText('연결 매장 확인', { exact: false }).count(), 0);
  for (const path of ['one-shop', 'shop-shop']) {
    await page.goto(base + '/package/' + path);
    await page.getByText('판매 중인 딜키트가 없습니다', { exact: true }).waitFor();
  }
  await page.goto(base + '/package/special?category=999999');
  await page.getByText('판매 중인 딜키트가 없습니다', { exact: true }).waitFor();
  await page.goto(base + '/package/detail/999999');
  await page.getByText('판매 중인 딜키트를 찾을 수 없습니다', { exact: true }).waitFor();
  await page.goto(base + '/deal/9001');
  await page.getByText('타임딜 상세', { exact: true }).waitFor();
  await page.goto(base + '/business/7001');
  await page.getByRole('heading', { name: '내추럴 웨딩 헤메드', exact: true }).waitFor();
  await page.getByText('480,000원', { exact: true }).waitFor();
  await page.goto(base + '/business/7002');
  await page.getByRole('heading', { name: '본식 프리미엄 헤어·메이크업', exact: true }).waitFor();
  await page.getByText('600,000원', { exact: true }).waitFor();
  assert.equal(await page.getByRole('heading', { name: '내추럴 웨딩 헤메드', exact: true }).count(), 0);
  await page.goto(base + '/');
  const recommendation = page.locator('section').filter({ has: page.getByRole('heading', { name: '딜키트 추천', exact: true }) });
  await recommendation.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('img[src^="/images/deal-kits/"]')].every((img) => img.complete && img.naturalWidth > 0));
  assert.equal(await recommendation.locator('a[href^="/package/template/"]').count(), 3);
  await recommendation.screenshot({ path: 'node_modules/.tmp/deal-kit-recommendation.png' });
  assert.deepEqual(errors, []);
  console.log('PASS: grouped minimum prices, independent package offers, local photos, filters, business scope, mobile recommendation cards');

  const liveContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const live = await liveContext.newPage();
  live.on('pageerror', (error) => errors.push(error.message));
  let rows = [];
  let templates = [];
  const writes = [];
  await live.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.href.startsWith(base)) return route.continue();
    const table = url.pathname.split('/').at(-1);
    const json = (data) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    if (table === 'can_manage_deal_kits') return json(true);
    if (table === 'deal_kit_templates') return json(templates);
    if (table === 'deal_kits') {
      if (route.request().method() === 'POST') {
        const input = route.request().postDataJSON();
        writes.push(input);
        const saved = { ...input, id: 50, template: templates.find((template) => template.id === input.template_id) };
        rows.push(saved);
        return json({ id: saved.id });
      }
      return json(rows.filter((row) => (!url.searchParams.has('active') || row.active) && (!url.searchParams.has('business_id') || row.business_id === Number(url.searchParams.get('business_id').slice(3)))));
    }
    return route.abort();
  });
  await live.goto(base + '/package');
  const fixtures = await live.evaluate(async () => {
    const module = await import('/src/features/consumer/dealKits.ts');
    return { rows: module.PREVIEW_DEAL_KITS, templates: module.PREVIEW_DEAL_KIT_TEMPLATES };
  });
  rows = fixtures.rows; templates = fixtures.templates;
  await live.reload();
  await live.getByText('480,000원', { exact: true }).waitFor();
  rows[0].active = false;
  await live.reload();
  await live.getByText('600,000원', { exact: true }).waitFor();
  assert.equal(await live.getByText('480,000원', { exact: true }).count(), 0);
  const weddingCard = live.getByRole('link').filter({ hasText: '본식 프리미엄 헤어·메이크업' });
  assert.ok((await weddingCard.innerText()).includes('25%'));
  await live.goto(base + '/business/7001/manage-deal-kits');
  await live.evaluate(async () => {
    const { useAuthStore } = await import('/src/store/useAuthStore.ts');
    useAuthStore.getState().setUser({ id: '11111111-1111-4111-8111-111111111111' });
  });
  await live.getByRole('button', { name: '패키지 상품 등록', exact: true }).click();
  await live.getByLabel('등록할 패키지').selectOption('1');
  assert.equal(await live.getByLabel('상품명', { exact: true }).inputValue(), '웨딩 헤메드 패키지');
  await live.getByLabel('정상가 (원)', { exact: true }).fill('800000');
  await live.getByLabel('패키지 할인가 (원)', { exact: true }).fill('450000');
  await live.getByLabel('판매 중 (소비자에게 공개)').check();
  await live.getByRole('button', { name: '저장', exact: true }).click();
  await live.getByText('딜키트를 저장했습니다.', { exact: true }).waitFor();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].template_id, 1);
  assert.equal(writes[0].business_id, 7001);
  await live.goto(base + '/package');
  await live.getByText('450,000원', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: API adapter, inactive offer exclusion, matching discount, template selection, registration and updated minimum price (mocked API)');
} finally { await browser.close(); }
