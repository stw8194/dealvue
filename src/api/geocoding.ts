import { loadKakaoMaps } from "@/api/kakaoMap";

type Coordinates = { latitude: number; longitude: number };
const addressRequests = new Map<string, Promise<Coordinates | null>>();

export function geocodeBusinessAddress(address: string): Promise<Coordinates | null> {
  const normalized = address.normalize("NFC").trim().replace(/\s+/g, " ");
  if (!normalized) return Promise.resolve(null);
  const cached = addressRequests.get(normalized);
  if (cached) return cached;

  const request = loadKakaoMaps().then((maps) => new Promise<Coordinates | null>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("매장 주소 검색 시간이 초과되었습니다. 다시 시도해 주세요.")), 10000);
    // The SDK encodes the raw Korean address. Pre-encoding here would encode it twice.
    new maps.services.Geocoder().addressSearch(normalized, (results, status) => {
      window.clearTimeout(timer);
      if (status === maps.services.Status.ZERO_RESULT) return resolve(null);
      if (status !== maps.services.Status.OK) {
        reject(new Error("매장 주소를 검색하지 못했습니다. 다시 시도해 주세요."));
        return;
      }
      // Region centers (e.g. just "강남구") are not a business's exact location.
      const result = results.find((item) => item.address_type === "ROAD_ADDR" || item.address_type === "REGION_ADDR");
      if (!result) return resolve(null);
      const latitude = Number(result.y);
      const longitude = Number(result.x);
      resolve(Number.isFinite(latitude) && Number.isFinite(longitude)
        && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
        ? { latitude, longitude } : null);
    });
  })).catch((error: unknown) => {
    addressRequests.delete(normalized);
    throw error;
  });
  addressRequests.set(normalized, request);
  return request;
}
