import { getSupabaseClient } from "@/api/supabase";

export type NearbyBusiness = {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
};

export type NearbySearchBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

type NearbyBusinessRow = {
  id: number;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

export async function requestNearbyBusinesses(
  bounds: NearbySearchBounds,
): Promise<NearbyBusiness[]> {
  const client = getSupabaseClient();
  const pageSize = 1000;
  const rows: NearbyBusinessRow[] = [];

  for (let page = 0; ; page += 1) {
    const { data, error } = await client
      .from("businesses")
      .select("id, name, address, latitude, longitude")
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

  return rows.flatMap((business) => {
    if (business.latitude === null || business.longitude === null) return [];

    return [
      {
        ...business,
        latitude: business.latitude,
        longitude: business.longitude,
      },
    ];
  });
}
