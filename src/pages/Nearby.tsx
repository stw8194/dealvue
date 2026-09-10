import { useCallback, useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, Minus, Plus, RefreshCw, X } from "lucide-react";
import { getCachedCurrentLocation } from "@/api/location";
import {
  loadKakaoMaps,
  type KakaoCircleInstance,
  type KakaoCustomOverlayInstance,
  type KakaoMapInstance,
  type KakaoMaps,
  type KakaoMarkerInstance,
} from "@/api/kakaoMap";
import {
  requestNearbyBusinesses,
  type NearbyBusiness,
  type NearbySearchBounds,
} from "@/api/nearby";
import Header from "@/components/layout/Header";

const DEFAULT_LOCATION = {
  label: "서울시청",
  latitude: 37.566826,
  longitude: 126.9786567,
};

type TrackedPosition = {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number | null;
};

type MapSnapshot = {
  latitude: number;
  longitude: number;
  level: number;
};

type CompassOrientationEvent = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
};

type OrientationPermissionConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: (
    absolute?: boolean,
  ) => Promise<"granted" | "denied">;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "요청을 처리하지 못했습니다.";
}

function getGeolocationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "현재 위치를 표시하려면 위치 권한이 필요합니다.";
  }

  if (error.code === error.TIMEOUT) {
    return "현재 위치 확인 시간이 초과되었습니다.";
  }

  return "현재 위치를 확인하지 못했습니다.";
}

function getMapBounds(map: KakaoMapInstance): NearbySearchBounds {
  const bounds = map.getBounds();
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();

  return {
    south: southWest.getLat(),
    west: southWest.getLng(),
    north: northEast.getLat(),
    east: northEast.getLng(),
  };
}

function getMapSnapshot(map: KakaoMapInstance): MapSnapshot {
  const center = map.getCenter();

  return {
    latitude: center.getLat(),
    longitude: center.getLng(),
    level: map.getLevel(),
  };
}

function hasSnapshotChanged(previous: MapSnapshot, current: MapSnapshot) {
  return (
    previous.level !== current.level ||
    Math.abs(previous.latitude - current.latitude) > 0.000001 ||
    Math.abs(previous.longitude - current.longitude) > 0.000001
  );
}

function createCurrentLocationElement() {
  const element = document.createElement("div");
  const marker = document.createElement("div");
  const arrow = document.createElement("div");

  element.setAttribute("aria-hidden", "true");
  Object.assign(element.style, {
    alignItems: "center",
    display: "flex",
    height: "48px",
    justifyContent: "center",
    pointerEvents: "none",
    width: "48px",
  });
  Object.assign(marker.style, {
    alignItems: "center",
    background: "#1677f2",
    border: "4px solid #ffffff",
    borderRadius: "50%",
    boxShadow: "0 2px 10px rgb(0 0 0 / 35%)",
    display: "flex",
    height: "40px",
    justifyContent: "center",
    width: "40px",
  });
  Object.assign(arrow.style, {
    background: "#ffffff",
    clipPath: "polygon(50% 4%, 84% 88%, 50% 70%, 16% 88%)",
    height: "24px",
    transform: "rotate(0deg)",
    transformOrigin: "50% 50%",
    transition: "transform 120ms linear",
    width: "20px",
  });

  marker.appendChild(arrow);
  element.appendChild(marker);

  return { arrow, element };
}

async function requestOrientationPermission() {
  if (typeof DeviceOrientationEvent === "undefined") return;

  const OrientationEvent =
    DeviceOrientationEvent as OrientationPermissionConstructor;

  if (typeof OrientationEvent.requestPermission === "function") {
    await OrientationEvent.requestPermission(true);
  }
}

export default function Nearby() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapsRef = useRef<KakaoMaps | null>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const currentLocationOverlayRef =
    useRef<KakaoCustomOverlayInstance | null>(null);
  const currentAccuracyCircleRef = useRef<KakaoCircleInstance | null>(null);
  const currentArrowRef = useRef<HTMLDivElement | null>(null);
  const salonMarkersRef = useRef<KakaoMarkerInstance[]>([]);
  const latestPositionRef = useRef<TrackedPosition | null>(null);
  const lastSearchSnapshotRef = useRef<MapSnapshot | null>(null);
  const mapIdleHandlerRef = useRef<(() => void) | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const centerOnNextPositionRef = useRef(true);
  const initialSearchCompletedRef = useRef(false);
  const searchInFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const [businesses, setBusinesses] = useState<NearbyBusiness[]>([]);
  const [selectedBusiness, setSelectedBusiness] =
    useState<NearbyBusiness | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasMapMoved, setHasMapMoved] = useState(false);
  const [hasCompletedSearch, setHasCompletedSearch] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [businessError, setBusinessError] = useState<string | null>(null);

  const updateHeading = useCallback((heading: number | null) => {
    if (heading === null || !Number.isFinite(heading)) return;
    if (currentArrowRef.current) {
      currentArrowRef.current.style.transform = `rotate(${heading}deg)`;
    }
  }, []);

  const updateCurrentPosition = useCallback(
    (
      trackedPosition: TrackedPosition,
      centerMode: "none" | "pan" | "set" = "none",
    ) => {
      const maps = mapsRef.current;
      const map = mapRef.current;
      if (!maps || !map) return;

      latestPositionRef.current = trackedPosition;
      const position = new maps.LatLng(
        trackedPosition.latitude,
        trackedPosition.longitude,
      );

      if (currentLocationOverlayRef.current) {
        currentLocationOverlayRef.current.setPosition(position);
        currentLocationOverlayRef.current.setMap(map);
      } else {
        const { arrow, element } = createCurrentLocationElement();
        currentArrowRef.current = arrow;
        currentLocationOverlayRef.current = new maps.CustomOverlay({
          content: element,
          map,
          position,
          xAnchor: 0.5,
          yAnchor: 0.5,
          zIndex: 10,
        });
      }

      if (currentAccuracyCircleRef.current) {
        currentAccuracyCircleRef.current.setPosition(position);
        currentAccuracyCircleRef.current.setRadius(
          Math.min(trackedPosition.accuracy, 1000),
        );
        currentAccuracyCircleRef.current.setMap(map);
      } else {
        currentAccuracyCircleRef.current = new maps.Circle({
          center: position,
          fillColor: "#1677f2",
          fillOpacity: 0.1,
          map,
          radius: Math.min(trackedPosition.accuracy, 1000),
          strokeColor: "#1677f2",
          strokeOpacity: 0.32,
          strokeWeight: 1,
        });
      }

      updateHeading(trackedPosition.heading);
      setLocationError(null);
      setIsLocating(false);

      if (centerMode === "pan") map.panTo(position);
      if (centerMode === "set") map.setCenter(position);
    },
    [updateHeading],
  );

  const searchCurrentMapArea = useCallback(async () => {
    const maps = mapsRef.current;
    const map = mapRef.current;
    if (!maps || !map || searchInFlightRef.current) return;

    const bounds = getMapBounds(map);
    const searchedSnapshot = getMapSnapshot(map);
    searchInFlightRef.current = true;
    setIsSearching(true);
    setBusinessError(null);

    try {
      const nearbyBusinesses = await requestNearbyBusinesses(bounds);
      if (!mountedRef.current) return;

      salonMarkersRef.current.forEach((marker) => marker.setMap(null));
      salonMarkersRef.current = nearbyBusinesses.map((business) => {
        const marker = new maps.Marker({
          clickable: true,
          map,
          position: new maps.LatLng(business.latitude, business.longitude),
          title: business.name,
        });

        maps.event.addListener(marker, "click", () => {
          if (mountedRef.current) setSelectedBusiness(business);
        });
        return marker;
      });

      lastSearchSnapshotRef.current = searchedSnapshot;
      initialSearchCompletedRef.current = true;
      setBusinesses(nearbyBusinesses);
      setSelectedBusiness(null);
      setHasCompletedSearch(true);
      setHasMapMoved(
        hasSnapshotChanged(searchedSnapshot, getMapSnapshot(map)),
      );
    } catch (error) {
      if (mountedRef.current) setBusinessError(getErrorMessage(error));
    } finally {
      searchInFlightRef.current = false;
      if (mountedRef.current) setIsSearching(false);
    }
  }, []);

  const centerOnCurrentPosition = useCallback(async () => {
    try {
      await requestOrientationPermission();
    } catch {
      // The location marker still works without compass permission.
    }

    if (latestPositionRef.current) {
      updateCurrentPosition(latestPositionRef.current, "pan");
      return;
    }

    if (!navigator.geolocation) {
      setLocationError("이 브라우저에서는 위치 기능을 지원하지 않습니다.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateCurrentPosition(
          {
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          "pan",
        );
      },
      (error) => {
        if (!mountedRef.current) return;
        setLocationError(getGeolocationErrorMessage(error));
        setIsLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15_000 },
    );
  }, [updateCurrentPosition]);

  const changeZoom = (difference: number) => {
    const map = mapRef.current;
    if (!map) return;

    const nextLevel = Math.min(14, Math.max(1, map.getLevel() + difference));
    map.setLevel(nextLevel, { animate: true });
  };

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    const handleOrientation = (event: Event) => {
      const orientation = event as CompassOrientationEvent;
      const webkitHeading = orientation.webkitCompassHeading;
      const standardHeading =
        orientation.alpha !== null &&
        (orientation.absolute || event.type === "deviceorientationabsolute")
          ? (360 - orientation.alpha) % 360
          : null;

      updateHeading(
        typeof webkitHeading === "number" ? webkitHeading : standardHeading,
      );
    };

    async function initializeMap() {
      try {
        const maps = await loadKakaoMaps();
        if (cancelled || !containerRef.current) return;

        const cachedLocation = getCachedCurrentLocation();
        const initialLocation = cachedLocation ?? DEFAULT_LOCATION;
        const center = new maps.LatLng(
          initialLocation.latitude,
          initialLocation.longitude,
        );
        const map = new maps.Map(containerRef.current, { center, level: 5 });

        mapsRef.current = maps;
        mapRef.current = map;
        setIsMapLoading(false);

        const handleMapIdle = () => {
          const lastSearchSnapshot = lastSearchSnapshotRef.current;
          setHasMapMoved(
            lastSearchSnapshot
              ? hasSnapshotChanged(lastSearchSnapshot, getMapSnapshot(map))
              : false,
          );
        };
        mapIdleHandlerRef.current = handleMapIdle;
        maps.event.addListener(map, "idle", handleMapIdle);

        if (cachedLocation) {
          centerOnNextPositionRef.current = false;
          updateCurrentPosition(
            {
              accuracy: 20,
              heading: null,
              latitude: cachedLocation.latitude,
              longitude: cachedLocation.longitude,
            },
          );
          void searchCurrentMapArea();
        }

        if (navigator.geolocation) {
          setIsLocating(true);
          watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
              if (!mountedRef.current) return;

              const shouldCenter = centerOnNextPositionRef.current;
              centerOnNextPositionRef.current = false;
              updateCurrentPosition(
                {
                  accuracy: position.coords.accuracy,
                  heading: position.coords.heading,
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                },
                shouldCenter ? "set" : "none",
              );

              if (shouldCenter && !initialSearchCompletedRef.current) {
                void searchCurrentMapArea();
              }
            },
            (error) => {
              if (!mountedRef.current) return;
              setLocationError(getGeolocationErrorMessage(error));
              setIsLocating(false);

              if (!initialSearchCompletedRef.current) {
                void searchCurrentMapArea();
              }
            },
            {
              enableHighAccuracy: true,
              maximumAge: 1000,
              timeout: 15_000,
            },
          );
        } else {
          setLocationError("이 브라우저에서는 위치 기능을 지원하지 않습니다.");
          void searchCurrentMapArea();
        }
      } catch (error) {
        if (!cancelled) {
          setMapError(getErrorMessage(error));
          setIsMapLoading(false);
        }
      }
    }

    void initializeMap();

    const handleResize = () => mapRef.current?.relayout();
    window.addEventListener("resize", handleResize);
    window.addEventListener("deviceorientation", handleOrientation);
    window.addEventListener("deviceorientationabsolute", handleOrientation);

    return () => {
      cancelled = true;
      mountedRef.current = false;
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener("deviceorientationabsolute", handleOrientation);

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      const maps = mapsRef.current;
      const map = mapRef.current;
      const mapIdleHandler = mapIdleHandlerRef.current;
      if (maps && map && mapIdleHandler) {
        maps.event.removeListener(map, "idle", mapIdleHandler);
      }

      salonMarkersRef.current.forEach((marker) => marker.setMap(null));
      currentLocationOverlayRef.current?.setMap(null);
      currentAccuracyCircleRef.current?.setMap(null);
      salonMarkersRef.current = [];
      currentLocationOverlayRef.current = null;
      currentAccuracyCircleRef.current = null;
      currentArrowRef.current = null;
      mapIdleHandlerRef.current = null;
      mapRef.current = null;
      mapsRef.current = null;
    };
  }, [searchCurrentMapArea, updateCurrentPosition, updateHeading]);

  return (
    <main className="h-dvh overflow-hidden bg-[#f3f4f6] pb-16">
      <Header title="내 주변" />
      <section className="relative h-[calc(100dvh-7.5rem)] min-h-80">
        <div ref={containerRef} className="h-full w-full" aria-label="카카오 지도" />

        {!mapError && !isMapLoading && (
          <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2">
            <button
              type="button"
              disabled={!hasMapMoved || isSearching}
              onClick={() => void searchCurrentMapArea()}
              className="flex h-11 w-48 items-center justify-center gap-2 rounded-lg border border-page-border bg-white px-4 text-sm font-bold text-page-heading shadow-lg enabled:cursor-pointer enabled:border-accent enabled:text-accent enabled:hover:bg-pink-50 disabled:cursor-default disabled:text-gray-300"
            >
              <RefreshCw
                className={`h-4 w-4 ${isSearching ? "animate-spin" : ""}`}
              />
              이 위치에서 다시 검색
            </button>
          </div>
        )}

        {hasCompletedSearch && !isSearching && !businessError && (
          <p className="absolute left-1/2 top-[4.25rem] z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-page-heading/85 px-3 py-1 text-xs font-semibold text-white shadow">
            주변 매장 {businesses.length}곳
          </p>
        )}

        {isMapLoading && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-[#f3f4f6]">
            <div className="flex flex-col items-center gap-3 text-sm font-semibold text-page-text">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-accent" />
              지도를 불러오는 중
            </div>
          </div>
        )}

        {mapError && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-[#f3f4f6] px-8 text-center">
            <div>
              <MapPin className="mx-auto h-9 w-9 text-gray-400" />
              <p className="mt-3 font-bold text-page-heading">
                지도를 표시하지 못했습니다
              </p>
              <p className="mt-2 text-sm text-page-text">{mapError}</p>
              <p className="mt-1 text-xs text-gray-400">
                JavaScript 키, 등록 도메인, 카카오맵 사용 설정을 확인해주세요.
              </p>
            </div>
          </div>
        )}

        {(locationError || businessError) && !mapError && (
          <div className="absolute left-4 right-4 top-28 z-10 space-y-1 rounded-lg bg-page-heading/90 px-4 py-3 text-sm text-white shadow-lg">
            {locationError && <p>{locationError}</p>}
            {businessError && <p>주변 매장을 불러오지 못했습니다.</p>}
          </div>
        )}

        {selectedBusiness && !mapError && (
          <article className="absolute bottom-5 left-4 right-20 z-10 rounded-lg border border-page-border bg-white p-4 shadow-xl">
            <button
              type="button"
              aria-label="매장 정보 닫기"
              title="닫기"
              onClick={() => setSelectedBusiness(null)}
              className="absolute right-2 top-2 grid h-8 w-8 cursor-pointer place-items-center text-gray-400 hover:text-page-heading"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="pr-7 text-sm font-black text-page-heading">
              {selectedBusiness.name}
            </p>
            <p className="mt-1 truncate text-xs text-page-text">
              {selectedBusiness.address}
            </p>
          </article>
        )}

        {!mapError && !isMapLoading && (
          <div className="absolute bottom-5 right-4 z-10 overflow-hidden rounded-lg border border-page-border bg-white shadow-lg">
            <button
              type="button"
              aria-label="지도 확대"
              title="지도 확대"
              onClick={() => changeZoom(-1)}
              className="grid h-11 w-11 cursor-pointer place-items-center text-page-heading hover:bg-gray-50"
            >
              <Plus className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="지도 축소"
              title="지도 축소"
              onClick={() => changeZoom(1)}
              className="grid h-11 w-11 cursor-pointer place-items-center border-t border-page-border text-page-heading hover:bg-gray-50"
            >
              <Minus className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="현재 위치로 이동"
              title="현재 위치로 이동"
              disabled={isLocating}
              onClick={() => void centerOnCurrentPosition()}
              className="grid h-11 w-11 cursor-pointer place-items-center border-t border-page-border text-[#1677f2] hover:bg-gray-50 disabled:cursor-wait disabled:text-gray-300"
            >
              <LocateFixed
                className={`h-5 w-5 ${isLocating ? "animate-pulse" : ""}`}
              />
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
