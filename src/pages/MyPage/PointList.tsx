import { useEffect, useState } from "react";
import { requestPointHistory } from "@/api/mypage";
import type { PointHistory } from "@/type/mypage";

export default function PointList() {
  const [history, setHistory] = useState<PointHistory[]>([]);

  useEffect(() => {
    requestPointHistory().then(data => {
      if (data) setHistory(data);
    });
  }, []);

  return (
    <ul className="flex flex-col gap-3 px-4 py-4">
      {history.map(point => (
        <li key={point.id} className="flex items-center justify-between border-b border-page-border pb-3">
          <div>
            <p className="text-sm text-page-heading">{point.reason}</p>
            <p className="text-xs text-page-text">{point.createdAt}</p>
          </div>
          <p className="text-sm font-semibold text-accent">{point.amount > 0 ? `+${point.amount}` : point.amount}P</p>
        </li>
      ))}
    </ul>
  );
}
