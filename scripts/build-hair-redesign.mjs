// Export generated PNG masters to WebP without changing dimensions or layout.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.DEALVUE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href : 'playwright');
await mkdir('public/images/playground/hair-v3', { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
 const page = await browser.newPage();
 for (const variant of ['', 'no-ribbon/']) {
 await mkdir(`public/images/playground/hair-v3/${variant}`, { recursive: true });
 for (const id of ['waves','twintails','braids','bun','pixie']) {
  const source = await readFile(`assets/hair-redesign-v3/${variant}${id}-turns.png`);
  const encoded = await page.evaluate(async data => {
   const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
   const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
   canvas.getContext('2d').drawImage(image,0,0);
   return canvas.toDataURL('image/webp',.96).split(',')[1];
  }, source.toString('base64'));
  const output = Buffer.from(encoded,'base64');
  await writeFile(`public/images/playground/hair-v3/${variant}${id}-turns.webp`,output);
  console.log(`${variant}${id}: ${source.length} byte PNG master -> ${output.length} byte WebP export`);
 }
 }
} finally { await browser.close(); }
