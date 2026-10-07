import * as THREE from 'three';
import { onFrame } from '../../core/render-loop';
import { prefersReducedMotion } from '../../core/motion';
import { beatPhase, R_PEAK_PHASE } from '../../core/rhythm';
import { getViewportTier, onViewportTierChange, type ViewportTier } from '../../core/viewport';
import { createRenderer, fitToElement } from '../renderer';
import { createStudioEnvironment } from '../environment';
import { createAnatomicalHeart } from '../objects/anatomical-heart';
import { createCellField } from '../objects/red-cells';
import { createParticleField } from '../objects/particles';

/**
 * Per-tier composition. Anchors are fractions of the visible frustum at the
 * heart's depth, so the heart lands in the same place on a 16:9 laptop and an
 * ultrawide monitor instead of drifting with aspect ratio.
 */
interface HeroLayout {
  fov: number;
  distance: number;
  /** +x = right, as a fraction of half the visible width. */
  anchorX: number;
  /** +y = up, as a fraction of half the visible height. */
  anchorY: number;
  /** Heart height, vessels included, as a fraction of the visible height. */
  heightRatio: number;
  cellCount: number;
  particleCount: number;
}

const LAYOUTS: Record<ViewportTier, HeroLayout> = {
  desktop: { fov: 32, distance: 11.2, anchorX: 0.52, anchorY: 0.12, heightRatio: 0.46, cellCount: 14, particleCount: 70 },
  tablet: { fov: 36, distance: 11.4, anchorX: 0.42, anchorY: 0.1, heightRatio: 0.42, cellCount: 10, particleCount: 48 },
  mobile: { fov: 40, distance: 10.8, anchorX: 0.0, anchorY: 0.04, heightRatio: 0.62, cellCount: 8, particleCount: 24 }
};

export interface HeroSceneHandle {
  dispose(): void;
  relayout(): void;
}

export function createHeroScene(
  canvas: HTMLCanvasElement,
  options: { onBeat?: () => void; orbitEl?: HTMLElement } = {}
): HeroSceneHandle {
  const reduced = prefersReducedMotion();
  let tier = getViewportTier();
  let layout = LAYOUTS[tier];

  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  scene.environment = createStudioEnvironment(renderer);

  const camera = new THREE.PerspectiveCamera(layout.fov, 1, 0.1, 100);
  camera.position.set(0, 0, layout.distance);

  scene.add(new THREE.HemisphereLight(0xffd0d6, 0x140307, 0.95));

  const keyLight = new THREE.DirectionalLight(0xfff1f3, 2.35);
  keyLight.position.set(-5.2, 6.4, 7.2);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xff6d80, 1.85);
  rimLight.position.set(6.4, 1.8, -5.2);
  scene.add(rimLight);

  const fillLight = new THREE.PointLight(0x7a1428, 36, 22);
  fillLight.position.set(-3.6, -2.4, 3.2);
  scene.add(fillLight);

  const bounceLight = new THREE.PointLight(0xff8a98, 18, 16);
  bounceLight.position.set(1.6, -3.2, 2.4);
  scene.add(bounceLight);

  const heart = createAnatomicalHeart(tier === 'mobile' ? 'low' : 'high');
  scene.add(heart.object);

  const cells = createCellField({
    count: reduced ? Math.round(layout.cellCount / 2) : layout.cellCount,
    bounds: new THREE.Vector3(5, 3.4, 2.2),
    scale: 1.25,
    clearRadius: 2.4,
    driftScale: 0.8
  });
  cells.object.position.set(tier === 'mobile' ? 0 : 2.4, 0.7, 0);
  scene.add(cells.object);

  const particles = createParticleField({
    count: reduced ? Math.round(layout.particleCount / 2) : layout.particleCount,
    spread: 13,
    color: 0xff5f72,
    size: 0.05,
    opacity: 0.42
  });
  scene.add(particles.object);

  let baseY = 0;
  let baseScale = 1;

  /** Places and scales the heart from the frustum actually visible on screen. */
  function applyLayout(): void {
    camera.fov = layout.fov;
    camera.position.z = layout.distance;
    camera.updateProjectionMatrix();

    const visibleHeight = 2 * Math.tan((layout.fov * Math.PI) / 360) * layout.distance;
    const visibleWidth = visibleHeight * camera.aspect;

    // Scale against the drawn height so the aortic arch is framed too, then
    // keep the whole silhouette inside the frustum on narrow viewports where
    // the requested height would otherwise overflow.
    const maxScale = (visibleHeight * 0.94) / heart.visualHeight;
    baseScale = Math.min((visibleHeight * layout.heightRatio) / heart.visualHeight, maxScale);

    const halfHeight = (heart.visualHeight * baseScale) / 2;
    const limit = visibleHeight / 2 - halfHeight;
    baseY = THREE.MathUtils.clamp((visibleHeight / 2) * layout.anchorY, -limit, limit);

    const side = document.documentElement.dir === 'rtl' && tier !== 'mobile' ? -1 : 1;
    heart.object.position.set((visibleWidth / 2) * layout.anchorX * side, baseY, 0);
    heart.object.scale.setScalar(baseScale);
    cells.object.position.set(tier === 'mobile' ? 0 : (visibleWidth / 2) * layout.anchorX * 0.72 * side, baseY * 0.45, 0);
  }

  const stopFit = fitToElement(renderer, camera, canvas, applyLayout);

  const dirObserver = new MutationObserver(() => applyLayout());
  dirObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] });

  const stopTierWatch = onViewportTierChange((next) => {
    tier = next;
    layout = LAYOUTS[next];
    applyLayout();
  });

  let userYaw = 0;
  let userPitch = 0;
  heart.object.rotation.set(0, 0, 0);
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let previousPhase = 0;

  const orbit = options.orbitEl ?? canvas;
  const canOrbit = (): boolean => getViewportTier() !== 'mobile';

  const onPointerDown = (event: PointerEvent) => {
    if (!canOrbit()) return;
    event.preventDefault();
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    orbit.setPointerCapture?.(event.pointerId);
  };
  const onDragMove = (event: PointerEvent) => {
    if (!dragging) return;
    userYaw += (event.clientX - lastX) * 0.012;
    userPitch += (event.clientY - lastY) * 0.01;
    userPitch = Math.max(-0.85, Math.min(0.85, userPitch));
    lastX = event.clientX;
    lastY = event.clientY;
    heart.object.rotation.y = userYaw;
    heart.object.rotation.x = userPitch;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    orbit.releasePointerCapture?.(event.pointerId);
  };

  orbit.addEventListener('pointerdown', onPointerDown);
  orbit.addEventListener('pointermove', onDragMove);
  orbit.addEventListener('pointerup', onPointerUp);
  orbit.addEventListener('pointercancel', onPointerUp);

  function render(elapsed: number): void {
    const phase = beatPhase(elapsed);
    if (previousPhase > phase) previousPhase -= 1;
    if (previousPhase < R_PEAK_PHASE && phase >= R_PEAK_PHASE) options.onBeat?.();
    previousPhase = phase;

    if (!dragging) {
      const idleYaw = userYaw + 0.08 * Math.sin(elapsed * 0.22);
      heart.object.rotation.y += (idleYaw - heart.object.rotation.y) * 0.05;
      heart.object.rotation.x += (userPitch - heart.object.rotation.x) * 0.05;
    }

    heart.update(phase, elapsed);

    // Floating drift keeps the heart from feeling pinned to the layout. Set
    // rather than accumulated, so it oscillates around the anchor instead of
    // random-walking away from it over a long session.
    heart.object.position.y = baseY + Math.sin(elapsed * 0.4) * 0.022 * baseScale;

    keyLight.intensity = 2.2 + heart.contraction * 0.55;
    rimLight.intensity = 1.7 + heart.contraction * 0.45;
    bounceLight.intensity = 16 + heart.contraction * 22;

    cells.update(elapsed);
    particles.update(elapsed, 0);

    renderer.render(scene, camera);
  }

  // Only burn frames while the hero is actually on screen.
  let stopFrames: (() => void) | null = null;
  const visibility = new IntersectionObserver(
    (entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      if (visible && !stopFrames) stopFrames = onFrame(render);
      else if (!visible && stopFrames) {
        stopFrames();
        stopFrames = null;
      }
    },
    { threshold: 0 }
  );
  visibility.observe(canvas);

  return {
    relayout() {
      applyLayout();
    },
    dispose() {
      stopFrames?.();
      visibility.disconnect();
      dirObserver.disconnect();
      stopFit();
      stopTierWatch();
      orbit.removeEventListener('pointerdown', onPointerDown);
      orbit.removeEventListener('pointermove', onDragMove);
      orbit.removeEventListener('pointerup', onPointerUp);
      orbit.removeEventListener('pointercancel', onPointerUp);
      heart.dispose();
      scene.environment?.dispose();
      renderer.dispose();
    }
  };
}
