"""Prepare the supplied workbook and images without changing the remote database."""
import argparse
import hashlib
import json
import math
import shutil
from pathlib import Path

import openpyxl

parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
book = openpyxl.load_workbook(args.source_dir / '딜뷰__.xlsx', data_only=True)

def records(name):
    rows = list(book[name].values)
    return [dict(zip(rows[0], row)) for row in rows[1:] if any(v is not None for v in row)]

shops = records('샵정보')
services = records('서비스_가격')
deals = records('타임딜_예약')
reviews = records('리뷰')
filters = records('검색_필터')
deal_index = {(r['샵명'], r['서비스명']): r for r in deals}
slugs = ['ongyeol', 'damon', 'yunseul', 'raon', 'gyeolchae', 'bellunique', 'moaren', 'nouvelic', 'arvien', 'riobella', 'roere', 'moneve', 'nuagen', 'ardien', 'rivelloa']
# User-approved approximate areas; these are not verified shop addresses.
areas = [
    ('서울특별시 강남구 신사동', 37.5219, 127.0228),
    ('서울특별시 성동구 성수동', 37.5446, 127.0559),
    ('서울특별시 마포구 연남동', 37.5627, 126.9252),
    ('서울특별시 송파구 잠실동', 37.5110, 127.0980),
    ('서울특별시 서초구 서초동', 37.5027, 127.0247),
]
categories = {'피부샵': 'aesthetic', '메이크업샵': 'makeup', '헤어샵': 'hair'}
result = {'version': 1, 'priceBasis': '타임딜_예약', 'locationBasis': 'user-approved approximate sample areas', 'businesses': []}
assets = []
for i, shop in enumerate(shops):
    name, slug = shop['샵명'], slugs[i]
    directory = next((p for p in args.source_dir.rglob('*') if p.is_dir() and (p.name == name or name.startswith(p.name)) and any(f.is_file() for f in p.iterdir())), None)
    images = {'representative': [], 'review': []}
    if directory:
        for source in sorted(directory.iterdir()):
            if not source.is_file():
                continue
            kind = 'representative' if '대표' in source.name else 'review'
            extension = '.jpg' if source.suffix.lower() in ['.jpg', '.jpeg'] else '.png'
            filename = f'{kind}-{len(images[kind]) + 1:02d}{extension}'
            target = root / 'public' / 'images' / 'provided' / slug / filename
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
            url = f'/images/provided/{slug}/{filename}'
            images[kind].append(url)
            assets.append({'source': str(source.relative_to(args.source_dir)), 'url': url, 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'mappingNote': 'filename refers to Ardien; folder ownership retained pending review' if slug == 'nuagen' and 'Ardien' in source.name else None})
    area, latitude, longitude = areas[i % len(areas)]
    details = {
        'source': 'provided-workbook', 'is_sample': True,
        'opening_hours': shop['영업시간'], 'closed_days': shop['휴무일'],
        'hashtags': shop['샵 해시태그'], 'amenities': shop['편의정보'],
        'parking': shop['주차'], 'average_rating': shop['평균 별점'],
        'review_count': shop['리뷰 수'], 'favorite_count': shop['찜 수'],
        'deposit': shop['예약금'], 'cancellation_policy': shop['취소·환불 안내'],
        'location_is_approximate': True, 'review_images': images['review'],
        'review_samples': [{'id': f'{slug}-review-{j+1}', 'service_name': r['이용 서비스'], 'rating': r['별점'], 'content': r['리뷰 내용']} for j,r in enumerate(r for r in reviews if r['샵명'] == name)],
        'search_filters': next(r for r in filters if r['샵명'] == name),
    }
    menus = []
    for j, service in enumerate(r for r in services if r['샵명'] == name):
        deal = deal_index[(name, service['서비스명'])]
        # Resolve four conflicting Ardien regular prices using the user's selected sheet.
        regular_price = deal['정가'] if slug == 'ardien' else service['정가']
        menus.append({
            'source_key': f'provided:{slug}:service:{j+1}', 'name': service['서비스명'],
            'description': service['서비스 설명'], 'price': regular_price,
            'display_duration_minutes': service['소요시간(분)'],
            'duration_minutes': math.ceil(service['소요시간(분)'] / 30) * 30,
            'source_details': {'hashtags': service['서비스 해시태그'], 'additional_charge': service['추가금 안내'], 'regular_discount_price': service['할인가'], 'original_workbook_regular_price': service['정가']},
            'deal': {'start_time': deal['타임딜 시작시간'], 'end_time': deal['타임딜 종료시간'], 'original_price': deal['정가'], 'deal_price': deal['타임딜가'], 'discount_rate': deal['할인율(%)'], 'capacity': deal['남은 예약 수'], 'status': deal['예약 상태'], 'remaining_label': deal['진행시간']},
        })
    details['deal_templates'] = [{'service_name': menu['name'], **menu['deal']} for menu in menus]
    result['businesses'].append({'source_key': f'provided:{slug}', 'name': name, 'category': categories[shop['구분']], 'address': f'{area} (예시 지역)', 'latitude': latitude, 'longitude': longitude, 'number': shop['전화번호'], 'description': shop['샵 설명'], 'source_details': details, 'images': images['representative'], 'services': menus})

output = root / 'src' / 'data' / 'provided-catalog.json'
output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
manifest_path = root / 'supabase' / 'source' / 'provided-assets-manifest.json'
manifest_path.parent.mkdir(parents=True, exist_ok=True)
manifest_path.write_text(json.dumps(assets, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
payload = json.dumps(result['businesses'], ensure_ascii=False)
sql = """-- Supplied catalog import. Run in the Supabase SQL editor as the project owner.
-- Preserves existing businesses, bookings and user data. Safe to rerun.
-- No active deals are created from undated sample times.
begin;
alter table public.businesses add column if not exists source_key text;
alter table public.businesses add column if not exists source_details jsonb;
create unique index if not exists businesses_source_key_unique on public.businesses(source_key);
alter table public.services add column if not exists source_key text;
alter table public.services add column if not exists display_duration_minutes integer;
alter table public.services add column if not exists source_details jsonb;
create unique index if not exists services_source_key_unique on public.services(source_key);
create table if not exists public.provided_deal_templates (
  source_key text primary key,
  business_id bigint not null references public.businesses(id),
  service_id bigint not null references public.services(id),
  start_time time not null, end_time time not null,
  original_price bigint not null, deal_price bigint not null,
  remaining_capacity integer not null, source_details jsonb not null,
  check (original_price > 0 and deal_price > 0 and deal_price <= original_price),
  check (remaining_capacity >= 0)
);
alter table public.provided_deal_templates enable row level security;
drop policy if exists provided_templates_public_read on public.provided_deal_templates;
create policy provided_templates_public_read on public.provided_deal_templates for select using (true);
grant select on public.provided_deal_templates to anon, authenticated;
do $import$
declare
  shop jsonb; menu jsonb; photo jsonb; shop_id bigint; menu_id bigint;
begin
  for shop in select value from jsonb_array_elements($catalog$PAYLOAD$catalog$::jsonb) loop
    insert into public.businesses(source_key,name,address,number,description,latitude,longitude,source_details)
    values(shop->>'source_key',shop->>'name',shop->>'address',shop->>'number',shop->>'description',
      (shop->>'latitude')::double precision,(shop->>'longitude')::double precision,shop->'source_details')
    on conflict(source_key) do update set name=excluded.name,address=excluded.address,number=excluded.number,
      description=excluded.description,latitude=excluded.latitude,longitude=excluded.longitude,source_details=excluded.source_details
    returning id into shop_id;
    if not exists(select 1 from public.business_category where business_id=shop_id and category::text=shop->>'category') then
      execute format('insert into public.business_category(business_id,category) values($1,%L)',shop->>'category') using shop_id;
    end if;
    for photo in select value from jsonb_array_elements(shop->'images') loop
      insert into public.business_images(business_id,img_url)
        select shop_id,photo#>>'{}'
        where not exists(select 1 from public.business_images where business_id=shop_id and img_url=photo#>>'{}');
    end loop;
    for menu in select value from jsonb_array_elements(shop->'services') loop
      insert into public.services(source_key,business_id,name,description,price,duration_minutes,display_duration_minutes,source_details)
      values(menu->>'source_key',shop_id,menu->>'name',menu->>'description',(menu->>'price')::bigint,
        (menu->>'duration_minutes')::smallint,(menu->>'display_duration_minutes')::integer,menu->'source_details')
      on conflict(source_key) do update set name=excluded.name,description=excluded.description,price=excluded.price,
        duration_minutes=excluded.duration_minutes,display_duration_minutes=excluded.display_duration_minutes,source_details=excluded.source_details
      returning id into menu_id;
      insert into public.provided_deal_templates(source_key,business_id,service_id,start_time,end_time,original_price,deal_price,remaining_capacity,source_details)
      values(menu->>'source_key',shop_id,menu_id,(menu->'deal'->>'start_time')::time,(menu->'deal'->>'end_time')::time,
        (menu->'deal'->>'original_price')::bigint,(menu->'deal'->>'deal_price')::bigint,(menu->'deal'->>'capacity')::integer,menu->'deal')
      on conflict(source_key) do update set start_time=excluded.start_time,end_time=excluded.end_time,
        original_price=excluded.original_price,deal_price=excluded.deal_price,remaining_capacity=excluded.remaining_capacity,source_details=excluded.source_details;
    end loop;
  end loop;
end;
$import$;
commit;
select 'provided businesses' as item,count(*) from public.businesses where source_key like 'provided:%'
union all select 'provided services',count(*) from public.services where source_key like 'provided:%'
union all select 'provided deal templates',count(*) from public.provided_deal_templates;
""".replace('PAYLOAD', payload)
(root / 'supabase' / 'import_provided_catalog.sql').write_text(sql, encoding='utf8')
print(json.dumps({'businesses': len(shops), 'services': len(services), 'reviews': len(reviews), 'images': len(assets), 'representatives': sum(len(b['images']) for b in result['businesses']), 'reviewImages': sum(len(b['source_details']['review_images']) for b in result['businesses']), 'sql': 'supabase/import_provided_catalog.sql'}, ensure_ascii=False))
