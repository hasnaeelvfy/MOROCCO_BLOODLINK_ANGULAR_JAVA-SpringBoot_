/**
 * The single source of truth for cardiac timing.
 *
 * The ECG trace, the monitor beep, the 3D heart contraction and the lighting
 * flicker all read from these functions, which is what makes the waveform, the
 * sound and the geometry land on exactly the same instant.
 */

/** ~65 bpm — calm, clinical, and slow enough to read as deliberate. */
export const BEAT_PERIOD_SECONDS = 0.92;

/** Normalised phase (0..1) of the R peak, i.e. where the beep fires. */
export const R_PEAK_PHASE = 0.325;

function gaussian(phase: number, center: number, width: number): number {
  const d = (phase - center) / width;
  return Math.exp(-d * d);
}

/**
 * One ECG cycle in normalised amplitude (roughly -0.3..1).
 * Models the real P-QRS-T morphology rather than a decorative zigzag.
 */
export function ecgSample(phase: number): number {
  const p = phase - Math.floor(phase);

  const pWave = gaussian(p, 0.16, 0.028) * 0.16;
  const qDip = gaussian(p, 0.3, 0.0105) * -0.12;
  const rSpike = gaussian(p, R_PEAK_PHASE, 0.0115) * 1;
  const sDip = gaussian(p, 0.36, 0.015) * -0.3;
  const tWave = gaussian(p, 0.57, 0.052) * 0.28;

  return pWave + qDip + rSpike + sDip + tWave;
}

/**
 * Myocardial contraction envelope (0..1): a strong ventricular squeeze just
 * after the R peak, followed by a softer secondary rebound.
 */
export function contractionEnvelope(phase: number): number {
  const p = phase - Math.floor(phase);
  const systole = gaussian(p, 0.35, 0.055);
  const rebound = gaussian(p, 0.52, 0.085) * 0.5;
  return Math.min(1, systole + rebound);
}

/** Converts elapsed seconds into a normalised beat phase. */
export function beatPhase(seconds: number, period: number = BEAT_PERIOD_SECONDS): number {
  const p = (seconds / period) % 1;
  return p < 0 ? p + 1 : p;
}

/** Monotonically increasing beat index, used to fire one beep per cycle. */
export function beatIndex(seconds: number, period: number = BEAT_PERIOD_SECONDS): number {
  return Math.floor(seconds / period);
}
