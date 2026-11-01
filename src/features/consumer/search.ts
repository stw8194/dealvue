import type { ConsumerDeal } from "./types";

type SearchableDeal = Pick<ConsumerDeal, "serviceName" | "businessName" | "address" | "description">;

// Keep aliases specific: "컬러" alone can also mean personal-color makeup services.
const aliases: [RegExp, string][] = [
  [/파마|퍼머/gu, "펌"],
  [/컷/gu, "커트"],
  [/셋팅/gu, "세팅"],
  [/남자/gu, "남성"],
  [/여자/gu, "여성"],
  [/컬러링/gu, "염색"],
];

function normalize(value: string) {
  return aliases.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value.normalize("NFKC").toLowerCase()).replace(/\s+/gu, "");
}

/** Negative means no match; title matches outrank incidental words in descriptions. */
export function dealSearchScore(deal: SearchableDeal, keyword: string): number {
  const terms = [...new Set(keyword.normalize("NFKC").trim().split(/\s+/u).filter(Boolean).map(normalize))];
  if (!terms.length) return 0;
  const title = normalize(deal.serviceName);
  const business = normalize(deal.businessName);
  const address = normalize(deal.address);
  const description = normalize(deal.description);
  const matches = (text: string) => terms.every(term => text.includes(term));
  if (matches(title)) return title === terms.join("") ? 100 : 80;
  if (matches(business)) return business === terms.join("") ? 70 : 60;
  if (!matches(`${business} ${title} ${address} ${description}`)) return -1;
  if (matches(address)) return 40;
  if (matches(description)) return 20;
  return 10;
}
