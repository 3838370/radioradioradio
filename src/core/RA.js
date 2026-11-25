// RA.js: the single global namespace. Every class registers itself as RA.ClassName.
window.RA = window.RA || {};

RA.MathUtil = class MathUtil {
  static clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  static mod(a, n) { return ((a % n) + n) % n; }
  static lerp(a, b, t) { return a + (b - a) * t; }
  static smoothstep(t) { t = MathUtil.clamp(t, 0, 1); return t * t * (3 - 2 * t); }
};
