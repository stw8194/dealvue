import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function PlayModal({ title, kind, close, children }: { title: string; kind: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(close);
  useEffect(() => { closeRef.current = close; }, [close]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; dialog.close(); };
  }, []);
  return createPortal(<dialog ref={ref} className={`playground-page play-modal modal-${kind}`} aria-label={title} onCancel={event => { event.preventDefault(); closeRef.current(); }} onClick={event => { if (event.target === event.currentTarget) closeRef.current(); }}>
    <div className="play-modal-inner"><header className="play-modal-header"><span>DEALVUE PLAY</span><strong>{title}</strong><button type="button" aria-label="놀이터 팝업 닫기" onClick={close}><X size={21} /></button></header>{children}</div>
  </dialog>, document.body);
}
