import { BACKDROPS, backdropStyle, type BackdropId } from "./data";
import CollectionScenery from "./CollectionScenery";
export function BackdropThumbnail({ id }: { id: BackdropId }) {
  const item = BACKDROPS.find(item => item.id === id)!;
  return <span className={`backdrop-thumbnail backdrop-${id}`} style={backdropStyle(id)}><span>{item.icon}</span><i /><i /></span>;
}
export function StudioBackdrop({ id }: { id: BackdropId }) {
  return <svg className={`studio-scenery scenery-${id}`} viewBox="0 0 512 768" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <CollectionScenery id={id} />
    {(id === "peach" || id === "sunset") && <>{[ [58, 151], [357, 89], [324, 365] ].map(([x, y], i) => <g key={x} transform={`translate(${x} ${y}) scale(${i === 2 ? .75 : 1})`} fill="#fff" opacity=".42"><circle cx="24" cy="25" r="27" /><circle cx="57" cy="14" r="34" /><circle cx="92" cy="27" r="23" /><rect y="25" width="112" height="28" rx="14" /></g>)}{id === "sunset" && <circle cx="452" cy="199" r="85" fill="#ffedb9" opacity=".7" />}</>}
    {id === "cherry" && <><path d="M-30 360q135-280 165-302M540 403Q412 110 377 35" stroke="#bb719069" strokeWidth="8" fill="none" />{Array.from({ length: 16 }, (_, i) => <g key={i} transform={`translate(${i % 2 ? 405 + i % 4 * 14 : 37 + i % 4 * 13} ${75 + i * 25}) rotate(${i * 17})`} opacity=".7">{[0, 1, 2, 3, 4].map(p => <ellipse key={p} cx="0" cy="-12" rx="8" ry="12" transform={`rotate(${p * 72})`} fill={i % 3 ? "#fff2f8" : "#efa3c8"} />)}<circle r="4" fill="#ffe49a" /></g>)}</>}
    {id === "garden" && <><path d="M-15 560q130-80 275 4t267-13v235H-15" fill="#89cbae45" />{Array.from({ length: 12 }, (_, i) => <g key={i} transform={`translate(${15 + i * 45} ${602 + i % 3 * 26})`} opacity=".8"><path d="M0 35V0m0 17q-15-17-18-1 12 9 18 1m0 7q15-17 18-1-12 9-18 1" stroke="#73b18b" strokeWidth="2" fill="#a6d6a1" /><path d="M-10-3 0-12 10-3 6 9-6 9z" fill="#fff7cd" /><circle r="4" fill="#e2bd55" /></g>)}</>}
    {id === "starlight" && <><path d="M98 68q-70 5-52 64 17 44 60 14-52-12-35-52 6-16 27-26z" fill="#ffe8a4" /><path d="M0 490 91 302 182 490v280H0m332 0 90-231 90 231v280H332" fill="#7b5d9b20" />{Array.from({ length: 22 }, (_, i) => <path className="scene-star" key={i} d="m0-6 2 4 4 2-4 2-2 4-2-4-4-2 4-2z" transform={`translate(${25 + i * 83 % 470} ${46 + i * 47 % 440})`} fill="#fff1bf" opacity={.35 + i % 3 * .2} style={{ animationDelay: `${-i * .3}s` }} />)}</>}
    {id === "snowfall" && <>{Array.from({ length: 20 }, (_, i) => <g key={i} className="scene-snow" style={{ animationDelay: `${-i * .4}s` }} transform={`translate(${20 + i * 73 % 473} ${38 + i * 79 % 665})`} stroke="#fff" strokeWidth="1.6" opacity=".65"><path d="M0-9v18m-8-4L8 5m-8 0-8-10m8-3-3 3 3 3m-6 7 4-1-1-4m8 6-4-1 1-4" /></g>)}</>}
    {id === "atelier" && <><rect x="42" y="81" width="175" height="249" rx="80" fill="#fff9" stroke="#fff" strokeWidth="6" /><path d="M130 88v241M44 195h171" stroke="#d9c9b2" strokeWidth="5" /><path d="M346 103v460M363 103v460M380 103v460M397 103v460M414 103v460M431 103v460" stroke="#fff7" strokeWidth="9" /><path d="M26 547h176v13H26" fill="#c9a78a" /><path d="m62 516 8 31h27l8-31z" fill="#e5bea6" /><path d="M84 515v-44m0 27q-32-6-14-25 22 5 14 25m0-3q32-6 14-25-22 5-14 25" fill="#b0c69d" stroke="#95ac82" strokeWidth="2" /></>}
    {id === "lavender" && <>{[ [45, 190], [450, 272], [57, 470], [422, 593] ].map(([x, y]) => <path key={x} transform={`translate(${x} ${y})`} d="m0-9 3 6 6 3-6 3-3 6-3-6-6-3 6-3z" fill="#bc8ac9" opacity=".55" />)}</>}
  </svg>;
}
