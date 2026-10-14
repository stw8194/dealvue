import { getSupabaseClient } from "@/api/supabase";
import { geocodeBusinessAddress } from "@/api/geocoding";
import type { ServiceCategory } from "@/type/package";

export type NearbyBusiness = {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  categories: ServiceCategory[];
  imageUrl: string | null;
  timeDeals: { remaining_capacity: number; end_at: string | null }[];
};

export type NearbySearchBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export function hasActiveNearbyDeal(business: NearbyBusiness, now: number) {
  return business.timeDeals.some((deal) => deal.remaining_capacity > 0
    && (!deal.end_at || new Date(deal.end_at).getTime() > now));
}

type NearbyBusinessRow = {
  id: number;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  business_category: { category: ServiceCategory }[] | null;
  business_images: { img_url: string }[] | null;
  time_deals: { remaining_capacity: number; end_at: string | null }[] | null;
};

const BUSINESS_FIELDS = "id, name, address, latitude, longitude, business_category(category), business_images(img_url), time_deals(remaining_capacity, end_at)";

function imageUrl(path: string | undefined) {
  if (!path?.trim()) return null;
  const value = path.trim();
  if (/^https?:\/\//i.test(value)) return value;
  return getSupabaseClient().storage
    .from(import.meta.env.VITE_SUPABASE_BUSINESS_IMAGES_BUCKET ?? "businesses")
    .getPublicUrl(value).data.publicUrl;
}

export async function requestNearbyBusinesses(
  bounds: NearbySearchBounds,
): Promise<NearbyBusiness[]> {
  const client = getSupabaseClient();
  const pageSize = 1000;
  const rows: NearbyBusinessRow[] = [];

  for (let page = 0; ; page += 1) {
    const { data, error } = await client
      .from("businesses")
      .select(BUSINESS_FIELDS)
      .gte("latitude", bounds.south)
      .lte("latitude", bounds.north)
      .gte("longitude", bounds.west)
      .lte("longitude", bounds.east)
      .order("id", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw new Error(error.message);

    const pageRows = (data ?? []) as NearbyBusinessRow[];
    rows.push(...pageRows);
    if (pageRows.length < pageSize) break;
  }

  // Coordinate comparisons exclude NULL rows, so resolve their addresses separately.
  for (let page = 0; ; page += 1) {
    const { data, error } = await client.from("businesses")
      .select(BUSINESS_FIELDS)
      .or("latitude.is.null,longitude.is.null")
      .order("id", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) throw new Error(error.message);
    const missingRows = (data ?? []) as NearbyBusinessRow[];
    // Sequential requests and address caching avoid bursts for shared addresses.
    for (const business of missingRows) {
      const coordinates = await geocodeBusinessAddress(business.address ?? "");
      if (coordinates) rows.push({ ...business, ...coordinates });
    }
    if (missingRows.length < pageSize) break;
  }

  return rows.flatMap((business) => {
    if (business.latitude === null || business.longitude === null
      || !Number.isFinite(business.latitude) || !Number.isFinite(business.longitude)
      || business.latitude < bounds.south || business.latitude > bounds.north
      || business.longitude < bounds.west || business.longitude > bounds.east) return [];
    return [
      {
        ...business,
        latitude: business.latitude,
        longitude: business.longitude,
        categories: (business.business_category ?? []).map((item) => item.category),
        imageUrl: imageUrl(business.business_images?.[0]?.img_url),
        timeDeals: business.time_deals ?? [],
      },
    ];
  });
}
