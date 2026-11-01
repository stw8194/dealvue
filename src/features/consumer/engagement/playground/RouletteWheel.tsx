import { ROULETTE_REWARDS } from "./data";

const colors = ["#fff7f0", "#ff3985", "#fff7f0", "#783cff", "#fff7f0", "#ff3985", "#fff7f0", "#ffc738"];
function wedge(index: number) {
  const point = (a: number) => [160 + 143 * Math.cos(a * Math.PI / 180), 160 + 143 * Math.sin(a * Math.PI / 180)];
  const [x1, y1] = point(-112.5 + index * 45), [x2, y2] = point(-67.5 + index * 45);
  return `M160 160L${x1} ${y1}A143 143 0 0 1 ${x2} ${y2}Z`;
}
export default function RouletteWheel() {
  return <svg viewBox="0 0 320 320" aria-hidden="true"><circle cx="160" cy="160" r="159" fill="#6223d6" /><circle cx="160" cy="160" r="150" fill="#ffc738" />
    {ROULETTE_REWARDS.map((amount, index) => <g key={index}><path d={wedge(index)} fill={colors[index]} stroke="#ffffff" strokeWidth="1" /><g transform={`translate(160 160) rotate(${index * 45})`}><text x="0" y="-96" textAnchor="middle" fill={index === 7 ? "#542498" : index % 2 ? "#fff" : "#6923c6"} fontSize="29" fontWeight="850">{amount}<tspan fontSize="13" dx="2">P</tspan></text><path d="M0-132 2-128 6-126 2-124 0-120-2-124-6-126-2-128z" fill={index % 2 ? "#ffffffb0" : "#b782fb"} /></g></g>)}
    {Array.from({ length: 24 }, (_, i) => <circle key={i} cx={160 + 153 * Math.sin(i * Math.PI / 12)} cy={160 - 153 * Math.cos(i * Math.PI / 12)} r="2.6" fill="#ffe699" />)}
  </svg>;
}
