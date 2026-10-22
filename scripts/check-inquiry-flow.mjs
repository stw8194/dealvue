import assert from 'node:assert/strict';
import { INQUIRY_FLOW, resolveInquiry } from '../src/pages/MyPage/inquiryFlow.ts';
const seen = new Set(['start']);
for (const key of seen) {
  const step = INQUIRY_FLOW[key];
  assert.ok(step.content.trim());
  for (const choice of step.choices) {
    assert.notEqual(!!choice.next, !!choice.path, `${key}: every choice must have one destination`);
    if (choice.next) { assert.ok(INQUIRY_FLOW[choice.next], `${key}: broken branch`); seen.add(choice.next); }
    if (choice.path) assert.match(choice.path, /^\/(?!\/)/);
  }
}
assert.equal(resolveInquiry('타임딜 예약 취소', 'start'), 'cancel');
assert.equal(resolveInquiry('취소하면 환불돼요?', 'start'), 'refund');
assert.equal(resolveInquiry('예약 날짜 바꾸고 싶어요', 'start'), 'change');
assert.equal(resolveInquiry('네', 'deal'), 'deal-price');
assert.equal(resolveInquiry('포인트 어디에 써요?', 'start'), 'points-use');
assert.equal(resolveInquiry('알 수 없는 문의', 'start'), 'unknown');
assert.ok(INQUIRY_FLOW['deal-price'].choices.some(c => c.primary && c.path === '/search'));
console.log(`PASS ${seen.size} reachable steps, valid links, contextual follow-ups and booking CTA`);
