// Search the actual 75-service catalog; no API or browser state mutations.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dealSearchScore } from '../src/features/consumer/search.ts';

const catalog = JSON.parse(await readFile('src/data/provided-catalog.json', 'utf8'));
const services = catalog.businesses.flatMap(business => business.services.map(service => ({
  id: service.source_key,
  businessName: business.name,
  serviceName: service.name,
  address: business.address,
  description: service.description,
  category: business.category,
})));
assert.equal(services.length, 75);
const results = keyword => services.filter(service => dealSearchScore(service, keyword) >= 0)
  .sort((a, b) => dealSearchScore(b, keyword) - dealSearchScore(a, keyword));
const ids = keyword => results(keyword).map(service => service.id).sort();

assert.deepEqual(ids('파마'), ids('펌'));
assert.deepEqual(ids('퍼머'), ids('펌'));
assert.equal(results('파마').filter(service => /펌/.test(service.serviceName)).length, 4);
assert.deepEqual(ids('  파마  '), ids('파마'));
assert.deepEqual(ids('컷'), ids('커트'));
assert.deepEqual(ids('셋팅'), ids('세팅'));
assert.deepEqual(ids('염색'), ids('컬러링'));
assert.equal(results('염색').length, 6);
assert.ok(results('염색').slice(0, 3).every(service => service.serviceName.includes('염색')), 'actual coloring menus precede related care');
assert.deepEqual(ids('뿌리 염색'), ids('뿌리염색'));
assert.deepEqual(ids('남자 파마'), ids('남성 펌'));
assert.ok(results('남자 파마').some(service => service.serviceName === '남성 다운펌'));
assert.deepEqual(ids('nuagen'), ids('NUAGEN'));
assert.equal(results('로에르 염색').length, 5, 'shop and treatment terms can match different fields');
assert.equal(results('존재하지않는시술987').length, 0);
assert.equal(results('   ').length, 75);
assert.ok(results('강남구').every(service => service.address.includes('강남구')));
// Do not turn personal-color consultations into hair-coloring results via a generic "컬러" alias.
const consultation = { businessName: '메이크업', serviceName: '퍼스널 컬러 진단', address: '', description: '피부톤 상담' };
assert.equal(dealSearchScore(consultation, '염색'), -1);
assert.ok(dealSearchScore(consultation, '퍼스널 컬러') > 0);

console.log(`PASS actual catalog search: 파마/펌 ${results('파마').length}, 염색 ${results('염색').length}; aliases, menu-first relevance, spacing, multiple terms, shop, area and unknown terms`);
