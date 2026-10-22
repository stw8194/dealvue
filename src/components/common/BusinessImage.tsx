import { Store } from "lucide-react";
import { useState } from "react";

export default function BusinessImage({ src, className = "" }: { src?: string | null; className?: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return <span className={`relative block overflow-hidden bg-[#fff2f6] ${className}`}>
    {src && failedSource !== src
      ? <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setFailedSource(src)} />
      : <span className="grid h-full w-full place-items-center text-[#c6577c]"><Store className="h-7 w-7" strokeWidth={1.5} /></span>}
  </span>;
}
