export const ROULETTE_DURATION = 7200;
// Linear time, quadratic distance: speed keeps dropping through the final slots.
export const ROULETTE_EASING = "cubic-bezier(.333333,.666667,.666667,1)";

/** The pointer reacts to each actual 45-degree boundary, not a repeating timer. */
export function roulettePointerFrames(from: number, target: number, duration: number): Keyframe[] {
  const distance = target - from;
  const times: number[] = [];
  for (let edge = Math.floor((from - 22.5) / 45) * 45 + 67.5; edge < target; edge += 45) {
    times.push((1 - Math.sqrt(1 - (edge - from) / distance)) * duration);
  }
  const frames: Keyframe[] = [{ offset: 0, transform: "rotate(0deg)" }];
  times.forEach((time, index) => {
    const gap = (times[index + 1] ?? duration) - time;
    const release = Math.min(130, gap * .8);
    for (const [part, angle] of [[0, 0], [.22, -17], [.6, 5], [1, 0]]) {
      frames.push({ offset: (time + release * part) / duration, transform: `rotate(${angle}deg)` });
    }
  });
  frames.push({ offset: 1, transform: "rotate(0deg)" });
  return frames;
}
