// Visual proof: unchanged Coco portrait, five alternative hairs, and the turn views.
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.DEALVUE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href : 'playwright');
const base = process.env.DEALVUE_TEST_URL ?? 'http://127.0.0.1:5186';
const ribbon = process.env.DEALVUE_HAIR_RIBBON === 'none' ? 'none' : 'ribbon';
const output = `node_modules/.tmp/coco-head-review${ribbon === 'none' ? '-no-ribbon' : ''}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.request().url().startsWith(base) || route.request().url().startsWith('data:') ? route.continue() : route.abort());
  await page.goto(base + '/rewards?tab=wardrobe');
  await page.locator('.fashion-studio').waitFor();
  await page.getByRole('button', { name: '놀이터 팝업 닫기', exact: true }).click();
  await page.evaluate(async hairRibbon => {
    const R = (await import('/node_modules/.vite/deps/react.js')).default;
    const D = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
    const { default: Head } = await import('/src/features/consumer/engagement/playground/AvatarHead.tsx');
    const { CocoTurnHead } = await import('/src/features/consumer/engagement/playground/CocoFace.tsx');
    const { turnAtlasSource } = await import('/src/features/consumer/engagement/playground/turnViews.ts');
    const { HAIRSTYLES, DEFAULT_APPEARANCE, MOUTH_SHAPES } = await import('/src/features/consumer/engagement/playground/appearance.ts');
    document.getElementById('root')?.remove();
    const style = document.createElement('style');
    style.textContent = 'body{margin:0;background:#f6f1f7}#coco-review{padding:12px;display:grid;grid-template-columns:repeat(6,256px);gap:8px;width:1600px}.review-title{font:13px sans-serif;color:#735b70;margin:10px}.review-art{position:relative;width:256px;height:315px;background:white;overflow:hidden}.review-art>.avatar-custom-head{width:256px;height:384px}.eye-open,.eye-closed{animation:none!important}.eye-closed{opacity:0}';
    document.head.append(style);
    const root = document.createElement('div'); root.id = 'coco-review'; document.body.append(root);
    const cells = [];
    for (const view of ['front', 'front-quarter', 'side', 'back-quarter', 'back']) for (const hair of HAIRSTYLES) {
      const appearance = { ...DEFAULT_APPEARANCE, hairRibbon, hairstyle: hair.id };
      const art = view === 'front' ? R.createElement(Head, { appearance }) : hair.id !== 'bob' ? R.createElement(CocoTurnHead, { appearance, view }) : R.createElement('svg', { viewBox: '0 0 512 768', width: 256, height: 384 }, R.createElement('defs', null, R.createElement('clipPath', { id: `reference-${view}` }, R.createElement('rect', { width: 512, height: 384 }))), R.createElement('image', { href: turnAtlasSource('base', view), width: 1536, height: 1536, clipPath: `url(#reference-${view})` }));
      cells.push(R.createElement('div', { key: `${view}-${hair.id}` }, R.createElement('p', { className: 'review-title' }, `${hair.name} · ${view}`), R.createElement('div', { className: 'review-art', 'data-hair': hair.id, 'data-view': view }, art)));
    }
    for (const hair of ['bob', 'waves']) for (const mouth of MOUTH_SHAPES) cells.push(R.createElement('div', { key: `${hair}-${mouth.id}` }, R.createElement('p', { className: 'review-title' }, `${hair} · ${mouth.name}`), R.createElement('div', { className: 'review-art' }, R.createElement(Head, { appearance: { ...DEFAULT_APPEARANCE, hairRibbon, hairstyle: hair, mouth: mouth.id } }))));
    D.createRoot(root).render(cells);
  }, ribbon);
  await page.locator('[data-hair=pixie][data-view=back]').waitFor();
  await page.waitForFunction(() => [...document.images].every(img => img.complete));
  await page.waitForTimeout(500);
  await page.locator('#coco-review').screenshot({ path: `${output}/all-heads.png` });
  await page.screenshot({ path: `${output}/front-heads.png`, clip: { x: 0, y: 0, width: 1600, height: 370 } });
  await page.addStyleTag({ content: '#coco-review{grid-template-columns:repeat(6,512px);width:3200px}.review-art{width:512px;height:450px}.review-art>.avatar-custom-head,.review-art>svg{width:512px;height:768px}' });
  await page.locator('[data-hair=bun][data-view=front]').screenshot({ path: `${output}/front-bun-detail.png` });
  await page.locator('[data-hair=bun][data-view=front-quarter]').screenshot({ path: `${output}/quarter-bun-detail.png` });
  await page.locator('[data-hair=waves][data-view=front-quarter]').screenshot({ path: `${output}/quarter-waves-detail.png` });
  await page.locator('[data-hair=bob][data-view=front-quarter]').screenshot({ path: `${output}/quarter-coco-detail.png` });
  console.log(JSON.stringify({ errors, screenshot: `${output}/all-heads.png` }));
} finally { await browser.close(); }
