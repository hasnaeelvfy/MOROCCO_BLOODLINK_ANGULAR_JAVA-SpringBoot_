export type FrameCallback = (elapsedSeconds: number, deltaSeconds: number) => void;

/**
 * One requestAnimationFrame loop shared by every 3D scene on the page.
 *
 * Running a separate loop per canvas costs a frame callback and a clock per
 * scene, and makes it impossible to pause everything at once. This loop also
 * stops entirely while the tab is hidden so background tabs cost nothing.
 */
const subscribers = new Set<FrameCallback>();

let frameHandle = 0;
let lastTimestamp = 0;
let elapsed = 0;

function frame(timestamp: number): void {
  frameHandle = requestAnimationFrame(frame);

  // Clamp so a long stall (tab switch, GC pause) cannot teleport animations.
  const delta = lastTimestamp === 0 ? 1 / 60 : Math.min((timestamp - lastTimestamp) / 1000, 1 / 20);
  lastTimestamp = timestamp;
  elapsed += delta;

  for (const subscriber of subscribers) subscriber(elapsed, delta);
}

function start(): void {
  if (frameHandle !== 0) return;
  lastTimestamp = 0;
  frameHandle = requestAnimationFrame(frame);
}

function stop(): void {
  if (frameHandle === 0) return;
  cancelAnimationFrame(frameHandle);
  frameHandle = 0;
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (subscribers.size > 0) start();
  });
}

/** Registers a per-frame callback. Returns an unsubscribe function. */
export function onFrame(callback: FrameCallback): () => void {
  subscribers.add(callback);
  if (!document.hidden) start();

  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) stop();
  };
}

/**
 * Shared animation clock in seconds. Scenes use this instead of the raw
 * timestamp so that a scene created later is still phase-aligned with the rest.
 */
export function animationTime(): number {
  return elapsed;
}
