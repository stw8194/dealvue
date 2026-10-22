import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.DEALVUE_PLAYWRIGHT_MODULE ? pathToFileURL(process.env.DEALVUE_PLAYWRIGHT_MODULE).href : 'playwright');
const base = process.env.DEALVUE_TEST_URL ?? 'http://127.0.0.1:5186';
const output = 'node_modules/.tmp/hair-arm-review';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
 const page = await browser.newPage({ viewport: { width: 1536, height: 850 }, reducedMotion: 'reduce' });
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*', r => r.request().url().startsWith(base) || r.request().url().startsWith('data:') ? r.continue() : r.abort());
 await page.goto(base+'/rewards?tab=wardrobe');await page.locator('.fashion-studio').waitFor();
 await page.getByRole('button',{name:'놀이터 팝업 닫기',exact:true}).click();
 await page.evaluate(async()=>{
  const R=(await import('/node_modules/.vite/deps/react.js')).default;
  const D=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
  const { PortraitAvatar: Avatar }=await import('/src/features/consumer/engagement/playground/Avatar.tsx');
  const { DEFAULT_APPEARANCE }=await import('/src/features/consumer/engagement/playground/appearance.ts');
  const { LOOKS, DEFAULT_ACCESSORIES }=await import('/src/features/consumer/engagement/playground/data.ts');
  document.getElementById('root')?.remove();
  const style=document.createElement('style');style.textContent='html,body{background:transparent!important}body{margin:0}#layer-review{display:flex;width:1536px;height:768px}.layer-cell{position:relative;width:512px;height:768px;flex:none}.layer-cell>.fashion-avatar{width:512px;height:768px}.without-arms .avatar-foreground-arms{display:none}.eye-open,.eye-closed{animation:none!important}.eye-closed{opacity:0}';document.head.append(style);
  const host=document.createElement('div');host.id='layer-review';document.body.append(host);const root=D.createRoot(host);
  window.reviewLooks=LOOKS.map(l=>l.id);
  window.renderHairLayers=({hairstyle,outfit,view,hairRibbon='none'})=>root.render(['with-arms','without-arms','reference'].map(mode=>R.createElement('div',{className:`layer-cell ${mode}`,key:mode},R.createElement(Avatar,{outfit,accessories:DEFAULT_ACCESSORIES,view:view==='front'?undefined:view,appearance:{...DEFAULT_APPEARANCE,hairstyle:mode==='reference'?'bob':hairstyle,hairRibbon}}))));
 });
 const cases=[];
 for(const hair of ['waves','twintails','braids']) for(const outfit of ['basic','pink','mint','cafe','hanbok','bunny-hoodie']) cases.push({hairstyle:hair,outfit,view:'front'});
 for(const view of ['front-quarter','side','back-quarter','back']) for(const hair of ['waves','braids']) cases.push({hairstyle:hair,outfit:'pink',view});
 const results=[];
 for(const item of cases){
  await page.evaluate(item=>window.renderHairLayers(item),item);
  await page.locator('.with-arms [data-arm-view]').waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('image')].every(image=>image.href.baseVal));
  await page.waitForTimeout(100);
  const png=await page.locator('#layer-review').screenshot({omitBackground:true,path:`${output}/${item.outfit}-${item.hairstyle}-${item.view}.png`});
  const result=await page.evaluate(async data=>{
   const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const p=ctx.getImageData(0,0,image.width,image.height).data;
   const delta=(x,y,a,b)=>Math.max(...[0,1,2].map(c=>Math.abs(p[(y*1536+x+a*512)*4+c]-p[(y*1536+x+b*512)*4+c])));
   let changed=0,opaqueChanged=0,restored=0,headChanged=0;
   for(let y=390;y<570;y++)for(let x=50;x<460;x++)if(delta(x,y,0,1)>24){changed++;if(p[(y*1536+x+1024)*4+3]>=250){opaqueChanged++;if(delta(x,y,0,2)<=8)restored++;}}
   for(let y=0;y<340;y++)for(let x=60;x<450;x++)if(p[(y*1536+x)*4+3]>=250 && p[(y*1536+x+512)*4+3]>=250 && delta(x,y,0,1)>8)headChanged++;
   return {changed,opaqueChanged,restored,headChanged};
  },png.toString('base64'));
  assert.equal(result.headChanged,0,'arm foreground must not replace any of the chosen head');
  assert.ok(result.changed>50,`${JSON.stringify(item)} must visibly restore arm pixels covered by hair`);
  assert.ok(result.opaqueChanged>50 && result.restored/result.opaqueChanged>.98,`${JSON.stringify(item)} must restore the outfit painting rather than covering it with new shapes: ${JSON.stringify(result)}`);
  results.push({...item,...result});
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({cases:results.length,restoredPixels:results.reduce((n,r)=>n+r.restored,0),minimumRestorationRatio:Math.min(...results.map(r=>r.restored/r.opaqueChanged)),screenshots:output}));console.log('PASS painted arms appear above long hair in 26 outfit/view combinations, while the chosen head stays unchanged.');
}finally{await browser.close()}
