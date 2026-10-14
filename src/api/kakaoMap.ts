export type KakaoLatLng = {
  getLat: () => number;
  getLng: () => number;
};

export type KakaoMapInstance = {
  getBounds: () => KakaoLatLngBounds;
  getCenter: () => KakaoLatLng;
  getLevel: () => number;
  panTo: (position: KakaoLatLng) => void;
  relayout: () => void;
  setBounds: (bounds: KakaoLatLngBounds, padding?: number) => void;
  setCenter: (position: KakaoLatLng) => void;
  setLevel: (level: number, options?: { animate?: boolean }) => void;
};

export type KakaoLatLngBounds = {
  extend: (position: KakaoLatLng) => void;
  getNorthEast: () => KakaoLatLng;
  getSouthWest: () => KakaoLatLng;
};

export type KakaoMarkerInstance = {
  setMap: (map: KakaoMapInstance | null) => void;
  setPosition: (position: KakaoLatLng) => void;
};

export type KakaoCustomOverlayInstance = {
  setMap: (map: KakaoMapInstance | null) => void;
  setPosition: (position: KakaoLatLng) => void;
};

export type KakaoCircleInstance = {
  setMap: (map: KakaoMapInstance | null) => void;
  setPosition: (position: KakaoLatLng) => void;
  setRadius: (radius: number) => void;
};

export type KakaoMaps = {
  services: {
    Status: { OK: string; ZERO_RESULT: string; ERROR: string };
    Geocoder: new () => {
      addressSearch: (
        address: string,
        callback: (results: { x: string; y: string; address_type: string }[], status: string) => void,
      ) => void;
    };
  };
  load: (callback: () => void) => void;
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoLatLngBounds;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level: number },
  ) => KakaoMapInstance;
  Marker: new (options: {
    clickable?: boolean;
    map?: KakaoMapInstance;
    position: KakaoLatLng;
    title?: string;
  }) => KakaoMarkerInstance;
  CustomOverlay: new (options: {
    content: HTMLElement;
    map?: KakaoMapInstance;
    position: KakaoLatLng;
    xAnchor?: number;
    yAnchor?: number;
    zIndex?: number;
  }) => KakaoCustomOverlayInstance;
  Circle: new (options: {
    center: KakaoLatLng;
    fillColor?: string;
    fillOpacity?: number;
    map?: KakaoMapInstance;
    radius: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
  }) => KakaoCircleInstance;
  event: {
    addListener: (
      target: KakaoMarkerInstance | KakaoMapInstance,
      eventName: string,
      handler: () => void,
    ) => void;
    removeListener: (
      target: KakaoMarkerInstance | KakaoMapInstance,
      eventName: string,
      handler: () => void,
    ) => void;
  };
};

type KakaoSdk = {
  maps: KakaoMaps;
};

declare global {
  interface Window {
    kakao?: KakaoSdk;
  }
}

const KAKAO_MAP_SCRIPT_ID = "kakao-map-sdk";
let kakaoMapsPromise: Promise<KakaoMaps> | null = null;

function waitUntilReady(resolve: (maps: KakaoMaps) => void, reject: (error: Error) => void) {
  const maps = window.kakao?.maps;

  if (!maps) {
    reject(new Error("카카오 지도 SDK를 초기화하지 못했습니다."));
    return;
  }

  maps.load(() => resolve(maps));
}

export function loadKakaoMaps() {
  if (window.kakao?.maps) {
    return new Promise<KakaoMaps>((resolve) => {
      window.kakao?.maps.load(() => resolve(window.kakao!.maps));
    });
  }

  if (kakaoMapsPromise) return kakaoMapsPromise;

  const appKey = import.meta.env.VITE_KAKAO_MAP_JAVASCRIPT_KEY?.trim();
  if (!appKey) {
    return Promise.reject(
      new Error("VITE_KAKAO_MAP_JAVASCRIPT_KEY가 설정되지 않았습니다."),
    );
  }

  const pendingPromise = new Promise<KakaoMaps>((resolve, reject) => {
    const existingScript = document.getElementById(
      KAKAO_MAP_SCRIPT_ID,
    ) as HTMLScriptElement | null;

    const handleLoad = () => waitUntilReady(resolve, reject);
    const handleError = () =>
      reject(new Error("카카오 지도 SDK를 불러오지 못했습니다."));

    if (existingScript) {
      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener("error", handleError, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = KAKAO_MAP_SCRIPT_ID;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false&libraries=services`;
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    document.head.appendChild(script);
  });

  kakaoMapsPromise = pendingPromise.catch((error: unknown) => {
    kakaoMapsPromise = null;
    throw error;
  });

  return kakaoMapsPromise;
}
