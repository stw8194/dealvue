import { useEffect, useMemo, useState } from "react";
import type { ConsumerDeal } from "./types";
import { requestConsumerCatalog } from "./catalogData";
import { applyDealRotation, currentRotationRound } from "./dealSchedule";
export { requestConsumerCatalog };

export function useConsumerCatalog() {
  const [round, setRound] = useState(() => currentRotationRound(Date.now()));
  const [result, setResult] = useState<{ deals: ConsumerDeal[]; error: string | null; ready: boolean }>({ deals: [], error: null, ready: false });
  useEffect(() => {
    let current = true;
    void requestConsumerCatalog().then(
      (deals) => { if (current) setResult({ deals, error: null, ready: true }); },
      (error: unknown) => { if (current) setResult({ deals: [], error: error instanceof Error ? error.message : "타임딜을 불러오지 못했습니다.", ready: true }); },
    );
    return () => { current = false; };
  }, []);
  useEffect(() => {
    const update = () => {
      const next = currentRotationRound(Date.now());
      setRound(current => current.index === next.index ? current : next);
    };
    const timer = window.setInterval(update, 1000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  const deals = useMemo(() => applyDealRotation(result.deals, round.start), [result.deals, round]);
  return { deals, loading: !result.ready, error: result.error };
}
