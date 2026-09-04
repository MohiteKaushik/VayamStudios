/**
 * Focal length -> horizontal field of view, so the blocking diagram's camera
 * wedge is actually correct rather than decorative.
 * Assumes Super 35 / full-frame sensor width in mm.
 */
export function fovFromFocalLength(focal: number, sensorWidthMm = 36): number {
  if (!focal || focal <= 0) return 54;
  return (2 * Math.atan(sensorWidthMm / (2 * focal)) * 180) / Math.PI;
}

/** Pulls "35mm" / "35" / "24-70mm" out of a free-text field. */
export function parseFocal(raw: unknown): number | null {
  if (typeof raw !== 'string') return null;
  const m = raw.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}
