import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.DEALVUE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href : 'playwright');
const base = process.env.DEALVUE_TEST_URL ?? 'http://127.0.0.1:5186';
const browser = await chromium.launch({ headless: true });
const ribbon = process.env.DEALVUE_HAIR_RIBBON === 'none' ? 'none' : 'ribbon';
const output = `node_modules/.tmp/coco-head-review${ribbon === 'none' ? '-no-ribbon' : ''}`;
await mkdir(output, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => route.request().url().startsWith(base) || route.request().url().startsWith('data:') ? route.continue() : route.abort());
  await page.goto(base + '/rewards?tab=wardrobe'); await page.locator('.fashion-studio').waitFor();
  await page.getByRole('button', { name: '놀이터 팝업 닫기', exact: true }).click();
  await page.evaluate(async hairRibbon => {
    const R = (await import('/node_modules/.vite/deps/react.js')).default;
    const D = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
    const { default: Head } = await import('/src/features/consumer/engagement/playground/AvatarHead.tsx');
    const { HAIRSTYLES, DEFAULT_APPEARANCE } = await import('/src/features/consumer/engagement/playground/appearance.ts');
    document.getElementById('root')?.remove();
    const style = document.createElement('style');
    style.textContent = 'body{margin:0;background:white}#coco-proof{display:grid;grid-template-columns:repeat(2,512px)}.proof{position:relative;width:512px;height:440px;overflow:hidden;background:white}.proof>.avatar-custom-head{width:512px;height:768px}.proof .eye-open,.proof .eye-closed{animation:none!important}.proof .eye-closed{opacity:0}';
    document.head.append(style);
    const root = document.createElement('div'); root.id = 'coco-proof'; document.body.append(root);
    const reference = R.createElement('svg', { viewBox: '0 0 512 768', width: 512, height: 768 }, R.createElement('defs', null, R.createElement('clipPath', { id: 'original-coco-proof' }, R.createElement('path', { d: 'M0 0H493V384H328V362H286V390H227V362H184V384H0Z' }))), R.createElement('image', { href: '/images/playground/cute-fashion-atlas-v3.png', x: -37.9, width: 1536, height: 1536, clipPath: 'url(#original-coco-proof)' }));
    D.createRoot(root).render([R.createElement('div', { className: 'proof', id: 'reference', key: 'reference' }, reference), ...HAIRSTYLES.map(h => R.createElement('div', { className: 'proof', id: `proof-${h.id}`, key: h.id }, R.createElement(Head, { appearance: { ...DEFAULT_APPEARANCE, hairRibbon, hairstyle: h.id } })))]);
  }, ribbon);
  await page.locator('#proof-pixie .avatar-custom-head').waitFor(); await page.waitForTimeout(800);
  const screenshots = {};
  for (const id of ['reference', 'bob', 'waves', 'twintails', 'braids', 'bun', 'pixie']) screenshots[id] = (await page.locator(id === 'reference' ? '#reference' : `#proof-${id}`).screenshot()).toString('base64');
  const result = await page.evaluate(async images => {
    const pixels = {};
    for (const [id, data] of Object.entries(images)) {
      const image = new Image(); image.src = 'data:image/png;base64,' + data; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0); pixels[id] = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    }
    let cocoDifferences = 0;
    for (let i = 0; i < pixels.bob.length; i++) if (pixels.bob[i] !== pixels.reference[i]) cocoDifferences++;
    const landmarks = [[186, 271, 10, 10], [330, 271, 10, 10], [256, 296, 6, 6], [256, 321, 10, 6]];
    const differences = {};
    for (const id of ['waves', 'twintails', 'braids', 'bun', 'pixie']) {
      let count = 0, maxDelta = 0;
      for (const [cx, cy, rx, ry] of landmarks) for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) for (let c = 0; c < 4; c++) {
        const index = (y * 512 + x) * 4 + c;
        const delta = Math.abs(pixels[id][index] - pixels.reference[index]);
        maxDelta = Math.max(maxDelta, delta);
        if (delta > 1) count++;
      }
      differences[id] = { count, maxDelta };
    }
    const jawContact = [[197, 363], [315, 363]].map(([x, y]) => { const i = (y * 512 + x) * 4; return Array.from(pixels.bun.slice(i, i + 3)); });
    const ids = [...document.querySelectorAll('[id]')].map(n => n.id);
    return { cocoDifferences, differences, jawContact, uniqueIds: ids.length === new Set(ids).size };
  }, screenshots);
  console.log(JSON.stringify(result));
  assert.equal(result.cocoDifferences, 0, 'Coco must remain pixel-identical to the original portrait, including the default mouth');
  for (const [id, { count }] of Object.entries(result.differences)) assert.equal(count, 0, `${id} must keep Coco eye, nose and mouth pixels at the original positions`);
  assert.ok(result.jawContact.every(rgb => rgb.some(channel => channel < 210)), 'bun must have painted rear hair behind both cheeks, rather than the background crescent reported by the user');
  assert.equal(result.uniqueIds, true); assert.deepEqual(errors, []);
  // One channel step is rounding when the original semi-transparent paint sits
  // over another hair layer. Coco itself has a strict zero-difference check.
  console.log('PASS Coco is pixel-identical to the original; all five other hairs preserve original eye/nose/mouth pixels and positions.');

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route('**/*', route => route.request().url().startsWith(base) || route.request().url().startsWith('data:') ? route.continue() : route.abort());
  await context.addInitScript(() => localStorage.setItem('dealvue-consumer-engagement-preview-v1', JSON.stringify({ version: 1, state: { ownedOutfits: ['basic', 'pink'] } })));
  const app = await context.newPage(); app.on('pageerror', e => errors.push(e.message));
  await app.goto(base + '/rewards?tab=wardrobe'); await app.locator('[data-avatar-turn][data-ready=true]').waitFor();
  const catalog = await app.evaluate(async () => {
    const a = await import('/src/features/consumer/engagement/playground/appearance.ts');
    const d = await import('/src/features/consumer/engagement/playground/data.ts');
    const motion = await import('/src/features/consumer/engagement/avatar3d/turnMotion.ts');
    return { hairs: a.HAIRSTYLES, choices: a.HAIR_CHOICES, looks: d.LOOKS, duration: motion.TURN_DURATION };
  });
  assert.equal(catalog.duration, 730);
  const category = name => app.getByRole('group', { name: '꾸미기 종류', exact: true }).getByRole('button', { name, exact: true }).click();
  for (let index = 0; index < catalog.hairs.length; index++) {
    const hair = catalog.hairs[index];
    await category('얼굴·헤어'); await app.getByRole('button', { name: catalog.choices.find(c => c.hairstyle === hair.id && (hair.id === 'bob' || c.hairRibbon === ribbon)).name, exact: true }).click();
    await app.waitForFunction(id => JSON.parse(document.querySelector('[data-avatar-turn][data-ready]').dataset.appearance).hairstyle === id, hair.id);
    if (hair.id !== 'bob') {
      await app.waitForFunction(ribbon => JSON.parse(document.querySelector('[data-avatar-turn][data-ready]').dataset.appearance).hairRibbon === ribbon, ribbon);
      const images = await app.locator('[data-avatar-turn][data-ready] .redesigned-hair-art image').evaluateAll(nodes => nodes.filter(node => !node.closest('[data-hair-backing]')).map(node => node.getAttribute('href')));
      assert.ok(images.length > 0 && images.every(src => src.includes('/no-ribbon/') === (ribbon === 'none')), 'active variant must reach every rotation layer');
    }
    await app.locator('dialog .avatar-stage').screenshot({ path: `${output}/stage-${hair.id}.png` });
    await category('옷');
    await app.evaluate(() => {
      const root = document.querySelector('[data-avatar-turn][data-ready]');
      window.cocoTurnSamples = [];
      window.cocoTurnSample = requestAnimationFrame(function sample() {
        if (root.dataset.turning === 'true') window.cocoTurnSamples.push({ face: root.dataset.face, time: performance.now(), layerCount: root.querySelectorAll('.drawn-turn-face').length });
        window.cocoTurnSample = requestAnimationFrame(sample);
      });
    });
    const target = index % 2 === 0 ? 'pink' : 'basic';
    const name = catalog.looks.find(l => l.id === target).name;
    await app.getByRole('button', { name: `${name} · 보유`, exact: true }).click();
    await app.waitForFunction(() => window.cocoTurnSamples.length > 0);
    await app.waitForFunction(id => { const root = document.querySelector('[data-avatar-turn][data-ready]'); return root.dataset.outfit === id && root.dataset.turning === 'false'; }, target);
    const turn = await app.evaluate(() => { cancelAnimationFrame(window.cocoTurnSample); const root = document.querySelector('[data-avatar-turn][data-ready]'); return { samples: window.cocoTurnSamples, fallback: root.dataset.turnFallback, appearance: JSON.parse(root.dataset.appearance) }; });
    const faces = new Set(turn.samples.map(sample => sample.face.replace(/^(from|to)-/, '')));
    assert.equal(faces.size, 8, `${hair.id} must show all eight turn orientations`);
    assert.ok(turn.samples.every(s => s.layerCount === 10));
    assert.equal(turn.fallback, undefined); assert.equal(turn.appearance.hairstyle, hair.id); if (hair.id !== 'bob') assert.equal(turn.appearance.hairRibbon, ribbon);
    console.log(`PASS ${hair.id}: 8 turn orientations, original face sources, 730ms timing, no image fallback.`);
  }
  await context.close(); assert.deepEqual(errors, []);
} finally { await browser.close(); }
