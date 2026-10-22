import ChoiceGroup from "@/components/common/ChoiceGroup";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCachedCurrentLocation, requestCurrentLocation, saveManualLocation } from "@/api/location";
import { Page } from "./ui";

const REGIONS = [
  { label: "서울 강남구", latitude: 37.5172, longitude: 127.0473 },
  { label: "서울 마포구", latitude: 37.5663, longitude: 126.9019 },
  { label: "서울 종로구", latitude: 37.573, longitude: 126.9794 },
  { label: "부산 해운대구", latitude: 35.1631, longitude: 129.1635 },
];

export default function LocationPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(() => {
    const cached = getCachedCurrentLocation();
    return REGIONS.some((region) => region.label === cached?.label) ? cached!.label : REGIONS[0].label;
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const current = async () => {
    setLoading(true);
    setMessage("");
    try { await requestCurrentLocation(); navigate("/nearby"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "위치를 확인하지 못했습니다."); }
    finally { setLoading(false); }
  };
  return <Page title="동네 설정">
    <p className="text-sm">위치 권한을 허용하거나 동네를 직접 선택하세요.</p>
    <button type="button" disabled={loading} onClick={() => void current()} className="rounded-lg border border-page-border px-4 py-3">{loading ? "위치 확인 중" : "현재 위치 사용"}</button>
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault();
      const region = REGIONS.find((item) => item.label === selected);
      if (!region) { setMessage("목록에서 동네를 선택해 주세요."); return; }
      try { saveManualLocation(region); navigate("/nearby"); }
      catch { setMessage("브라우저 저장소를 사용할 수 없습니다."); }
    }}>
      <ChoiceGroup label="동네 선택" value={selected} onChange={setSelected} layout="cards" options={REGIONS.map(region => ({ value: region.label, label: region.label }))} />
      <p className="text-xs">현재 동네 선택은 위 네 지역으로 제공하며, 지도 이동 후 재검색도 가능합니다.</p>
      <button className="rounded-lg bg-accent px-4 py-3 text-white">이 동네로 설정</button>
    </form>
    {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
  </Page>;
}
