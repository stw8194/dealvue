const LOCATION_CACHE_KEY = "dealvue-current-location";
const LOCATION_CACHE_DURATION = 6 * 60 * 60 * 1000;

type CachedLocation = {
  label: string;
  latitude: number;
  longitude: number;
  expiresAt: number;
};

type ReverseGeocodingAddress = {
  city?: string;
  province?: string;
  state?: string;
  borough?: string;
  city_district?: string;
  county?: string;
  suburb?: string;
};

type ReverseGeocodingResponse = {
  address?: ReverseGeocodingAddress;
};

export type CurrentLocation = Pick<
  CachedLocation,
  "label" | "latitude" | "longitude"
>;

let pendingLocationRequest: Promise<CurrentLocation> | null = null;

function normalizeRegionName(region: string) {
  return region
    .replace(/특별자치시$|특별시$|광역시$/, "")
    .replace(/특별자치도$|도$/, "");
}

function createLocationLabel(address: ReverseGeocodingAddress) {
  const region = address.city ?? address.province ?? address.state;
  const district =
    address.borough ??
    address.city_district ??
    address.county ??
    address.suburb;

  const parts = [region ? normalizeRegionName(region) : null, district].filter(
    (part, index, values): part is string =>
      Boolean(part) && values.indexOf(part) === index,
  );

  return parts.join(" ") || "현재 위치";
}

function getCoordinates() {
  return new Promise<GeolocationCoordinates>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("이 브라우저에서는 위치 정보를 지원하지 않습니다."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("위치 권한이 필요합니다."));
          return;
        }

        reject(new Error("현재 위치를 확인할 수 없습니다."));
      },
      {
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000,
        timeout: 10_000,
      },
    );
  });
}

async function reverseGeocode(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(latitude),
    lon: String(longitude),
    zoom: "14",
    addressdetails: "1",
    "accept-language": "ko",
  });
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error("현재 위치의 주소를 확인할 수 없습니다.");
  }

  const data = (await response.json()) as ReverseGeocodingResponse;
  return createLocationLabel(data.address ?? {});
}

export function getCachedCurrentLocation(): CurrentLocation | null {
  try {
    const cachedValue = window.localStorage.getItem(LOCATION_CACHE_KEY);
    if (!cachedValue) return null;

    const cachedLocation = JSON.parse(cachedValue) as CachedLocation;
    if (cachedLocation.expiresAt <= Date.now()) {
      window.localStorage.removeItem(LOCATION_CACHE_KEY);
      return null;
    }

    return cachedLocation;
  } catch {
    return null;
  }
}

export function requestCurrentLocation() {
  if (pendingLocationRequest) return pendingLocationRequest;

  pendingLocationRequest = getCoordinates()
    .then(async ({ latitude, longitude }) => {
      const label = await reverseGeocode(latitude, longitude);
      const location = { label, latitude, longitude };

      try {
        window.localStorage.setItem(
          LOCATION_CACHE_KEY,
          JSON.stringify({
            ...location,
            expiresAt: Date.now() + LOCATION_CACHE_DURATION,
          } satisfies CachedLocation),
        );
      } catch {
        // The location still works when browser storage is unavailable.
      }

      return location;
    })
    .finally(() => {
      pendingLocationRequest = null;
    });

  return pendingLocationRequest;
}
