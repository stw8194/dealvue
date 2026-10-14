/** Dress-room spin timing, shared by the drawn-view turn and the synthesized 3D turn. */

/** Whole turn in milliseconds — lower is faster. The spin itself is the middle 44%. */
export const TURN_DURATION = 620;
/** Hop height as a fraction of the avatar's height (0 spins in place). */
export const TURN_HOP = .03;
/** Longest frame step the turn advances by; dropped frames slow it down rather than skip drawings. */
export const TURN_MAX_STEP = 25;
const windUp = .18, landing = .62, tau = Math.PI * 2;
/** Phase boundaries (fractions of the turn), also used to time the effects. */
export const TURN_PHASES = { windUp, swap: windUp + (landing - windUp) * .5, landing };

const easeOut = (t: number) => 1 - (1 - t) ** 3, easeInOut = (t: number) => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
/**
 * Pose at progress t (0–1): angle in radians, lift as a fraction of height, squash (+ flattens, − stretches).
 * Slow crouch and counter-lean → fast stretched hop-spin → jelly landing that overshoots and springs back.
 */
export function twirl(t: number) {
  if (t < windUp) { const e = easeOut(t / windUp); return { angle: -.3 * e, lift: 0, squash: .14 * e }; }
  if (t < landing) {
    const p = (t - windUp) / (landing - windUp);
    // Spring out of the crouch into a tall stretch, easing back toward normal before touchdown.
    const squash = p < .2 ? .14 + (-.1 - .14) * easeOut(p / .2) : -.1 + .06 * (p - .2) / .8;
    return { angle: -.3 + (tau + .55) * easeInOut(p), lift: TURN_HOP * Math.sin(Math.PI * p), squash };
  }
  const p = (t - landing) / (1 - landing);
  return {
    // Overshoots past the front, then a damped spring brings it back exactly to 0.
    angle: tau + .25 * Math.exp(-5 * p) * Math.cos(2.5 * Math.PI * p),
    lift: 0,
    // Impact squash, a small rebound stretch, then still.
    squash: -.04 * (1 - p) ** 8 + .17 * Math.exp(-4 * p) * Math.sin(3.4 * Math.PI * p),
  };
}
