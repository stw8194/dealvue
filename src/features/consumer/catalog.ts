import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { requestConsumerCatalog } from "./catalogData";
import { applyDealRotation, currentRotationRound } from "./dealSchedule";
import { createSharedQuery } from "./sharedQuery";
export { requestConsumerCatalog };

const catalogQuery = createSharedQuery(requestConsumerCatalog);
const EMPTY_DEALS: import("./types").ConsumerDeal[] = [];

export function useConsumerCatalog() {
  const [round, setRound] = useState(() => currentRotationRound(Date.now()));
  const result = useSyncExternalStore(catalogQuery.subscribe, catalogQuery.getSnapshot);
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
  const deals = useMemo(() => applyDealRotation(result.data ?? EMPTY_DEALS, round.start), [result.data, round]);
  return { deals, loading: !result.ready, error: result.data === undefined ? result.error : null, refreshError: result.data !== undefined ? result.error : null, retry: catalogQuery.retry };
}
